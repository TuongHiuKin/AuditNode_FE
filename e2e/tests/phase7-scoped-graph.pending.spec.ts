import { expect, test, type APIRequestContext } from '@playwright/test';
import { actor, type E2EActorName } from '../fixtures/actors';

const backend = process.env.E2E_BACKEND_URL ??
  (process.env.E2E_EXTERNAL_STACK === '1' ? 'http://localhost:15000' : 'http://localhost:5000');

async function headers(api: APIRequestContext, name: E2EActorName) {
  const login = await api.post(`${backend}/api/v1/auth/login`, { data: actor(name) });
  expect(login.ok()).toBeTruthy();
  const { accessToken } = await login.json() as { accessToken: string };
  return { authorization: `Bearer ${accessToken}` };
}

test.describe('Workspace runtime removal contract', () => {
  test('removed Workspace endpoint is not exposed', async ({ request }) => {
    const ownerHeaders = await headers(request, 'owner');
    const response = await request.get(`${backend}/api/v1/workspaces`, { headers: ownerHeaders });
    expect(response.status()).toBe(404);
  });

  test('legacy X-Workspace-Id no longer changes the owner catalog result', async ({ request }) => {
    const ownerHeaders = await headers(request, 'owner');
    const normal = await request.get(`${backend}/api/v1/servers?view=mine&limit=100`, { headers: ownerHeaders });
    const legacy = await request.get(`${backend}/api/v1/servers?view=mine&limit=100`, {
      headers: { ...ownerHeaders, 'x-workspace-id': crypto.randomUUID() },
    });
    expect(normal.status()).toBe(200);
    expect(legacy.status()).toBe(200);
    expect(await legacy.json()).toEqual(await normal.json());
  });
});
