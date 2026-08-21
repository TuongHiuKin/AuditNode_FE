import { test, expect } from '@playwright/test';

test.describe('Inventory Page - Servers', () => {
  test('should load the inventory page and display servers', async ({ page }) => {
    // Navigate to the inventory page (will redirect to Keycloak if not logged in)
    await page.goto('/inventory');

    // Wait for redirect to finish
    await page.waitForLoadState('networkidle');

    await page.locator('#login-username').fill('Ankinnnnn');
    await page.locator('#login-password').fill('12345');
    await page.locator('#login-submit').click();
    
    // Wait for login to complete and redirect back to our app
    await page.waitForLoadState('networkidle');

    // Now we should be on the inventory page

    // Verify the page title/header is present
    await expect(page.getByRole('link', { name: /servers/i })).toBeVisible({ timeout: 15000 });

    // Assuming there is a table or list of servers
    // We wait for the table body to be visible
    const tableBody = page.locator('tbody');
    await expect(tableBody).toBeVisible({ timeout: 15000 });

    // Verify that at least one server row is rendered or the empty state is shown
    const rows = tableBody.locator('tr');
    const rowCount = await rows.count();
    
    // It should either have servers or show the "No servers found" message
    expect(rowCount).toBeGreaterThan(0);
  });
});


