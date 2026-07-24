import { test, expect } from '@playwright/test';

test.describe('Inventory Page - Servers', () => {
  test('should load the inventory page and display servers', async ({ page }) => {
    // Navigate to the inventory page
    await page.goto('/inventory');

    // Verify the page title/header is present
    await expect(page.getByRole('heading', { name: /inventory/i })).toBeVisible({ timeout: 10000 });

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
