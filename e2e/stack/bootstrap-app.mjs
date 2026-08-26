const base = process.env.E2E_BACKEND_INTERNAL_URL;
const required = name => process.env[name] || (() => { throw new Error(`Missing ${name}`); })();
const frameId = '10000000-0000-0000-0000-000000000001';
const frameServerNodeId = '10000000-0000-0000-0000-000000000002';
const frameAppNodeId = '10000000-0000-0000-0000-000000000003';

async function call(path, { token, workspaceId, method = 'GET', body, expected = [200] } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (workspaceId) headers['x-workspace-id'] = workspaceId;
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!expected.includes(response.status)) throw new Error(`${method} ${path} returned ${response.status}: ${await response.text()}`);
  if (response.status === 204) return undefined;
  return response.json();
}

async function session(prefix) {
  const username = required(`E2E_${prefix}_USERNAME`);
  const password = required(`E2E_${prefix}_PASSWORD`);
  const login = await call('/api/v1/auth/login', { method: 'POST', body: { username, password } });
  const me = await call('/api/v1/auth/me', { token: login.accessToken });
  const workspaces = await call('/api/v1/workspaces', { token: login.accessToken });
  return { token: login.accessToken, userId: me.id, workspaces };
}

const sessions = {};
for (const prefix of ['SYSTEM_ADMIN', 'OWNER', 'WORKSPACE_ADMIN', 'LABEL_AUDITOR', 'FRAME_AUDITOR', 'VIEWER']) sessions[prefix] = await session(prefix);
const owner = sessions.OWNER;
const workspace = owner.workspaces.find(item => item.relationship === 'owner');
if (!workspace) throw new Error('Owner personal workspace was not bootstrapped.');
const workspaceId = workspace.id;

let datacenters = await call('/api/v1/datacenters', { token: owner.token, workspaceId });
let datacenter = datacenters.find(item => item.name === 'E2E Datacenter');
if (!datacenter) datacenter = await call('/api/v1/datacenters', { token: owner.token, workspaceId, method: 'POST', body: { name: 'E2E Datacenter', location: 'E2E' } });

let servers = await call('/api/v1/servers', { token: owner.token, workspaceId });
async function ensureServer(hostname, ipAddress, labelValue) {
  let server = servers.find(item => item.hostname === hostname);
  if (!server) server = await call('/api/v1/servers', { token: owner.token, workspaceId, method: 'POST', expected: [201], body: {
    datacenterId: datacenter.id, ipAddress, hostname, osType: 'Linux', environment: labelValue,
    datacenter: datacenter.name, status: 'Online', labels: [{ key: 'environment', value: labelValue }],
  } });
  return server;
}
const productionServer = await ensureServer('e2e-production', '10.250.0.10', 'Production');
const stagingServer = await ensureServer('e2e-staging', '10.250.0.11', 'Staging');

let applications = await call('/api/v1/applications', { token: owner.token, workspaceId });
async function ensureApp(appCode, appName, serverId, port, labelValue) {
  let app = applications.find(item => item.appCode === appCode);
  if (!app) app = await call('/api/v1/applications', { token: owner.token, workspaceId, method: 'POST', expected: [201], body: {
    appCode, appName, ownerTeam: 'E2E', risk: 'Low', techStack: 'E2E', labels: [{ key: 'environment', value: labelValue }],
    deployment: { serverId, portNumber: port, protocol: 'TCP' },
  } });
  return app;
}
const productionApp = await ensureApp('E2E-PROD', 'E2E Production App', productionServer.id, 18080, 'Production');
const stagingApp = await ensureApp('E2E-STAGE', 'E2E Staging App', stagingServer.id, 18081, 'Staging');

await call('/api/v1/topology/state', { token: owner.token, workspaceId, method: 'PUT', expected: [204], body: {
  nodes: [
    { id: frameId, nodeType: 'frame', label: 'E2E Staging Frame', x: 40, y: 40, width: 600, height: 400 },
    { id: frameServerNodeId, nodeType: 'server', label: stagingServer.hostname, x: 80, y: 100, parentNodeId: frameId, referenceId: stagingServer.id },
    { id: frameAppNodeId, nodeType: 'application', label: stagingApp.appName, x: 120, y: 160, parentNodeId: frameServerNodeId, referenceId: stagingApp.servers[0].portMappingId },
  ], edges: [],
} });

const destinationPortMappingId = stagingApp.servers?.[0]?.portMappingId;
if (!destinationPortMappingId) throw new Error('Staging application deployment was not returned by the API.');
await call('/api/v1/dependencies/sync', { token: owner.token, workspaceId, method: 'PUT', expected: [204], body: {
  dependencies: [{ sourceAppId: productionApp.id, destAppId: stagingApp.id, destinationPortMappingId }],
} });

const options = await call(`/api/v1/workspaces/${workspaceId}/share-options?max=20`, { token: owner.token });
const productionLabel = options.labels.find(item => item.displayName === 'environment:Production');
if (!productionLabel) throw new Error('Production label was not exposed as a share target.');

const desiredShares = [
  [sessions.WORKSPACE_ADMIN.userId, 'workspace_admin', 'all', []],
  [sessions.LABEL_AUDITOR.userId, 'auditor', 'labels', [productionLabel.id]],
  [sessions.FRAME_AUDITOR.userId, 'auditor', 'frames', [frameId]],
  [sessions.VIEWER.userId, 'viewer', 'labels', [productionLabel.id]],
];
const existingShares = await call(`/api/v1/workspaces/${workspaceId}/shares`, { token: owner.token });
for (const [userId, role, scopeMode, targetIds] of desiredShares) {
  const existing = existingShares.find(item => item.userId === userId);
  if (existing && existing.role === role && existing.scopeMode === scopeMode &&
      JSON.stringify(existing.targetIds ?? []) === JSON.stringify(targetIds)) continue;
  const payload = { userId, role, scopeMode, targetIds, version: existing?.version ?? 0 };
  const sharePath = `/api/v1/workspaces/${workspaceId}/shares${existing ? `/${encodeURIComponent(userId)}` : ''}`;
  try {
    await call(sharePath, { token: owner.token, method: existing ? 'PUT' : 'POST', expected: existing ? [200] : [201], body: payload });
  } catch (error) {
    if (!existing || !String(error).includes('409')) throw error;
    const latest = (await call(`/api/v1/workspaces/${workspaceId}/shares`, { token: owner.token })).find(item => item.userId === userId);
    if (!latest) throw error;
    await call(sharePath, { token: owner.token, method: 'PUT', expected: [200], body: { ...payload, version: latest.version } });
  }
}

console.log(JSON.stringify({ workspaceId, productionServerId: productionServer.id, stagingServerId: stagingServer.id, frameId }));
