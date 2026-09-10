const keycloakUrl = required('PERF_KEYCLOAK_URL').replace(/\/$/, '')

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

async function request(path, init = {}) {
  const response = await fetch(`${keycloakUrl}${path}`, init)
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path} returned ${response.status}: ${await response.text()}`)
  return response
}

const tokenResponse = await request('/realms/master/protocol/openid-connect/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'password',
    client_id: 'admin-cli',
    username: required('E2E_KEYCLOAK_ADMIN_USERNAME'),
    password: required('E2E_KEYCLOAK_ADMIN_PASSWORD'),
  }),
})
const { access_token: token } = await tokenResponse.json()
const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
const realm = await (await request('/admin/realms/auditnode-e2e', { headers })).json()
await request('/admin/realms/auditnode-e2e', {
  method: 'PUT',
  headers,
  body: JSON.stringify({ ...realm, accessTokenLifespan: 900 }),
})

console.log('Configured the disposable performance realm with a 15-minute access-token lifetime.')
