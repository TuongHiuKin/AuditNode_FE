import { expect, test } from '@playwright/test';
import { loginAs } from '../../fixtures/actors';

async function searchFor(page: import('@playwright/test').Page, value: string) {
  await page.getByLabel('Search users').fill(value);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  return page.locator('tbody tr').filter({ hasText: value });
}

test.describe.serial('System administration critical journey', () => {
  test('creates, handles conflict, locks, promotes, and recovers a managed user', async ({ page }) => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
    const username = `e2e-managed-${suffix}`;

    await loginAs(page, 'systemAdmin');
    await page.getByRole('link', { name: 'Users', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'User management' })).toBeVisible();

    await page.getByLabel('New username').fill(username);
    await page.getByLabel('New email').fill(`${username}@example.test`);
    await page.getByLabel('Temporary password').fill(`T3st-${suffix}!`);
    const createdResponse = page.waitForResponse(response => response.request().method() === 'POST'
      && new URL(response.url()).pathname === '/api/v1/admin/users');
    await page.getByRole('button', { name: 'Create user' }).click();
    expect((await createdResponse).status()).toBe(201);

    let row = await searchFor(page, username);
    await expect(row).toBeVisible();
    await expect(row).toContainText('Active');

    await page.getByLabel('New username').fill(username);
    await page.getByLabel('New email').fill(`${username}@example.test`);
    await page.getByLabel('Temporary password').fill(`T3st-${suffix}!`);
    const conflictResponse = page.waitForResponse(response => response.request().method() === 'POST'
      && new URL(response.url()).pathname === '/api/v1/admin/users');
    await page.getByRole('button', { name: 'Create user' }).click();
    expect((await conflictResponse).status()).toBe(409);

    page.once('dialog', dialog => dialog.accept());
    await row.getByRole('button', { name: 'Grant SystemAdmin' }).click();
    await expect(row.getByRole('button', { name: 'Revoke SystemAdmin' })).toBeVisible();

    await row.getByRole('button', { name: 'Lock' }).click();
    await expect(row).toContainText('Locked');
    await row.getByRole('button', { name: 'Activate' }).click();
    await expect(row).toContainText('Active');

    page.once('dialog', dialog => dialog.accept());
    await row.getByRole('button', { name: 'Revoke SystemAdmin' }).click();
    await expect(row.getByRole('button', { name: 'Grant SystemAdmin' })).toBeVisible();
  });
});
