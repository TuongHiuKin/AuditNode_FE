import { expect, test, type APIRequestContext } from '@playwright/test';
import { actor, type E2EActorName } from '../fixtures/actors';

const backend = process.env.E2E_BACKEND_URL ?? (process.env.E2E_EXTERNAL_STACK === '1' ? 'http://localhost:15000' : 'http://localhost:5000');
const backendPeer = process.env.E2E_BACKEND_PEER_URL ?? (process.env.E2E_EXTERNAL_STACK === '1' ? 'http://localhost:15001' : backend);

async function session(api: APIRequestContext, name: E2EActorName) {
  const credentials = actor(name);
  const login = await api.post(`${backend}/api/v1/auth/login`, { data: credentials });
  expect(login.ok(), `${name} login`).toBeTruthy();
  const { accessToken } = await login.json() as { accessToken: string };
  const headers = { authorization: `Bearer ${accessToken}` };
  const me = await api.get(`${backend}/api/v1/auth/me`, { headers });
  expect(me.ok(), `${name} identity`).toBeTruthy();
  return { headers, user: await me.json() as { id: string } };
}

type ActorSession = Awaited<ReturnType<typeof session>>;

async function ownerWorkspace(api: APIRequestContext, headers: Record<string, string>) {
  const response = await api.get(`${backend}/api/v1/workspaces`, { headers });
  expect(response.ok()).toBeTruthy();
  const workspaces = await response.json() as Array<{ id: string; relationship: string }>;
  const workspace = workspaces.find(item => item.relationship === 'owner');
  expect(workspace).toBeDefined();
  return workspace!.id;
}

function workspaceHeaders(headers: Record<string, string>, workspaceId: string) {
  return { ...headers, 'x-workspace-id': workspaceId };
}

