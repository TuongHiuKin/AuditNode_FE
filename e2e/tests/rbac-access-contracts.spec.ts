import { expect, test, type APIRequestContext } from '@playwright/test';
import { actor, type E2EActorName } from '../fixtures/actors';

const backend = process.env.E2E_BACKEND_URL ??
  (process.env.E2E_EXTERNAL_STACK === '1' ? 'http://localhost:15000' : 'http://localhost:5000');

type Session = { headers: Record<string, string>; user: { id: string } };
type CatalogPage<T> = { items: T[]; nextCursor: string | null; hasNextPage: boolean };
type Label = { id: string; key: string; value: string; ownerUserId: string; kind: string; isProtected: boolean };
type Grant = {
  id: string;
  granteeUserId: string;
  permission: string;
  expiresAt: string | null;
  revokedAt: string | null;
  version: number;
  sharesAllOwnerResources?: boolean;
  warningCode?: string | null;
};
type Server = {
  id: string;
  datacenterId: string;
  ipAddress: string;
  hostname: string;
  osType: string;
  environment: string;
  status: string;
  labels: Array<{ key: string; value: string }>;
  ownerUserId: string;
  effectivePermission: string;
};

async function login(api: APIRequestContext, name: E2EActorName): Promise<Session> {
  const response = await api.post(`${backend}/api/v1/auth/login`, { data: actor(name) });
  expect(response.ok(), `${name} login`).toBeTruthy();
  const { accessToken } = await response.json() as { accessToken: string };
  const headers = { authorization: `Bearer ${accessToken}` };
  const me = await api.get(`${backend}/api/v1/auth/me`, { headers });
  expect(me.ok(), `${name} identity`).toBeTruthy();
  return { headers, user: await me.json() as { id: string } };
}

async function page<T>(api: APIRequestContext, path: string, session: Session) {
  const response = await api.get(`${backend}${path}`, { headers: session.headers });
  expect(response.ok(), `GET ${path}`).toBeTruthy();
  return response.json() as Promise<CatalogPage<T>>;
}

function updatePayload(server: Server, overrides: Partial<Server> = {}) {
  return {
    ipAddress: overrides.ipAddress ?? server.ipAddress,
    hostname: overrides.hostname ?? server.hostname,
    osType: overrides.osType ?? server.osType,
    environment: overrides.environment ?? server.environment,
    status: overrides.status ?? server.status,
    datacenterId: overrides.datacenterId ?? server.datacenterId,
    ...(overrides.labels === undefined ? {} : { labels: overrides.labels }),
  };
}

