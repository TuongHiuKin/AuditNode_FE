import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/actors';

test.describe('Keycloak RBAC & Action Gating E2E Tests', () => {

  test('Workspace owner should have full inventory management access', async ({ page }) => {
    // 1. Login as Admin
    await loginAs(page, 'owner');

    // Verify we reached the Inventory page
    await expect(page.getByRole('link', { name: /servers/i })).toBeVisible({ timeout: 15000 });

    // 2. Owner can use inventory management actions.
    const importBtn = page.getByRole('button', { name: /import/i });
    const registerBtn = page.getByRole('button', { name: /register entity/i });

    await expect(importBtn).toBeVisible();
    await expect(importBtn).toBeEnabled();
    await expect(importBtn).toHaveAttribute('title', 'Import');
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

  test('Label Auditor should have scoped inventory edit access but no Datacenter management access', async ({ page }) => {
    // 1. Login as Auditor
    await loginAs(page, 'labelAuditor');

    // Verify we reached the Inventory page
    await expect(page.getByRole('link', { name: /servers/i })).toBeVisible({ timeout: 15000 });

    // 2. Auditor can register/edit within scope; bulk import remains owner/admin-only.
    const importBtn = page.getByRole('button', { name: /import/i });
    const registerBtn = page.getByRole('button', { name: /register entity/i });

    await expect(importBtn).toBeVisible();
    await expect(importBtn).toBeDisabled();
    await expect(importBtn).toHaveAttribute('title', 'Bạn không có quyền thao tác');
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
    await page.getByRole('link', { name: /dependencies/i }).click();
    await expect(page).toHaveURL(/\/dependency-manager/);
    await page.waitForLoadState('networkidle');
    const autoMapBtn = page.getByRole('button', { name: /auto-map from db/i });
    const saveStateBtn = page.getByRole('button', { name: /save network state/i });

    await expect(autoMapBtn).toBeVisible({ timeout: 15000 });
    await expect(autoMapBtn).toBeEnabled();
    await expect(saveStateBtn).toBeVisible();
    await expect(saveStateBtn).toBeEnabled();
  });

  test('Viewer should have read-only access and all mutating action buttons disabled', async ({ page }) => {
    // 1. Login as Viewer
    await loginAs(page, 'viewer');

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
    await page.getByRole('link', { name: /dependencies/i }).click();
    await expect(page).toHaveURL(/\/dependency-manager/);
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


