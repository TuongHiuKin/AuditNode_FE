import { expect, test, type APIRequestContext } from '@playwright/test';

const frontend = process.env.E2E_STAGING_FRONTEND_URL!;
const backend = process.env.E2E_STAGING_BACKEND_URL!;
const ownerUsername = process.env.E2E_STAGING_OWNER_USERNAME;
const ownerPassword = process.env.E2E_STAGING_OWNER_PASSWORD;
const adminUsername = process.env.E2E_STAGING_SYSTEM_ADMIN_USERNAME;
const adminPassword = process.env.E2E_STAGING_SYSTEM_ADMIN_PASSWORD;
const syntheticLabelId = process.env.E2E_STAGING_SYNTHETIC_LABEL_ID;
const syntheticGranteeId = process.env.E2E_STAGING_SYNTHETIC_GRANTEE_ID;

type Session = { headers: Record<string, string>; user: { id: string } };
type CatalogPage = { items: Array<{ ownerUserId: string }> };

async function login(api: APIRequestContext, username?: string, password?: string): Promise<Session> {
  expect(username, 'Staging synthetic username must be configured.').toBeTruthy();
  expect(password, 'Staging synthetic password must be configured.').toBeTruthy();
  const response = await api.post(`${backend}/api/v1/auth/login`, { data: { username, password } });
  expect(response.status()).toBe(200);
  const { accessToken } = await response.json() as { accessToken: string };
  const headers = { authorization: `Bearer ${accessToken}` };
  const me = await api.get(`${backend}/api/v1/auth/me`, { headers });
  expect(me.status()).toBe(200);
  return { headers, user: await me.json() as { id: string } };
}

test.describe.serial('Staging synthetic smoke', () => {
  test.beforeAll(() => {
    expect(process.env.E2E_STAGING_MUTATION_GUARD,
      'Refusing staging mutation without the explicit AUDITNODE_SYNTHETIC_STAGING guard.')
      .toBe('AUDITNODE_SYNTHETIC_STAGING');
  });

  test('frontend, health, identity, and Mine/Shared isolation are available', async ({ page, request }) => {
    const frontendResponse = await page.goto(frontend, { waitUntil: 'domcontentloaded' });
    expect(frontendResponse?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
    expect((await request.get(`${backend}/health/live`)).status()).toBe(200);
    expect((await request.get(`${backend}/health/ready`)).status()).toBe(200);

    const owner = await login(request, ownerUsername, ownerPassword);
    const [mineResponse, sharedResponse] = await Promise.all([
      request.get(`${backend}/api/v1/servers?view=mine&limit=25`, { headers: owner.headers }),
      request.get(`${backend}/api/v1/servers?view=shared&limit=25`, { headers: owner.headers }),
    ]);
    expect(mineResponse.status()).toBe(200);
    expect(sharedResponse.status()).toBe(200);
    const mine = await mineResponse.json() as CatalogPage;
    const shared = await sharedResponse.json() as CatalogPage;
    expect(mine.items.every(item => item.ownerUserId === owner.user.id)).toBe(true);
    expect(shared.items.every(item => item.ownerUserId !== owner.user.id)).toBe(true);
  });

  test('synthetic grant can be created and revoked without leaving state behind', async ({ request }) => {
    expect(syntheticLabelId, 'A dedicated staging synthetic label is required.').toBeTruthy();
    expect(syntheticGranteeId, 'A dedicated staging synthetic grantee is required.').toBeTruthy();
    const owner = await login(request, ownerUsername, ownerPassword);
    const path = `/api/v1/labels/${syntheticLabelId}/grants`;
    const create = await request.post(`${backend}${path}`, {
      headers: owner.headers,
      data: { granteeUserId: syntheticGranteeId, permission: 'viewer', expiresAt: null },
    });
    expect(create.status()).toBe(201);
    const grant = await create.json() as { id: string; version: number };
    let revoked = false;
    try {
      const revoke = await request.delete(`${backend}${path}/${grant.id}?version=${grant.version}`, { headers: owner.headers });
      expect(revoke.status()).toBe(204);
      revoked = true;
    } finally {
      if (!revoked) {
        const cleanup = await request.delete(`${backend}${path}/${grant.id}?version=${grant.version}`, { headers: owner.headers });
        expect([204, 404, 409]).toContain(cleanup.status());
      }
    }
  });

  test('SystemAdmin can read user management without changing identities', async ({ request }) => {
    const admin = await login(request, adminUsername, adminPassword);
    const users = await request.get(`${backend}/api/v1/admin/users?first=0&max=1`, { headers: admin.headers });
    expect(users.status()).toBe(200);
  });
});
