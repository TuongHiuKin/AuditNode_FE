import { expect, test, type APIRequestContext } from '@playwright/test';
import { actor, loginAs, type E2EActorName } from '../../fixtures/actors';

const backend = process.env.E2E_BACKEND_URL
  ?? (process.env.E2E_EXTERNAL_STACK === '1' ? 'http://localhost:15000' : 'http://localhost:5000');

type Session = { headers: Record<string, string>; user: { id: string } };
type CatalogPage<T> = { items: T[]; nextCursor: string | null; hasNextPage: boolean };
type Label = { id: string; key: string; value: string; ownerUserId: string };
type Grant = { id: string; granteeUserId: string; permission: string; revokedAt: string | null; version: number };
type Server = {
  id: string; datacenterId: string; ipAddress: string; hostname: string; osType: string;
  environment: string; status: string; ownerUserId: string;
};

async function loginApi(api: APIRequestContext, name: E2EActorName): Promise<Session> {
  const response = await api.post(`${backend}/api/v1/auth/login`, { data: actor(name) });
  expect(response.ok(), `${name} login`).toBeTruthy();
  const { accessToken } = await response.json() as { accessToken: string };
  const headers = { authorization: `Bearer ${accessToken}` };
  const me = await api.get(`${backend}/api/v1/auth/me`, { headers });
  expect(me.ok(), `${name} identity`).toBeTruthy();
  return { headers, user: await me.json() as { id: string } };
}

async function ownerFixtures(api: APIRequestContext, owner: Session) {
  const labelsResponse = await api.get(`${backend}/api/v1/labels?view=mine&limit=100&labelKey=scope&labelValue=shared`, { headers: owner.headers });
  const serversResponse = await api.get(`${backend}/api/v1/servers?view=mine&limit=100`, { headers: owner.headers });
  expect(labelsResponse.status()).toBe(200);
  expect(serversResponse.status()).toBe(200);
  const labels = await labelsResponse.json() as CatalogPage<Label>;
  const servers = await serversResponse.json() as CatalogPage<Server>;
  const label = labels.items.find(item => item.ownerUserId === owner.user.id && item.key === 'scope' && item.value === 'shared');
  const server = servers.items.find(item => item.hostname === 'e2e-shared-primary');
  expect(label, 'shared label fixture').toBeDefined();
  expect(server, 'shared server fixture').toBeDefined();
  return { label: label!, server: server! };
}

function updateServer(server: Server, status: string) {
  return {
    ipAddress: server.ipAddress,
    hostname: server.hostname,
    osType: server.osType,
    environment: server.environment,
    status,
    datacenterId: server.datacenterId,
  };
}

