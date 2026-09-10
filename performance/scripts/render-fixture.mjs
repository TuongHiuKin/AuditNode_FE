import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const backendUrl = required('PERF_BACKEND_URL').replace(/\/$/, '')
const runtimeDirectory = process.env.PERF_RUNTIME_DIRECTORY ?? '/runtime'
const templatePath = process.env.PERF_SEED_TEMPLATE ?? '/performance/fixtures/seed-catalog.sql.template'

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function validateUserId(value, actor) {
  if (!/^[A-Za-z0-9._:-]{1,100}$/.test(value)) {
    throw new Error(`${actor} returned an unsafe user identifier.`)
  }
  return value
}

async function session(prefix) {
  const response = await fetch(`${backendUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: required(`E2E_${prefix}_USERNAME`),
      password: required(`E2E_${prefix}_PASSWORD`),
    }),
  })
  if (!response.ok) throw new Error(`${prefix} login returned ${response.status}.`)
  const login = await response.json()
  const me = await fetch(`${backendUrl}/api/v1/auth/me`, {
    headers: { authorization: `Bearer ${login.accessToken}` },
  })
  if (!me.ok) throw new Error(`${prefix} identity returned ${me.status}.`)
  const identity = await me.json()
  return { userId: validateUserId(identity.id, prefix) }
}

function anonymousGrant(index) {
  const ownerNumber = Math.floor(index / 2) + 1
  const labelNumber = (index % 2) + 2
  const owner = `perf-owner-${String(ownerNumber).padStart(2, '0')}`
  const token = createHash('sha256').update(`auditnode-performance-share-${index + 1}`).digest('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const state = index < 16 ? 'active' : index < 18 ? 'expired' : 'revoked'
  const expiresAt = state === 'expired' ? "NOW() - INTERVAL '1 hour'" : "NOW() + INTERVAL '1 day'"
  const revokedAt = state === 'revoked' ? 'NOW()' : 'NULL'
  return {
    owner,
    token,
    state,
    sql: `(md5('perf-anonymous-grant-${index + 1}'))::uuid, '${owner}', (md5('perf-label-${ownerNumber}-${labelNumber}'))::uuid, NULL, '${tokenHash}', 'viewer', ${expiresAt}, ${revokedAt}, 1, '${owner}', NOW(), NOW()`,
  }
}

const [viewer, editor, expiredActor, revokedActor, template] = await Promise.all([
  session('VIEWER'),
  session('LABEL_AUDITOR'),
  session('WORKSPACE_ADMIN'),
  session('FRAME_AUDITOR'),
  readFile(templatePath, 'utf8'),
])
const anonymousGrants = Array.from({ length: 20 }, (_, index) => anonymousGrant(index))
const sql = template
  .replaceAll('{{VIEWER_USER_ID}}', viewer.userId)
  .replaceAll('{{EDITOR_USER_ID}}', editor.userId)
  .replaceAll('{{EXPIRED_USER_ID}}', expiredActor.userId)
  .replaceAll('{{REVOKED_USER_ID}}', revokedActor.userId)
  .replace('{{ANONYMOUS_GRANT_ROWS}}', anonymousGrants.map(grant => `  (${grant.sql})`).join(',\n'))

if (sql.includes('{{')) throw new Error('Performance SQL contains an unresolved template placeholder.')

await mkdir(runtimeDirectory, { recursive: true })
await Promise.all([
  writeFile(`${runtimeDirectory}/seed-catalog.sql`, sql, 'utf8'),
  writeFile(`${runtimeDirectory}/k6-data.json`, `${JSON.stringify({
    dataset: {
      owners: 10,
      servers: 6000,
      applications: 4000,
      labels: 100,
      userGrants: 200,
      anonymousGrants: 20,
    },
    allowedOwnerIds: Array.from({ length: 10 }, (_, index) => `perf-owner-${String(index + 1).padStart(2, '0')}`),
    anonymousTokens: {
      active: anonymousGrants.filter(grant => grant.state === 'active').map(grant => grant.token),
      expired: anonymousGrants.filter(grant => grant.state === 'expired').map(grant => grant.token),
      revoked: anonymousGrants.filter(grant => grant.state === 'revoked').map(grant => grant.token),
    },
  }, null, 2)}\n`, 'utf8'),
])

console.log('Rendered deterministic 10,000-resource performance fixture.')
