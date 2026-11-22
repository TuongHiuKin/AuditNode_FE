import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const profile = __ENV.PERF_PROFILE ?? 'smoke'
const backendUrls = [required('PERF_BACKEND_URL'), required('PERF_BACKEND_PEER_URL')]
const fixture = JSON.parse(open('/runtime/k6-data.json'))
const allowedOwners = new Set(fixture.allowedOwnerIds)
const functionalFailures = new Rate('functional_failures')
const securityFailures = new Rate('security_failures')
const sharedServerDuration = new Trend('shared_server_duration', true)
const sharedApplicationDuration = new Trend('shared_application_duration', true)
const searchDuration = new Trend('shared_search_duration', true)
const paginationDuration = new Trend('shared_pagination_duration', true)
const anonymousDuration = new Trend('anonymous_browse_duration', true)

const profileScenarios = {
  smoke: {
    catalog: { executor: 'constant-vus', vus: 5, duration: '60s', exec: 'catalogTraffic' },
    anonymous: { executor: 'constant-arrival-rate', rate: 8, timeUnit: '1m', duration: '60s', preAllocatedVUs: 1, maxVUs: 2, exec: 'anonymousTraffic' },
  },
  baseline: {
    catalog: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [{ duration: '1m', target: 20 }, { duration: '5m', target: 20 }, { duration: '30s', target: 0 }],
      exec: 'catalogTraffic',
    },
    anonymous: { executor: 'constant-arrival-rate', rate: 8, timeUnit: '1m', duration: '6m30s', preAllocatedVUs: 1, maxVUs: 2, exec: 'anonymousTraffic' },
  },
  stress: {
    catalog: {
      executor: 'ramping-vus',
      startVUs: 20,
      stages: [{ duration: '1m', target: 50 }, { duration: '3m', target: 50 }, { duration: '1m', target: 0 }],
      exec: 'catalogTraffic',
    },
    anonymous: { executor: 'constant-arrival-rate', rate: 8, timeUnit: '1m', duration: '5m', preAllocatedVUs: 1, maxVUs: 2, exec: 'anonymousTraffic' },
  },
}

if (!profileScenarios[profile]) throw new Error(`Unsupported PERF_PROFILE ${profile}.`)

export const options = {
  scenarios: profileScenarios[profile],
  thresholds: {
    functional_failures: ['rate==0'],
    security_failures: ['rate==0'],
  },
}

function required(name) {
  const value = __ENV[name]
  if (!value) throw new Error(`Missing ${name}`)
  return value.replace(/\/$/, '')
}

function parsePage(response, operation) {
  const validStatus = check(response, { [`${operation} returned 200`]: value => value.status === 200 })
  if (!validStatus) {
    functionalFailures.add(true)
    return null
  }
  try {
    const page = response.json()
    const validPage = Array.isArray(page.items) && typeof page.hasNextPage === 'boolean'
    functionalFailures.add(!validPage)
    return validPage ? page : null
  } catch {
    functionalFailures.add(true)
    return null
  }
}

function assertOwners(items, ownerOf) {
  const leaked = items.some(item => !allowedOwners.has(ownerOf(item)))
  securityFailures.add(leaked)
  check(leaked, { 'response contains only explicitly granted owners': value => value === false })
}

export function setup() {
  if (fixture.dataset.servers + fixture.dataset.applications !== 10000) {
    throw new Error('The performance fixture is not the approved 10,000-resource dataset.')
  }
  const response = http.post(`${backendUrls[0]}/api/v1/auth/login`, JSON.stringify({
    username: required('E2E_VIEWER_USERNAME'),
    password: required('E2E_VIEWER_PASSWORD'),
  }), { headers: { 'content-type': 'application/json' }, tags: { operation: 'login-setup' } })
  if (response.status !== 200 || !response.json('accessToken')) throw new Error(`Performance login returned ${response.status}.`)

  for (const token of [...fixture.anonymousTokens.expired, ...fixture.anonymousTokens.revoked]) {
    const denied = http.post(`${backendUrls[0]}/api/v1/share-links/browse`, JSON.stringify({
      token,
      resourceType: 'servers',
      limit: 1,
    }), {
      headers: { 'content-type': 'application/json' },
      tags: { operation: 'anonymous-denied-preflight' },
      responseCallback: http.expectedStatuses(404),
    })
    if (denied.status !== 404) throw new Error(`Inactive anonymous token returned ${denied.status} instead of 404.`)
  }
  return { accessToken: response.json('accessToken') }
}

function authenticatedGet(path, data, operation) {
  const base = backendUrls[(__ITER + __VU) % backendUrls.length]
  return http.get(`${base}${path}`, {
    headers: { authorization: `Bearer ${data.accessToken}` },
    tags: { operation },
  })
}

export function catalogTraffic(data) {
  const bucket = (__ITER + __VU) % 18
  if (bucket < 7) {
    const response = authenticatedGet('/api/v1/servers?view=shared&limit=25', data, 'shared-servers')
    sharedServerDuration.add(response.timings.duration)
    const page = parsePage(response, 'shared servers')
    if (page) assertOwners(page.items, item => item.ownerUserId)
  } else if (bucket < 12) {
    const response = authenticatedGet('/api/v1/applications?view=shared&limit=25', data, 'shared-applications')
    sharedApplicationDuration.add(response.timings.duration)
    const page = parsePage(response, 'shared applications')
    if (page) assertOwners(page.items, item => item.ownerUserId)
  } else if (bucket < 16) {
    const response = authenticatedGet('/api/v1/search?q=perf&view=shared&limit=25', data, 'shared-search')
    searchDuration.add(response.timings.duration)
    parsePage(response, 'shared search')
  } else {
    const first = authenticatedGet('/api/v1/servers?view=shared&limit=25', data, 'shared-pagination-first')
    paginationDuration.add(first.timings.duration)
    const firstPage = parsePage(first, 'shared pagination first page')
    if (firstPage) {
      assertOwners(firstPage.items, item => item.ownerUserId)
      if (!firstPage.nextCursor) {
        functionalFailures.add(true)
      } else {
        const next = authenticatedGet(`/api/v1/servers?view=shared&limit=25&cursor=${encodeURIComponent(firstPage.nextCursor)}`, data, 'shared-pagination-next')
        paginationDuration.add(next.timings.duration)
        const nextPage = parsePage(next, 'shared pagination next page')
        if (nextPage) {
          assertOwners(nextPage.items, item => item.ownerUserId)
          const firstIds = new Set(firstPage.items.map(item => item.id))
          functionalFailures.add(nextPage.items.some(item => firstIds.has(item.id)))
        }
      }
    }
  }
  sleep(1)
}

export function anonymousTraffic() {
  const token = fixture.anonymousTokens.active[__ITER % fixture.anonymousTokens.active.length]
  const base = backendUrls[__ITER % backendUrls.length]
  const response = http.post(`${base}/api/v1/share-links/browse`, JSON.stringify({
    token,
    resourceType: 'servers',
    limit: 25,
  }), { headers: { 'content-type': 'application/json' }, tags: { operation: 'anonymous-browse' } })
  anonymousDuration.add(response.timings.duration)
  const page = parsePage(response, 'anonymous browse')
  if (page) assertOwners(page.items, item => item.server.ownerUserId)
}

export function handleSummary(data) {
  const sanitized = { ...data }
  delete sanitized.setup_data
  return {
    stdout: `k6 ${profile} profile completed; sanitized evidence written to /results/${profile}-summary.json\n`,
    [`/results/${profile}-summary.json`]: JSON.stringify(sanitized, null, 2),
  }
}
