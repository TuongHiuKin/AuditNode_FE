import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/actors';

test.describe('Sidebar Collapse and Sign Out E2E Tests', () => {

  test('should display Sign Out menu correctly when Sidebar is collapsed and successfully sign out', async ({ page }) => {
    // 1. Login
    await loginAs(page, 'owner');

    // 2. Ensure Inventory page is loaded
    const collapseBtn = page.locator('[data-testid="sidebar-collapse-btn"]');
    await expect(collapseBtn).toBeVisible({ timeout: 15000 });

    // 3. Collapse the sidebar
    await collapseBtn.click();
    await page.waitForTimeout(400); // Allow 300ms transition to complete

    // 4. Click the user profile button in collapsed state
    const profileBtn = page.locator('[data-testid="sidebar-profile-btn"]');
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();
    await page.waitForTimeout(100);

    // 5. Verify the floating portal menu appears and is visible
    const profileMenu = page.locator('[data-testid="sidebar-profile-menu"]');
    await expect(profileMenu).toBeVisible({ timeout: 5000 });

    // 6. Verify Sign Out button is visible, enabled, and located correctly
    const signOutBtn = page.locator('[data-testid="sidebar-sign-out-btn"]');
    await expect(signOutBtn).toBeVisible();
    await expect(signOutBtn).toBeEnabled();

    // Ensure the menu has positive positioning and is not offscreen
    const box = await profileMenu.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThan(50); // Floats to the right of the 64px collapsed sidebar
    expect(box!.y).toBeGreaterThan(0);

    // 7. Click Sign Out
    await signOutBtn.click();

    // 8. Verify redirected to login
    await expect(page).toHaveURL(/.*login.*/, { timeout: 10000 });
  });

  test('should display Sign Out menu correctly when Sidebar is expanded and successfully sign out', async ({ page }) => {
    // 1. Login
    await loginAs(page, 'owner');

    // 2. Ensure Inventory page is loaded
    const profileBtn = page.locator('[data-testid="sidebar-profile-btn"]');
    await expect(profileBtn).toBeVisible({ timeout: 15000 });

    // 3. Click the user profile button in expanded state
    await profileBtn.click();

    // 4. Verify the floating portal menu appears
    const profileMenu = page.locator('[data-testid="sidebar-profile-menu"]');
    await expect(profileMenu).toBeVisible({ timeout: 5000 });

    // 5. Verify Sign Out button is visible and enabled
    const signOutBtn = page.locator('[data-testid="sidebar-sign-out-btn"]');
    await expect(signOutBtn).toBeVisible();
    await expect(signOutBtn).toBeEnabled();

    // 6. Click Sign Out
    await signOutBtn.click();

    // 7. Verify redirected to login
    await expect(page).toHaveURL(/.*login.*/, { timeout: 10000 });
  });

});
