const base = process.env.E2E_KEYCLOAK_INTERNAL_URL;
const required = name => process.env[name] || (() => { throw new Error(`Missing ${name}`); })();

async function request(path, init = {}, expected = [200, 201, 204, 409]) {
  const response = await fetch(`${base}${path}`, init);
  if (!expected.includes(response.status)) throw new Error(`${init.method ?? 'GET'} ${path} returned ${response.status}: ${await response.text()}`);
  return response;
}

const tokenResponse = await request('/realms/master/protocol/openid-connect/token', {
  method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'password', client_id: 'admin-cli', username: required('E2E_KEYCLOAK_ADMIN_USERNAME'), password: required('E2E_KEYCLOAK_ADMIN_PASSWORD') }),
}, [200]);
const { access_token: token } = await tokenResponse.json();
const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

await request('/admin/realms', { method: 'POST', headers, body: JSON.stringify({ realm: 'auditnode-e2e', enabled: true }) });
for (const role of ['SystemAdmin', 'Owner', 'WorkspaceAdmin', 'Auditor', 'Viewer']) {
  await request(`/admin/realms/auditnode-e2e/roles`, { method: 'POST', headers, body: JSON.stringify({ name: role }) });
}

for (const client of [
  { clientId: 'auditnode-bff', secret: required('E2E_BFF_CLIENT_SECRET'), serviceAccountsEnabled: false, directAccessGrantsEnabled: true },
  { clientId: 'auditnode-admin', secret: required('E2E_ADMIN_CLIENT_SECRET'), serviceAccountsEnabled: true, directAccessGrantsEnabled: false },
]) {
  const desired = { ...client, enabled: true, publicClient: false, protocol: 'openid-connect' };
  const existing = await (await request(`/admin/realms/auditnode-e2e/clients?clientId=${client.clientId}`, { headers }, [200])).json();
  if (existing.length) await request(`/admin/realms/auditnode-e2e/clients/${existing[0].id}`, { method: 'PUT', headers, body: JSON.stringify({ ...existing[0], ...desired }) });
  else await request('/admin/realms/auditnode-e2e/clients', { method: 'POST', headers, body: JSON.stringify(desired) });
}

const adminClients = await (await request('/admin/realms/auditnode-e2e/clients?clientId=auditnode-admin', { headers }, [200])).json();
const serviceUsers = await (await request(`/admin/realms/auditnode-e2e/clients/${adminClients[0].id}/service-account-user`, { headers }, [200])).json();
const realmManagement = await (await request('/admin/realms/auditnode-e2e/clients?clientId=realm-management', { headers }, [200])).json();
const adminRoles = await Promise.all(['manage-users', 'view-realm'].map(async roleName =>
  (await request(`/admin/realms/auditnode-e2e/clients/${realmManagement[0].id}/roles/${roleName}`, { headers }, [200])).json()));
await request(`/admin/realms/auditnode-e2e/users/${serviceUsers.id}/role-mappings/clients/${realmManagement[0].id}`, { method: 'POST', headers, body: JSON.stringify(adminRoles) });

const actors = [
  ['E2E_SYSTEM_ADMIN_USERNAME', 'E2E_SYSTEM_ADMIN_PASSWORD', 'SystemAdmin'],
  ['E2E_OWNER_USERNAME', 'E2E_OWNER_PASSWORD', 'Owner'],
  ['E2E_WORKSPACE_ADMIN_USERNAME', 'E2E_WORKSPACE_ADMIN_PASSWORD', 'WorkspaceAdmin'],
  ['E2E_LABEL_AUDITOR_USERNAME', 'E2E_LABEL_AUDITOR_PASSWORD', 'Auditor'],
  ['E2E_FRAME_AUDITOR_USERNAME', 'E2E_FRAME_AUDITOR_PASSWORD', 'Auditor'],
  ['E2E_VIEWER_USERNAME', 'E2E_VIEWER_PASSWORD', 'Viewer'],
];
for (const [usernameKey, passwordKey, roleName] of actors) {
  const username = required(usernameKey);
  let users = await (await request(`/admin/realms/auditnode-e2e/users?username=${encodeURIComponent(username)}&exact=true`, { headers }, [200])).json();
  if (!users.length) {
    await request('/admin/realms/auditnode-e2e/users', { method: 'POST', headers, body: JSON.stringify({ username, email: `${username}@example.test`, firstName: 'E2E', lastName: 'Test', enabled: true, emailVerified: true, requiredActions: [] }) });
    users = await (await request(`/admin/realms/auditnode-e2e/users?username=${encodeURIComponent(username)}&exact=true`, { headers }, [200])).json();
  } else {
    await request(`/admin/realms/auditnode-e2e/users/${users[0].id}`, { method: 'PUT', headers, body: JSON.stringify({ ...users[0], username, email: `${username}@example.test`, firstName: 'E2E', lastName: 'Test', enabled: true, emailVerified: true, requiredActions: [] }) });
  }
  await request(`/admin/realms/auditnode-e2e/users/${users[0].id}/reset-password`, { method: 'PUT', headers, body: JSON.stringify({ type: 'password', value: required(passwordKey), temporary: false }) });
  const role = await (await request(`/admin/realms/auditnode-e2e/roles/${roleName}`, { headers }, [200])).json();
  const mappedRoles = await (await request(`/admin/realms/auditnode-e2e/users/${users[0].id}/role-mappings/realm`, { headers }, [200])).json();
  const managedRoleNames = new Set(['SystemAdmin', 'Owner', 'WorkspaceAdmin', 'Auditor', 'Viewer']);
  const staleRoles = mappedRoles.filter(item => managedRoleNames.has(item.name) && item.name !== roleName);
  if (staleRoles.length) await request(`/admin/realms/auditnode-e2e/users/${users[0].id}/role-mappings/realm`, { method: 'DELETE', headers, body: JSON.stringify(staleRoles) });
  await request(`/admin/realms/auditnode-e2e/users/${users[0].id}/role-mappings/realm`, { method: 'POST', headers, body: JSON.stringify([role]) });
}