test.describe.serial('Global Catalog authorization contracts', () => {
  let owner: Session;
  let editor: Session;
  let viewer: Session;
  let systemAdmin: Session;
  let secondOwner: Session;
  let managedUser: Session;
  let sharedServer: Server;
  let privateServer: Server;
  let sharedLabel: Label;

  test.beforeAll(async ({ request }) => {
    [owner, editor, viewer, systemAdmin, secondOwner, managedUser] = await Promise.all([
      login(request, 'owner'),
      login(request, 'editor'),
      login(request, 'viewer'),
      login(request, 'systemAdmin'),
      login(request, 'secondOwner'),
      login(request, 'managedUser'),
    ]);
    const ownerServers = await page<Server>(request, '/api/v1/servers?view=mine&limit=100', owner);
    sharedServer = ownerServers.items.find(item => item.hostname === 'e2e-shared-primary')!;
    privateServer = ownerServers.items.find(item => item.hostname === 'e2e-private')!;
    expect(sharedServer, 'shared fixture server').toBeDefined();
    expect(privateServer, 'private fixture server').toBeDefined();
    const ownerLabels = await page<Label>(request, '/api/v1/labels?view=mine&limit=100&labelKey=scope&labelValue=shared', owner);
    sharedLabel = ownerLabels.items.find(item => item.ownerUserId === owner.user.id && item.key === 'scope' && item.value === 'shared')!;
    expect(sharedLabel, 'shared fixture label').toBeDefined();
  });

  test('Mine and Shared stay isolated and SystemAdmin is not a catalog superuser', async ({ request }) => {
    const [ownerMine, viewerMine, viewerShared, systemAdminShared, adminUsers] = await Promise.all([
      page<Server>(request, '/api/v1/servers?view=mine&limit=100', owner),
      page<Server>(request, '/api/v1/servers?view=mine&limit=100', viewer),
      page<Server>(request, '/api/v1/servers?view=shared&limit=100', viewer),
      page<Server>(request, '/api/v1/servers?view=shared&limit=100', systemAdmin),
      request.get(`${backend}/api/v1/admin/users`, { headers: systemAdmin.headers }),
    ]);

    expect(ownerMine.items.map(item => item.id)).toEqual(expect.arrayContaining([sharedServer.id, privateServer.id]));
    expect(viewerMine.items.some(item => item.ownerUserId === owner.user.id)).toBe(false);
    expect(viewerShared.items.some(item => item.id === sharedServer.id)).toBe(true);
    expect(viewerShared.items.some(item => item.id === privateServer.id)).toBe(false);
    expect(systemAdminShared.items.some(item => item.ownerUserId === owner.user.id)).toBe(false);
    expect((await request.get(`${backend}/api/v1/servers/${sharedServer.id}`, { headers: systemAdmin.headers })).status()).toBe(404);
    expect(adminUsers.status()).toBe(200);
  });

  test('same-named labels remain owner-specific', async ({ request }) => {
    const [firstLabels, secondLabels] = await Promise.all([
      page<Label>(request, '/api/v1/labels?view=mine&limit=100&labelKey=scope&labelValue=shared', owner),
      page<Label>(request, '/api/v1/labels?view=mine&limit=100&labelKey=scope&labelValue=shared', secondOwner),
    ]);
    const first = firstLabels.items.find(item => item.ownerUserId === owner.user.id)!;
    const second = secondLabels.items.find(item => item.ownerUserId === secondOwner.user.id)!;
    expect(first.id).not.toBe(second.id);
    expect([first.key, first.value]).toEqual([second.key, second.value]);
  });

  test('authorization is applied before cursor pagination and pages do not duplicate resources', async ({ request }) => {
    const first = await page<Server>(request, '/api/v1/servers?view=shared&limit=1', viewer);
    expect(first.items).toHaveLength(1);
    expect(first.items[0].ownerUserId).toBe(owner.user.id);
    expect(first.hasNextPage).toBe(true);
    expect(first.nextCursor).toBeTruthy();

    const next = await page<Server>(request, `/api/v1/servers?view=shared&limit=1&cursor=${encodeURIComponent(first.nextCursor!)}`, viewer);
    expect(next.items).toHaveLength(1);
    expect(next.items[0].ownerUserId).toBe(owner.user.id);
    expect(next.items[0].id).not.toBe(first.items[0].id);
  });

  test('Editor can edit a shared resource but cannot mutate labels; Viewer cannot write', async ({ request }) => {
    const detail = await request.get(`${backend}/api/v1/servers/${sharedServer.id}`, { headers: editor.headers });
    expect(detail.status()).toBe(200);
    const current = await detail.json() as Server;
    const temporaryStatus = current.status === 'Maintenance' ? 'Online' : 'Maintenance';

    try {
      const edit = await request.put(`${backend}/api/v1/servers/${current.id}`, {
        headers: editor.headers,
        data: updatePayload(current, { status: temporaryStatus }),
      });
      expect(edit.status()).toBe(204);
      const changed = await request.get(`${backend}/api/v1/servers/${current.id}`, { headers: editor.headers });
      expect((await changed.json() as Server).status).toBe(temporaryStatus);

      const relabel = await request.put(`${backend}/api/v1/servers/${current.id}`, {
        headers: editor.headers,
        data: updatePayload(current, { labels: current.labels }),
      });
      expect(relabel.status()).toBe(403);

      const viewerWrite = await request.put(`${backend}/api/v1/servers/${current.id}`, {
        headers: viewer.headers,
        data: updatePayload(current, { status: temporaryStatus }),
      });
      expect(viewerWrite.status()).toBe(403);
    } finally {
      const restore = await request.put(`${backend}/api/v1/servers/${current.id}`, {
        headers: editor.headers,
        data: updatePayload(current),
      });
      expect(restore.status()).toBe(204);
    }
  });

  test('real topology full-save is owner-only and an Editor loses command access immediately after revoke', async ({ request }) => {
    const ownerStateResponse = await request.get(`${backend}/api/v1/topology/state`, { headers: owner.headers });
    expect(ownerStateResponse.status()).toBe(200);
    const ownerState = await ownerStateResponse.json() as { version: number; nodes: unknown[]; edges: unknown[] };
    expect(ownerState.nodes).toEqual([]);
    expect(ownerState.edges).toEqual([]);

    const nodeId = crypto.randomUUID();
    const save = await request.put(`${backend}/api/v1/topology/state`, {
      headers: owner.headers,
      data: {
        version: ownerState.version,
        nodes: [{ id: nodeId, nodeType: 'server', label: sharedServer.hostname, x: 10, y: 20, referenceId: sharedServer.id }],
        edges: [],
        dependencies: [],
      },
    });
    expect(save.status()).toBe(204);

    const grantPath = `/api/v1/labels/${sharedLabel.id}/grants`;
    const grantsResponse = await request.get(`${backend}${grantPath}`, { headers: owner.headers });
    expect(grantsResponse.status()).toBe(200);
    const editorGrant = (await grantsResponse.json() as Grant[])
      .find(item => item.granteeUserId === editor.user.id && item.revokedAt === null)!;
    expect(editorGrant.permission).toBe('editor');
    let grantRevoked = false;

    try {
      const foreignStateResponse = await request.get(`${backend}/api/v1/topology/state`, { headers: secondOwner.headers });
      expect(foreignStateResponse.status()).toBe(200);
      const foreignState = await foreignStateResponse.json() as { version: number };
      const crossOwnerSave = await request.put(`${backend}/api/v1/topology/state`, {
        headers: secondOwner.headers,
        data: {
          version: foreignState.version,
          nodes: [{ id: nodeId, nodeType: 'group', label: 'foreign-reuse', x: 0, y: 0 }],
          edges: [],
          dependencies: [],
        },
      });
      expect(crossOwnerSave.status()).toBe(403);

      const sharedStateResponse = await request.get(
        `${backend}/api/v1/topology/state?ownerUserId=${encodeURIComponent(owner.user.id)}`,
        { headers: editor.headers },
      );
      expect(sharedStateResponse.status()).toBe(200);
      const sharedState = await sharedStateResponse.json() as { version: number; nodes: Array<{ id: string }> };
      expect(sharedState.nodes.some(item => item.id === nodeId)).toBe(true);

      const move = await request.post(`${backend}/api/v1/topology/commands`, {
        headers: editor.headers,
        data: { version: sharedState.version, operations: [{ type: 'moveNode', nodeId, x: 30, y: 40 }] },
      });
      expect(move.status()).toBe(200);
      const movedVersion = (await move.json() as { version: number }).version;

      const revoke = await request.delete(
        `${backend}${grantPath}/${editorGrant.id}?version=${editorGrant.version}`,
        { headers: owner.headers },
      );
      expect(revoke.status()).toBe(204);
      grantRevoked = true;

      const deniedMove = await request.post(`${backend}/api/v1/topology/commands`, {
        headers: editor.headers,
        data: { version: movedVersion, operations: [{ type: 'moveNode', nodeId, x: 50, y: 60 }] },
      });
      expect(deniedMove.status()).toBe(403);
    } finally {
      if (grantRevoked) {
        const restoreGrant = await request.post(`${backend}${grantPath}`, {
          headers: owner.headers,
          data: { granteeUserId: editor.user.id, permission: 'editor', expiresAt: null },
        });
        expect(restoreGrant.status()).toBe(201);
      }

      const latestStateResponse = await request.get(`${backend}/api/v1/topology/state`, { headers: owner.headers });
      expect(latestStateResponse.status()).toBe(200);
      const latestState = await latestStateResponse.json() as { version: number };
      const cleanup = await request.put(`${backend}/api/v1/topology/state`, {
        headers: owner.headers,
        data: { version: latestState.version, nodes: [], edges: [], dependencies: [] },
      });
      expect(cleanup.status()).toBe(204);
    }
  });

  test('protected Owner Label is runtime-created and a confirmed grant shares the complete owner catalog', async ({ request }) => {
    const labels = await page<Label>(request, '/api/v1/labels?view=mine&limit=100', owner);
    const ownerLabel = labels.items.find(item => item.kind === 'owner');
    expect(ownerLabel).toBeDefined();
    expect(ownerLabel!.isProtected).toBe(true);
    expect(ownerLabel!.ownerUserId).toBe(owner.user.id);

    const grantPath = `/api/v1/labels/${ownerLabel!.id}/grants`;
    const createdResponse = await request.post(`${backend}${grantPath}`, {
      headers: owner.headers,
      data: { granteeUserId: managedUser.user.id, permission: 'viewer', expiresAt: null },
    });
    expect(createdResponse.status()).toBe(201);
    const created = await createdResponse.json() as Grant;
    expect(created.sharesAllOwnerResources).toBe(true);
    expect(created.warningCode).toBe('owner_label_shares_all_owner_resources');

    try {
      const shared = await page<Server>(request, '/api/v1/servers?view=shared&limit=100', managedUser);
      expect(shared.items.map(item => item.id)).toEqual(expect.arrayContaining([sharedServer.id, privateServer.id]));
      expect(shared.items.filter(item => item.ownerUserId === owner.user.id)).toHaveLength(3);
    } finally {
      const revoke = await request.delete(
        `${backend}${grantPath}/${created.id}?version=${created.version}`,
        { headers: owner.headers },
      );
      expect(revoke.status()).toBe(204);
    }
  });

  test('grant upgrade and revoke take effect immediately, then the fixture is restored', async ({ request }) => {
    const path = `/api/v1/labels/${sharedLabel.id}/grants`;
    const listed = await request.get(`${backend}${path}`, { headers: owner.headers });
    expect(listed.status()).toBe(200);
    const active = (await listed.json() as Grant[]).find(item => item.granteeUserId === viewer.user.id && item.revokedAt === null)!;
    expect(active.permission).toBe('viewer');

    try {
      const upgrade = await request.put(`${backend}${path}/${active.id}`, {
        headers: owner.headers,
        data: { permission: 'editor', expiresAt: null, version: active.version },
      });
      expect(upgrade.status()).toBe(200);
      const upgraded = await upgrade.json() as Grant;
      const shared = await page<Server>(request, '/api/v1/servers?view=shared&limit=100', viewer);
      expect(shared.items.find(item => item.id === sharedServer.id)?.effectivePermission).toBe('editor');

      const revoke = await request.delete(`${backend}${path}/${upgraded.id}?version=${upgraded.version}`, { headers: owner.headers });
      expect(revoke.status()).toBe(204);
      expect((await request.get(`${backend}/api/v1/servers/${sharedServer.id}`, { headers: viewer.headers })).status()).toBe(404);
      const denied = await page<Server>(request, '/api/v1/servers?view=shared&limit=100', viewer);
      expect(denied.items.some(item => item.ownerUserId === owner.user.id)).toBe(false);
    } finally {
      const latest = await request.get(`${backend}${path}`, { headers: owner.headers });
      expect(latest.status()).toBe(200);
      const current = (await latest.json() as Grant[]).find(item => item.granteeUserId === viewer.user.id && item.revokedAt === null);
      if (!current) {
        const restore = await request.post(`${backend}${path}`, {
          headers: owner.headers,
          data: { granteeUserId: viewer.user.id, permission: 'viewer', expiresAt: null },
        });
        expect(restore.status()).toBe(201);
      } else if (current.permission !== 'viewer' || current.expiresAt !== null) {
        const restore = await request.put(`${backend}${path}/${current.id}`, {
          headers: owner.headers,
          data: { permission: 'viewer', expiresAt: null, version: current.version },
        });
        expect(restore.status()).toBe(200);
      }
    }
  });

  test('anonymous Viewer link browses only its label and becomes unavailable after revoke', async ({ request }) => {
    const linksPath = `/api/v1/labels/${sharedLabel.id}/share-links`;
    const createdResponse = await request.post(`${backend}${linksPath}`, {
      headers: owner.headers,
      data: { expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() },
    });
    expect(createdResponse.status()).toBe(201);
    const created = await createdResponse.json() as { grantId: string; token: string; version: number };
    expect(created.token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    let revoked = false;
    try {
      const resolution = await request.post(`${backend}/api/v1/share-links/resolve`, { data: { token: created.token } });
      expect(resolution.status()).toBe(200);
      expect((await resolution.json() as { permission: string }).permission).toBe('viewer');

      const browse = await request.post(`${backend}/api/v1/share-links/browse`, {
        data: { token: created.token, resourceType: 'servers', limit: 100 },
      });
      expect(browse.status()).toBe(200);
      const anonymousPage = await browse.json() as CatalogPage<{ server: Server }>;
      expect(anonymousPage.items.some(item => item.server.id === sharedServer.id)).toBe(true);
      expect(anonymousPage.items.some(item => item.server.id === privateServer.id)).toBe(false);

      const metadata = await request.get(`${backend}${linksPath}`, { headers: owner.headers });
      expect(metadata.status()).toBe(200);
      expect(JSON.stringify(await metadata.json())).not.toContain(created.token);
      expect((await request.put(`${backend}/api/v1/servers/${sharedServer.id}`, { data: updatePayload(sharedServer) })).status()).toBe(401);

      const revoke = await request.delete(`${backend}${linksPath}/${created.grantId}?version=${created.version}`, { headers: owner.headers });
      expect(revoke.status()).toBe(204);
      revoked = true;
      expect((await request.post(`${backend}/api/v1/share-links/resolve`, { data: { token: created.token } })).status()).toBe(404);
    } finally {
      if (!revoked) {
        const revoke = await request.delete(`${backend}${linksPath}/${created.grantId}?version=${created.version}`, { headers: owner.headers });
        expect([204, 404, 409]).toContain(revoke.status());
      }
    }
  });

  test('anonymous Viewer link fails closed after expiry', async ({ request }) => {
    const linksPath = `/api/v1/labels/${sharedLabel.id}/share-links`;
    const createdResponse = await request.post(`${backend}${linksPath}`, {
      headers: owner.headers,
      data: { expiresAt: new Date(Date.now() + 3_000).toISOString() },
    });
    expect(createdResponse.status()).toBe(201);
    const created = await createdResponse.json() as { token: string };

    expect((await request.post(`${backend}/api/v1/share-links/resolve`, { data: { token: created.token } })).status()).toBe(200);
    await expect.poll(
      async () => (await request.post(`${backend}/api/v1/share-links/resolve`, { data: { token: created.token } })).status(),
      { timeout: 8_000, intervals: [500, 500, 1_000] },
    ).toBe(404);
  });
});
