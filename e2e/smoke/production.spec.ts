import { expect, test } from '@playwright/test';

const frontend = process.env.E2E_PRODUCTION_FRONTEND_URL!;
const backend = process.env.E2E_PRODUCTION_BACKEND_URL!;
const username = process.env.E2E_PRODUCTION_CANARY_USERNAME;
const password = process.env.E2E_PRODUCTION_CANARY_PASSWORD;

test.describe('Production read-only smoke', () => {
  test('frontend and health endpoints are available', async ({ page, request }) => {
    const response = await page.goto(frontend, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();

    for (const path of ['/health/live', '/health/ready']) {
      const health = await request.get(`${backend}${path}`);
      expect(health.status(), path).toBe(200);
    }
  });

  test('optional canary can authenticate and read its identity', async ({ request }) => {
    test.skip(!username && !password, 'Production canary login is disabled by policy.');
    expect(username, 'Both production canary credentials must be configured.').toBeTruthy();
    expect(password, 'Both production canary credentials must be configured.').toBeTruthy();

    const login = await request.post(`${backend}/api/v1/auth/login`, { data: { username, password } });
    expect(login.status()).toBe(200);
    const { accessToken } = await login.json() as { accessToken: string };
    const me = await request.get(`${backend}/api/v1/auth/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(me.status()).toBe(200);
    expect((await me.json() as { id?: string }).id).toBeTruthy();
  });
});