test.describe.serial('RBAC application API fixtures', () => {
  const sessions = new Map<E2EActorName, ActorSession>();

  test.beforeAll(async ({ request }) => {
    for (const name of ['owner', 'systemAdmin', 'workspaceAdmin', 'labelAuditor', 'frameAuditor', 'viewer'] as const) {
      sessions.set(name, await session(request, name));
    }
  });

  const actorSession = (name: E2EActorName) => {
    const value = sessions.get(name);
    if (!value) throw new Error(`Missing cached E2E session for ${name}.`);
    return value;
  };

  test('private workspace denies a non-member SystemAdmin', async ({ request }) => {
    const owner = actorSession('owner');
    const systemAdmin = actorSession('systemAdmin');
    const workspaceId = await ownerWorkspace(request, owner.headers);
    const response = await request.get(`${backend}/api/v1/servers`, { headers: workspaceHeaders(systemAdmin.headers, workspaceId) });
    expect(response.status()).toBe(403);
  });

  test('share candidate discovery is private, bounded, and manager-only', async ({ request }) => {
    const owner = actorSession('owner');
    const workspaceAdmin = actorSession('workspaceAdmin');
    const labelAuditor = actorSession('labelAuditor');
    const workspaceId = await ownerWorkspace(request, owner.headers);

    const empty = await request.get(`${backend}/api/v1/workspaces/${workspaceId}/share-options`, { headers: owner.headers });
    expect(empty.ok()).toBeTruthy();
    expect((await empty.json() as { users: unknown[] }).users).toEqual([]);

    const short = await request.get(`${backend}/api/v1/workspaces/${workspaceId}/share-options?search=ab`, { headers: owner.headers });
    expect(short.status()).toBe(400);
    const oversizedPage = await request.get(`${backend}/api/v1/workspaces/${workspaceId}/share-options?search=owner&max=21`, { headers: owner.headers });
    expect(oversizedPage.status()).toBe(400);

    const denied = await request.get(`${backend}/api/v1/workspaces/${workspaceId}/share-options?search=owner`, { headers: labelAuditor.headers });
    expect(denied.status()).toBe(403);

    const allowed = await request.get(`${backend}/api/v1/workspaces/${workspaceId}/share-options?search=owner`, { headers: workspaceAdmin.headers });
    expect(allowed.ok()).toBeTruthy();
    expect((await allowed.json() as { users: Array<{ username: string }> }).users.length).toBeLessThanOrEqual(20);
  });

  test('share candidate discovery enforces its per-actor request budget', async ({ request }) => {
    const rateLimitActor = actorSession('systemAdmin');
    const owner = actorSession('owner');
    const workspaceId = await ownerWorkspace(request, owner.headers);

    const responses = await Promise.all(Array.from({ length: 35 }, () =>
      request.get(`${backend}/api/v1/workspaces/${workspaceId}/share-options?search=ab`, { headers: rateLimitActor.headers })));

    expect(responses.map((response) => response.status())).toContain(429);
  });

  test('label and frame scopes project only their fixture resources', async ({ request }) => {
    const owner = actorSession('owner');
    const workspaceId = await ownerWorkspace(request, owner.headers);
    const labelAuditor = actorSession('labelAuditor');
    const labelServers = await request.get(`${backend}/api/v1/servers`, { headers: workspaceHeaders(labelAuditor.headers, workspaceId) });
    expect(labelServers.ok()).toBeTruthy();
    const labelHostnames = (await labelServers.json() as Array<{ hostname: string }>).map(item => item.hostname);
    expect(labelHostnames).toContain('e2e-production');
    expect(labelHostnames).not.toContain('e2e-staging');

    const frameAuditor = actorSession('frameAuditor');
    const frameServers = await request.get(`${backend}/api/v1/servers`, { headers: workspaceHeaders(frameAuditor.headers, workspaceId) });
    expect(frameServers.ok()).toBeTruthy();
    const frameHostnames = (await frameServers.json() as Array<{ hostname: string }>).map(item => item.hostname);
    expect(frameHostnames).toContain('e2e-staging');
    expect(frameHostnames).not.toContain('e2e-production');
  });

  test('label-scoped Viewer receives a restricted dependency projection', async ({ request }) => {
    const owner = actorSession('owner');
    const viewer = actorSession('viewer');
    const workspaceId = await ownerWorkspace(request, owner.headers);
    const response = await request.get(`${backend}/api/v1/topology/map`, { headers: workspaceHeaders(viewer.headers, workspaceId) });
    expect(response.ok()).toBeTruthy();
    const map = await response.json() as { servers: Array<{ hostname: string }>; restrictedNodes: Array<{ isRestricted: boolean }> };
    expect(map.servers.map(item => item.hostname)).toContain('e2e-production');
    expect(map.servers.map(item => item.hostname)).not.toContain('e2e-staging');
    expect(map.restrictedNodes.length).toBeGreaterThan(0);
    expect(map.restrictedNodes.every(item => item.isRestricted)).toBeTruthy();
  });

  test('revoke takes effect immediately and fixture access can be restored', async ({ request }) => {
    const owner = actorSession('owner');
    const viewer = actorSession('viewer');
    const workspaceId = await ownerWorkspace(request, owner.headers);
    const sharesResponse = await request.get(`${backend}/api/v1/workspaces/${workspaceId}/shares`, { headers: owner.headers });
    const shares = await sharesResponse.json() as Array<{ userId: string; role: string; scopeMode: string; targetIds: string[]; version: number }>;
    const share = shares.find(item => item.userId === viewer.user.id)!;
    expect(share).toBeDefined();
    const revoke = await request.delete(`${backend}/api/v1/workspaces/${workspaceId}/shares/${viewer.user.id}?version=${share.version}`, { headers: owner.headers });
    expect(revoke.status()).toBe(204);
    try {
      const denied = await request.get(`${backend}/api/v1/servers`, { headers: workspaceHeaders(viewer.headers, workspaceId) });
      expect(denied.status()).toBe(403);
    } finally {
      const restore = await request.post(`${backend}/api/v1/workspaces/${workspaceId}/shares`, {
        headers: owner.headers, data: { userId: share.userId, role: share.role, scopeMode: share.scopeMode, targetIds: share.targetIds },
      });
      expect(restore.status()).toBe(201);
    }
  });

  test('SystemAdmin can list identities but cannot revoke the final SystemAdmin role', async ({ request }) => {
    const systemAdmin = actorSession('systemAdmin');
    const list = await request.get(`${backend}/api/v1/admin/users?first=0&max=20`, { headers: systemAdmin.headers });
    expect(list.ok()).toBeTruthy();
    const users = await list.json() as Array<{ id: string; username: string; enabled: boolean }>;
    const managedCredentials = actor('workspaceAdmin');
    const managedUser = users.find(item => item.username === managedCredentials.username)!;
    expect(managedUser).toBeDefined();

    const duplicateCreate = await request.post(`${backend}/api/v1/admin/users`, {
      headers: systemAdmin.headers,
      data: { username: managedCredentials.username, email: 'existing-e2e-workspace-admin@example.invalid', password: managedCredentials.password },
    });
    expect(duplicateCreate.status()).toBe(409);

    const disable = await request.put(`${backend}/api/v1/admin/users/${managedUser.id}/status`, {
      headers: systemAdmin.headers, data: { enabled: false },
    });
    expect(disable.status()).toBe(204);
    try {
      const afterDisable = await request.get(`${backend}/api/v1/admin/users?search=${encodeURIComponent(managedCredentials.username)}&first=0&max=20`, { headers: systemAdmin.headers });
      const disabledUsers = await afterDisable.json() as Array<{ id: string; enabled: boolean }>;
      expect(disabledUsers.find(item => item.id === managedUser.id)?.enabled).toBe(false);
    } finally {
      const enable = await request.put(`${backend}/api/v1/admin/users/${managedUser.id}/status`, {
        headers: systemAdmin.headers, data: { enabled: true },
      });
      expect(enable.status()).toBe(204);
    }

    const revoke = await request.put(`${backend}/api/v1/admin/users/${systemAdmin.user.id}/roles`, {
      headers: systemAdmin.headers, data: { systemAdmin: false },
    });
    expect(revoke.status()).toBe(409);
  });

  test('two backend processes cannot concurrently remove both enabled SystemAdmins', async ({ request }) => {
    const systemAdmin = actorSession('systemAdmin');
    const workspaceAdmin = actorSession('workspaceAdmin');
    const prepare = async () => {
      const restoreFirst = await request.put(`${backend}/api/v1/admin/users/${systemAdmin.user.id}/roles`, {
        headers: systemAdmin.headers, data: { systemAdmin: true },
      });
      expect(restoreFirst.status()).toBe(204);
      const enableSecond = await request.put(`${backend}/api/v1/admin/users/${workspaceAdmin.user.id}/status`, {
        headers: systemAdmin.headers, data: { enabled: true },
      });
      expect(enableSecond.status()).toBe(204);
      const grantSecond = await request.put(`${backend}/api/v1/admin/users/${workspaceAdmin.user.id}/roles`, {
        headers: systemAdmin.headers, data: { systemAdmin: true },
      });
      expect(grantSecond.status()).toBe(204);
    };
    const cleanup = async () => {
      let restoreFirstStatus: number | undefined;
      let enableSecondStatus: number | undefined;
      let revokeSecondStatus: number | undefined;
      try {
        restoreFirstStatus = (await request.put(`${backend}/api/v1/admin/users/${systemAdmin.user.id}/roles`, {
          headers: systemAdmin.headers, data: { systemAdmin: true },
        })).status();
      } finally {
        try {
          enableSecondStatus = (await request.put(`${backend}/api/v1/admin/users/${workspaceAdmin.user.id}/status`, {
            headers: systemAdmin.headers, data: { enabled: true },
          })).status();
        } finally {
          if (restoreFirstStatus === 204) {
            revokeSecondStatus = (await request.put(`${backend}/api/v1/admin/users/${workspaceAdmin.user.id}/roles`, {
              headers: systemAdmin.headers, data: { systemAdmin: false },
            })).status();
          }
        }
      }
      expect(restoreFirstStatus).toBe(204);
      expect(enableSecondStatus).toBe(204);
      expect(revokeSecondStatus).toBe(204);
    };

    try {
      await prepare();
      const [revokeFirst, disableSecond] = await Promise.all([
        request.put(`${backend}/api/v1/admin/users/${systemAdmin.user.id}/roles`, {
          headers: systemAdmin.headers, data: { systemAdmin: false },
        }),
        request.put(`${backendPeer}/api/v1/admin/users/${workspaceAdmin.user.id}/status`, {
          headers: systemAdmin.headers, data: { enabled: false },
        }),
      ]);
      expect([revokeFirst.status(), disableSecond.status()].sort()).toEqual([204, 409]);
    } finally {
      await cleanup();
    }

    try {
      await prepare();
      const revocations = await Promise.all([
        request.put(`${backend}/api/v1/admin/users/${systemAdmin.user.id}/roles`, {
          headers: systemAdmin.headers, data: { systemAdmin: false },
        }),
        request.put(`${backendPeer}/api/v1/admin/users/${workspaceAdmin.user.id}/roles`, {
          headers: systemAdmin.headers, data: { systemAdmin: false },
        }),
      ]);
      expect(revocations.map(response => response.status()).sort()).toEqual([204, 409]);
    } finally {
      await cleanup();
    }
  });
});
