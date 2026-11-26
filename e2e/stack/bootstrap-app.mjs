const base = process.env.E2E_BACKEND_INTERNAL_URL;
const required = name => process.env[name] || (() => { throw new Error(`Missing ${name}`); })();

async function call(path, { token, method = 'GET', body, expected = [200] } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!expected.includes(response.status)) throw new Error(`${method} ${path} returned ${response.status}: ${await response.text()}`);
  // Empty bodies are legal: some creates answer 201 without a payload and
  // deletes answer 204. Read the text and parse only when something came back.
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try { return JSON.parse(text); } catch { return text; }
}

async function session(prefix) {
  const username = required(`E2E_${prefix}_USERNAME`);
  const password = required(`E2E_${prefix}_PASSWORD`);
  const login = await call('/api/v1/auth/login', { method: 'POST', body: { username, password } });
  const me = await call('/api/v1/auth/me', { token: login.accessToken });
  return { token: login.accessToken, userId: me.id };
}

// The first administrator is created by the API itself (Identity:BootstrapAdmin).
// Everyone else is created through the admin API, which is why this runs after
// the backend is ready.
const admin = await session('SYSTEM_ADMIN');

async function ensureUser(prefix) {
  const username = required(`E2E_${prefix}_USERNAME`);
  const password = required(`E2E_${prefix}_PASSWORD`);

  const existing = await call(`/api/v1/admin/users?search=${encodeURIComponent(username)}`, { token: admin.token });
  const match = existing.find(user => user.username === username);
  if (!match) {
    await call('/api/v1/admin/users', {
      token: admin.token,
      method: 'POST',
      expected: [201],
      body: { username, email: `${username}@auditnode.local`, password },
    });
  }
  return session(prefix);
}

const sessions = { SYSTEM_ADMIN: admin };
for (const prefix of ['OWNER', 'WORKSPACE_ADMIN', 'LABEL_AUDITOR', 'FRAME_AUDITOR', 'VIEWER'])
  sessions[prefix] = await ensureUser(prefix);
const owner = sessions.OWNER;

async function page(path, token) {
  const result = await call(path, { token });
  if (!Array.isArray(result.items)) throw new Error(`${path} did not return a cursor page.`);
  return result.items;
}

async function ensureDatacenter(sessionValue, name) {
  const datacenters = await page('/api/v1/datacenters?view=mine&limit=100', sessionValue.token);
  return datacenters.find(item => item.name === name) ?? call('/api/v1/datacenters', {
    token: sessionValue.token,
    method: 'POST',
    body: { name, location: 'E2E' },
  });
}

async function ensureServer(sessionValue, datacenter, hostname, ipAddress, scopeValue) {
  const servers = await page('/api/v1/servers?view=mine&limit=100', sessionValue.token);
  return servers.find(item => item.hostname === hostname) ?? call('/api/v1/servers', {
    token: sessionValue.token,
    method: 'POST',
    expected: [201],
    body: {
      datacenterId: datacenter.id,
      ipAddress,
      hostname,
      osType: 'Linux',
      environment: 'Development',
      datacenter: datacenter.name,
      status: 'Online',
      labels: [{ key: 'scope', value: scopeValue }],
    },
  });
}

async function findOwnedLabel(sessionValue, key, value) {
  const labels = await page(`/api/v1/labels?view=mine&limit=100&labelKey=${encodeURIComponent(key)}&labelValue=${encodeURIComponent(value)}`, sessionValue.token);
  const label = labels.find(item => item.key === key && item.value === value && item.ownerUserId === sessionValue.userId);
  if (!label) throw new Error(`Owned label ${key}:${value} was not created.`);
  return label;
}

async function ensureGrant(labelId, granteeUserId, permission) {
  const path = `/api/v1/labels/${labelId}/grants`;
  const grants = await call(path, { token: owner.token });
  const active = grants.find(item => item.granteeUserId === granteeUserId && item.revokedAt === null);
  if (!active) {
    return call(path, {
      token: owner.token,
      method: 'POST',
      expected: [201],
      body: { granteeUserId, permission, expiresAt: null },
    });
  }
  if (active.permission === permission && active.expiresAt === null) return active;
  return call(`${path}/${active.id}`, {
    token: owner.token,
    method: 'PUT',
    body: { permission, expiresAt: null, version: active.version },
  });
}

const ownerDatacenter = await ensureDatacenter(owner, 'E2E Owner Datacenter');
const sharedServer = await ensureServer(owner, ownerDatacenter, 'e2e-shared-primary', '10.250.0.10', 'shared');
const sharedServerTwo = await ensureServer(owner, ownerDatacenter, 'e2e-shared-secondary', '10.250.0.11', 'shared');
const privateServer = await ensureServer(owner, ownerDatacenter, 'e2e-private', '10.250.0.12', 'private');
const sharedLabel = await findOwnedLabel(owner, 'scope', 'shared');

await ensureGrant(sharedLabel.id, sessions.LABEL_AUDITOR.userId, 'editor');
await ensureGrant(sharedLabel.id, sessions.VIEWER.userId, 'viewer');

const secondOwner = sessions.FRAME_AUDITOR;
const secondDatacenter = await ensureDatacenter(secondOwner, 'E2E Second Owner Datacenter');
const sameNameServer = await ensureServer(secondOwner, secondDatacenter, 'e2e-second-owner-shared', '10.251.0.10', 'shared');
const secondOwnerLabel = await findOwnedLabel(secondOwner, 'scope', 'shared');

// The dependency palette and its external node spec need a real third-party service.
const externalServices = await call('/api/v1/external-services', { token: owner.token });
const existingExternal = externalServices.find((service) => service.name === 'Stripe');
const externalService = existingExternal ?? await call('/api/v1/external-services', {
  method: 'POST',
  token: owner.token,
  expected: [201],
  body: {
    name: 'Stripe',
    kind: 'payment',
    endpoint: 'https://api.stripe.com',
    provider: 'Stripe',
    protocol: 'HTTPS',
    port: 443,
    environment: 'Production',
    notes: 'E2E seeded third-party service',
  },
});

console.log(JSON.stringify({
  ownerUserId: owner.userId,
  sharedLabelId: sharedLabel.id,
  sharedServerIds: [sharedServer.id, sharedServerTwo.id],
  privateServerId: privateServer.id,
  secondOwnerUserId: secondOwner.userId,
  secondOwnerLabelId: secondOwnerLabel.id,
  secondOwnerServerId: sameNameServer.id,
  externalServiceId: externalService.id,
}));