test.describe.serial('Browser revocation boundaries', () => {
  test('an open anonymous share stops showing cached data after owner revoke', async ({ page, request }) => {
    test.setTimeout(60_000);
    const owner = await loginApi(request, 'owner');
    const { label, server } = await ownerFixtures(request, owner);
    const linksPath = `/api/v1/labels/${label.id}/share-links`;
    const create = await request.post(`${backend}${linksPath}`, {
      headers: owner.headers,
      data: { expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() },
    });
    expect(create.status()).toBe(201);
    const link = await create.json() as { grantId: string; token: string; version: number };
    let revoked = false;

    try {
      const opened = page.waitForResponse(response => response.request().method() === 'POST'
        && new URL(response.url()).pathname === '/api/v1/share-links/resolve');
      await page.goto(`/shared#token=${encodeURIComponent(link.token)}`);
      expect((await opened).status()).toBe(200);
      await expect(page.getByRole('heading', { name: 'Shared catalog', exact: true })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(server.hostname, { exact: true })).toBeVisible({ timeout: 15_000 });

      const revoke = await request.delete(`${backend}${linksPath}/${link.grantId}?version=${link.version}`, { headers: owner.headers });
      expect(revoke.status()).toBe(204);
      revoked = true;

      const rejected = page.waitForResponse(response => response.request().method() === 'POST'
        && new URL(response.url()).pathname === '/api/v1/share-links/resolve');
      await page.goto(`/shared?revoked=${Date.now()}#token=${encodeURIComponent(link.token)}`);
      expect((await rejected).status()).toBe(404);
      await expect(page.getByRole('heading', { name: 'Share link unavailable' })).toBeVisible();
      await expect(page.getByText(server.hostname, { exact: true })).toHaveCount(0);
    } finally {
      if (!revoked) {
        const cleanup = await request.delete(`${backend}${linksPath}/${link.grantId}?version=${link.version}`, { headers: owner.headers });
        expect([204, 404, 409]).toContain(cleanup.status());
      }
    }
  });

  test('an Editor edit succeeds, then revoke removes the shared row and denies another write', async ({ page, request }) => {
    test.setTimeout(90_000);
    const [owner, editor] = await Promise.all([loginApi(request, 'owner'), loginApi(request, 'editor')]);
    const { label, server } = await ownerFixtures(request, owner);
    const grantsPath = `/api/v1/labels/${label.id}/grants`;
    const grantsResponse = await request.get(`${backend}${grantsPath}`, { headers: owner.headers });
    expect(grantsResponse.status()).toBe(200);
    let grant = (await grantsResponse.json() as Grant[])
      .find(item => item.granteeUserId === editor.user.id && item.revokedAt === null);
    if (!grant) {
      const restoreFixture = await request.post(`${backend}${grantsPath}`, {
        headers: owner.headers,
        data: { granteeUserId: editor.user.id, permission: 'editor', expiresAt: null },
      });
      expect(restoreFixture.status()).toBe(201);
      grant = await restoreFixture.json() as Grant;
    }
    expect(grant?.permission).toBe('editor');

    const originalStatus = server.status;
    const changedStatus = originalStatus === 'Maintenance' ? 'Active' : 'Maintenance';
    let revoked = false;
    try {
      await loginAs(page, 'editor');
      await page.getByRole('button', { name: 'Shared with me' }).click();
      const row = page.locator('tbody tr').filter({ hasText: server.hostname });
      await expect(row).toBeVisible({ timeout: 15_000 });
      await row.getByTitle('Edit').click();
      await page.getByLabel('Status').selectOption(changedStatus);
      const updateResponse = page.waitForResponse(response => response.request().method() === 'PUT'
        && new URL(response.url()).pathname === `/api/v1/servers/${server.id}`);
      await page.locator('#edit-form').evaluate((form: HTMLFormElement) => form.requestSubmit());
      expect((await updateResponse).status()).toBe(204);
      const editHeading = page.getByRole('heading', { name: 'Edit Resource' });
      await editHeading.locator('xpath=../following-sibling::button').click();
      await expect(editHeading.locator('xpath=../../..')).toHaveClass(/translate-x-full/);

      const revoke = await request.delete(`${backend}${grantsPath}/${grant.id}?version=${grant.version}`, { headers: owner.headers });
      expect(revoke.status()).toBe(204);
      revoked = true;

      const denied = await request.put(`${backend}/api/v1/servers/${server.id}`, {
        headers: editor.headers,
        data: updateServer(server, changedStatus),
      });
      // Entity endpoints intentionally fail closed with non-disclosing not-found after access loss.
      expect(denied.status()).toBe(404);

      const mineView = page.getByRole('button', { name: 'My catalog' });
      const sharedView = page.getByRole('button', { name: 'Shared with me' });
      const mineRefreshed = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v1/servers'
        && new URL(response.url()).searchParams.get('view') === 'mine');
      await mineView.click();
      expect((await mineRefreshed).status()).toBe(200);
      await expect(mineView).toHaveAttribute('aria-pressed', 'true');

      const refreshed = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v1/servers'
        && new URL(response.url()).searchParams.get('view') === 'shared');
      await sharedView.click();
      const refreshedResponse = await refreshed;
      expect(refreshedResponse.status()).toBe(200);
      const refreshedPage = await refreshedResponse.json() as CatalogPage<Server>;
      expect(refreshedPage.items.some(item => item.id === server.id)).toBe(false);
      await expect(sharedView).toHaveAttribute('aria-pressed', 'true');
      const inventoryTable = page.getByRole('columnheader', { name: 'Hostname', exact: true })
        .locator('xpath=ancestor::table');
      await expect(inventoryTable.locator('tbody tr').filter({ hasText: server.hostname })).toHaveCount(0);
    } finally {
      const restoreServer = await request.put(`${backend}/api/v1/servers/${server.id}`, {
        headers: owner.headers,
        data: updateServer(server, originalStatus),
      });
      expect(restoreServer.status()).toBe(204);
      if (revoked) {
        const restoreGrant = await request.post(`${backend}${grantsPath}`, {
          headers: owner.headers,
          data: { granteeUserId: editor.user.id, permission: 'editor', expiresAt: null },
        });
        expect(restoreGrant.status()).toBe(201);
      }
    }
  });
});
