import { test, expect, Page } from '@playwright/test';

/**
 * Helper function to perform Keycloak login in Playwright E2E tests.
 */
async function loginToKeycloak(page: Page, username: string, pass: string) {
  // Navigate to inventory servers page
  await page.goto('/inventory/servers');
  await page.waitForLoadState('networkidle');

  // Check if we are redirected to Keycloak login screen or local /login page
  const url = page.url();
  if (url.includes('localhost:8080') || url.includes('login') || url.includes('realms') || url.includes('auth')) {
    const userField = page.locator('input[name="username"], #username, #login-username, input[placeholder*="jdoe"], input[type="text"]').first();
    const passField = page.locator('input[name="password"], #password, #login-password, input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"], input[type="submit"], #kc-login, button:has-text("Sign In"), button:has-text("Login")').first();

    await userField.fill(username);
    await passField.fill(pass);
    await submitBtn.click();
    
    // Wait for redirect back to the application
    await page.waitForLoadState('networkidle');
  }
}

test.describe('Keycloak RBAC & Action Gating E2E Tests', () => {

  test('Admin Account (Ankinnnnn) should have full system & inventory management access', async ({ page }) => {
    // 1. Login as Admin
    await loginToKeycloak(page, 'Ankinnnnn', '12345');

    // Verify we reached the Inventory page
    await expect(page.getByRole('link', { name: /servers/i })).toBeVisible({ timeout: 15000 });

    // 2. Check Inventory Layout action buttons (Import & Register Entity should be enabled)
    const importBtn = page.getByRole('button', { name: /import/i });
    const registerBtn = page.getByRole('button', { name: /register entity/i });

    await expect(importBtn).toBeVisible();
    await expect(importBtn).toBeEnabled();
    await expect(registerBtn).toBeVisible();
    await expect(registerBtn).toBeEnabled();

    // 3. Check Datacenter dropdown for Admin (+ Add Datacenter option should be present)
    const dcDropdown = page.locator('button', { hasText: 'Datacenter' }).first();
    await expect(dcDropdown).toBeVisible();
    await dcDropdown.click();

    const addDcOption = page.locator('button', { hasText: '+ Add Datacenter' });
    await expect(addDcOption).toBeVisible({ timeout: 5000 });
    
    // Close dropdown by pressing Escape or clicking outside
    await page.keyboard.press('Escape');
  });

  test('Auditor Account (Ankinnnn) should have inventory edit access but NO Datacenter management access', async ({ page }) => {
    // 1. Login as Auditor
    await loginToKeycloak(page, 'Ankinnnn', '1234567');

    // Verify we reached the Inventory page
    await expect(page.getByRole('link', { name: /servers/i })).toBeVisible({ timeout: 15000 });

    // 2. Check Inventory Layout action buttons (Import & Register Entity should be enabled)
    const importBtn = page.getByRole('button', { name: /import/i });
    const registerBtn = page.getByRole('button', { name: /register entity/i });

    await expect(importBtn).toBeVisible();
    await expect(importBtn).toBeEnabled();
    await expect(registerBtn).toBeVisible();
    await expect(registerBtn).toBeEnabled();

    // 3. Check Datacenter dropdown for Auditor (+ Add Datacenter option should NOT be present)
    const dcDropdown = page.locator('button', { hasText: 'Datacenter' }).first();
    await expect(dcDropdown).toBeVisible();
    await dcDropdown.click();

    const addDcOption = page.locator('button', { hasText: '+ Add Datacenter' });
    await expect(addDcOption).toHaveCount(0);
    
    // Close dropdown by pressing Escape
    await page.keyboard.press('Escape');

    // 4. Verify Dependency Manager action buttons are enabled for Auditor
    await page.goto('/dependency-manager');
    await page.waitForLoadState('networkidle');

    const autoMapBtn = page.getByRole('button', { name: /auto-map from db/i });
    const saveStateBtn = page.getByRole('button', { name: /save network state/i });

    await expect(autoMapBtn).toBeVisible({ timeout: 15000 });
    await expect(autoMapBtn).toBeEnabled();
    await expect(saveStateBtn).toBeVisible();
    await expect(saveStateBtn).toBeEnabled();
  });

  test('Viewer Account (Ankinnn) should have read-only access and all mutating action buttons disabled', async ({ page }) => {
    // 1. Login as Viewer
    await loginToKeycloak(page, 'Ankinnn', '1234567');

    // Verify we reached the Inventory page
    await expect(page.getByRole('link', { name: /servers/i })).toBeVisible({ timeout: 15000 });

    // 2. Check Inventory Layout action buttons (Import & Register Entity should be DISABLED with tooltip)
    const importBtn = page.getByRole('button', { name: /import/i });
    const registerBtn = page.getByRole('button', { name: /register entity/i });

    await expect(importBtn).toBeVisible();
    await expect(importBtn).toBeDisabled();
    await expect(importBtn).toHaveAttribute('title', 'Bạn không có quyền thao tác');

    await expect(registerBtn).toBeVisible();
    await expect(registerBtn).toBeDisabled();
    await expect(registerBtn).toHaveAttribute('title', 'Bạn không có quyền thao tác');

    // 3. Check Datacenter dropdown for Viewer (+ Add Datacenter option should NOT be present)
    const dcDropdown = page.locator('button', { hasText: 'Datacenter' }).first();
    await expect(dcDropdown).toBeVisible();
    await dcDropdown.click();

    const addDcOption = page.locator('button', { hasText: '+ Add Datacenter' });
    await expect(addDcOption).toHaveCount(0);
    await page.keyboard.press('Escape');

    // 4. Verify Dependency Manager action buttons are DISABLED for Viewer
    await page.goto('/dependency-manager');
    await page.waitForLoadState('networkidle');

    const autoMapBtn = page.getByRole('button', { name: /auto-map from db/i });
    const saveStateBtn = page.getByRole('button', { name: /save network state/i });

    await expect(autoMapBtn).toBeVisible({ timeout: 15000 });
    await expect(autoMapBtn).toBeDisabled();
    await expect(autoMapBtn).toHaveAttribute('title', 'Bạn không có quyền thao tác');

    await expect(saveStateBtn).toBeVisible();
    await expect(saveStateBtn).toBeDisabled();
    await expect(saveStateBtn).toHaveAttribute('title', 'Bạn không có quyền thao tác');
  });

});
