import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/actors';

test.describe('Sidebar Collapse and Sign Out E2E Tests', () => {

  test('should display Sign Out in expanded and collapsed sidebars, then successfully sign out', async ({ page }) => {
    await loginAs(page, 'owner');

    const profileBtn = page.locator('[data-testid="sidebar-profile-btn"]');
    const profileMenu = page.locator('[data-testid="sidebar-profile-menu"]');
    const signOutBtn = page.locator('[data-testid="sidebar-sign-out-btn"]');
    await expect(profileBtn).toBeVisible({ timeout: 15000 });

    await profileBtn.click();
    await expect(profileMenu).toBeVisible({ timeout: 5000 });
    await expect(signOutBtn).toBeVisible();
    await expect(signOutBtn).toBeEnabled();
    await profileBtn.click();
    await expect(profileMenu).toBeHidden();

    const collapseBtn = page.locator('[data-testid="sidebar-collapse-btn"]');
    await expect(collapseBtn).toBeVisible({ timeout: 15000 });
    await collapseBtn.click();
    await expect(collapseBtn).toHaveAttribute('aria-label', 'Expand sidebar');
    await expect.poll(async () => (await page.locator('aside').first().boundingBox())?.width ?? Number.POSITIVE_INFINITY)
      .toBeLessThanOrEqual(65);
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();
    await expect(profileMenu).toBeVisible({ timeout: 5000 });
    await expect(signOutBtn).toBeVisible();
    await expect(signOutBtn).toBeEnabled();

    await expect.poll(async () => (await profileMenu.boundingBox())?.x ?? 0).toBeGreaterThan(50);
    const box = await profileMenu.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThan(0);

    await signOutBtn.click();
    await expect(page).toHaveURL(/.*login.*/, { timeout: 10000 });
  });


});
