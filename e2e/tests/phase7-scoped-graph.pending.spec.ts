import { expect, test, type APIRequestContext } from '@playwright/test';
import { actor, type E2EActorName } from '../fixtures/actors';

const backend = process.env.E2E_BACKEND_URL ??
  (process.env.E2E_EXTERNAL_STACK === '1' ? 'http://localhost:15000' : 'http://localhost:5000');

async function session(api: APIRequestContext, name: E2EActorName) {
  const login = await api.post(`${backend}/api/v1/auth/login`, { data: actor(name) });
  expect(login.ok(), `${name} login`).toBeTruthy();
  const { accessToken } = await login.json() as { accessToken: string };
  return { authorization: `Bearer ${accessToken}` };
}

async function ownerWorkspace(api: APIRequestContext, headers: Record<string, string>) {
  const response = await api.get(`${backend}/api/v1/workspaces`, { headers });
  expect(response.ok()).toBeTruthy();
  const workspaces = await response.json() as Array<{ id: string; relationship: string }>;
  return workspaces.find(item => item.relationship === 'owner')!.id;
}

test.describe.serial('Phase 7 scoped graph commands', () => {
  let ownerHeaders: Record<string, string>;
  let auditorHeaders: Record<string, string>;
  let workspaceId: string;

  test.beforeAll(async ({ request }) => {
    ownerHeaders = await session(request, 'owner');
    auditorHeaders = await session(request, 'frameAuditor');
    workspaceId = await ownerWorkspace(request, ownerHeaders);
  });

  test('Frame Auditor mutates geometry through commands and cannot call replace-all', async ({ request }) => {
    const headers = { ...auditorHeaders, 'x-workspace-id': workspaceId };
    const stateResponse = await request.get(`${backend}/api/v1/topology/state`, { headers });
    expect(stateResponse.ok()).toBeTruthy();
    const state = await stateResponse.json() as {
      version: number;
      nodes: Array<{ id: string; nodeType: string; parentNodeId?: string; x: number; y: number }>;
      edges: unknown[];
    };
    const workload = state.nodes.find(node => node.nodeType === 'application')!;
    expect(workload).toBeDefined();

    const command = await request.post(`${backend}/api/v1/topology/commands`, {
      headers,
      data: {
        version: state.version,
        operations: [{
          type: 'moveNode', nodeId: workload.id, parentId: workload.parentNodeId,
          x: workload.x + 7, y: workload.y + 9,
        }],
      },
    });
    expect(command.status()).toBe(200);
    const { version } = await command.json() as { version: number };
    expect(version).toBe(state.version + 1);

    const replaceAll = await request.put(`${backend}/api/v1/topology/state`, {
      headers,
      data: { version, nodes: state.nodes, edges: state.edges, dependencies: [] },
    });
    expect(replaceAll.status()).toBe(403);
  });

  test('Scoped commands reject stale revisions and unknown or outside endpoints', async ({ request }) => {
    const headers = { ...auditorHeaders, 'x-workspace-id': workspaceId };
    const state = await (await request.get(`${backend}/api/v1/topology/state`, { headers })).json() as {
      version: number;
      nodes: Array<{ id: string; nodeType: string }>;
    };
    const workload = state.nodes.find(node => node.nodeType === 'application')!;

    const stale = await request.post(`${backend}/api/v1/topology/commands`, {
      headers,
      data: {
        version: Math.max(0, state.version - 1),
        operations: [{ type: 'moveNode', nodeId: workload.id, x: 1, y: 1 }],
      },
    });
    expect(stale.status()).toBe(409);

    const outside = await request.post(`${backend}/api/v1/topology/commands`, {
      headers,
      data: {
        version: state.version,
        operations: [{
          type: 'createEdge', edgeId: crypto.randomUUID(),
          sourceNodeId: workload.id, targetNodeId: crypto.randomUUID(),
        }],
      },
    });
    expect(outside.status()).toBe(403);
  });
});
