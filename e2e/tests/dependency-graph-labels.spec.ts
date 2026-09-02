import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/actors';

test.describe('Dependency Graph - Label Grouping & 3-Tier Nesting', () => {

  test('Should render boundary frames and nest servers correctly when filtering by label', async ({ page }) => {
    // 1. Use the real bootstrapped owner labels, and mock only graph-specific data.
    // Intercept topology map API to provide controlled node data.
    await page.route(/\/api\/v1\/topology\/map/, async route => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
            'Access-Control-Allow-Headers': '*'
          }
        });
        return;
      }
      
      const url = route.request().url();
      const hasLabelsFilter = url.includes('labels');
      
      if (hasLabelsFilter) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
            'Access-Control-Allow-Headers': '*'
          },
          body: JSON.stringify({
            servers: [
              {
                id: 'srv-test-mock-1',
                hostname: 'db-prod-01',
                ipAddress: '10.0.0.1',
                labels: [{ key: 'scope', value: 'shared' }],
                applications: [
                  { id: 'app-test-mock-1', name: 'PostgreSQL', port: 5432, protocol: 'TCP' }
                ]
              }
            ],
            connections: []
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
            'Access-Control-Allow-Headers': '*'
          },
          body: JSON.stringify({
            servers: [],
            connections: []
          })
        });
      }
    });

    // We also intercept /api/v1/frames just to prevent any UI errors if it tries to load user frames
    await page.route(/\/api\/v1\/frames/, async route => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
            'Access-Control-Allow-Headers': '*'
          }
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': '*',
          'Access-Control-Allow-Headers': '*'
        },
        body: JSON.stringify([])
      });
    });

    // 2. Login as the catalog owner.
    await loginAs(page, 'owner', '/inventory');

    // Wait for the app to finish loading and tokens to be saved
    await expect(page.getByRole('link', { name: /servers/i })).toBeVisible({ timeout: 15000 });

    // 3. Navigate directly to Dependency Manager.
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    await page.goto('/dependency-manager');
    await page.waitForLoadState('networkidle');

    // 4. Verify the Labels Dropdown exists and open it.
    const labelsDropdown = page.getByRole('button', { name: /labels/i, exact: false }).first();
    await expect(labelsDropdown).toBeVisible({ timeout: 10000 });
    await labelsDropdown.click();

    // 5. Select the real shared-scope label created by app bootstrap.
    const sharedLabelOption = page.getByRole('button', { name: 'scope shared', exact: true });
    await expect(sharedLabelOption).toBeVisible({ timeout: 10000 });
    await sharedLabelOption.click();
    
    // Close dropdown by clicking outside or pressing Escape
    await page.keyboard.press('Escape');

    // 6. Verify that the 3-Tier Nesting correctly rendered in React Flow.

    // A. Verify Boundary Frame (Tier 1)
    const frameNode = page.locator('.react-flow__node-boundaryFrame').first();
    await expect(frameNode).toBeVisible({ timeout: 10000 });
    await expect(frameNode).toContainText('Label: scope=shared');

    // B. Verify Server Node inside Frame (Tier 2)
    const serverNode = page.locator('.react-flow__node-serverNode').first();
    await expect(serverNode).toBeVisible();
    await expect(serverNode).toContainText('db-prod-01');

    // C. Verify App Node inside Server (Tier 3)
    const appNode = page.locator('.react-flow__node-appNode').first();
    await expect(appNode).toBeVisible();
    await expect(appNode).toContainText('PostgreSQL');
  });

});


