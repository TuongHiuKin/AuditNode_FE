import { expect, test } from '@playwright/test';
import { loginAs } from '../fixtures/actors';

async function selectShared(page: import('@playwright/test').Page) {
  const shared = page.getByRole('button', { name: 'Shared with me' });
  await shared.click();
  await expect(shared).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('e2e-shared-primary', { exact: true })).toBeVisible({ timeout: 15_000 });
}

test.describe('Global Catalog action gating', () => {
  test('Owner starts in My catalog with owner-only inventory actions', async ({ page }) => {
    const requestedViews: string[] = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/api/v1/servers') requestedViews.push(url.searchParams.get('view') ?? '');
    });
    await loginAs(page, 'owner');

    await expect(page.getByRole('button', { name: 'My catalog' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('select[aria-label="Workspace"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /import/i })).toBeEnabled();
    await expect(page.getByRole('button', { name: /register entity/i })).toBeEnabled();
    await expect(page.getByText('e2e-private', { exact: true })).toBeVisible({ timeout: 15_000 });
    expect(requestedViews).toContain('mine');
    expect(requestedViews).not.toContain('shared');

    await page.getByRole('button', { name: 'Shared with me' }).click();
    await expect.poll(() => requestedViews).toContain('shared');
  });

  test('Editor sees only Shared resources, can edit properties, and cannot create, relabel, or delete', async ({ page }) => {
    await loginAs(page, 'editor');
    await selectShared(page);

    await expect(page.getByText('e2e-private', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /import/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /register entity/i })).toBeDisabled();
    await expect(page.getByTitle('Edit').first()).toBeEnabled();
    await expect(page.getByTitle('Bạn không có quyền xóa tài nguyên này').first()).toBeDisabled();
  });

  test('Viewer sees only Shared resources and every mutating inventory action is disabled', async ({ page }) => {
    await loginAs(page, 'viewer');
    await selectShared(page);

    await expect(page.getByText('e2e-private', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /import/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /register entity/i })).toBeDisabled();
    await expect(page.locator('tbody button[title="Bạn không có quyền thao tác"]').first()).toBeDisabled();
    await expect(page.locator('tbody button[title="Bạn không có quyền xóa tài nguyên này"]').first()).toBeDisabled();
  });
});
