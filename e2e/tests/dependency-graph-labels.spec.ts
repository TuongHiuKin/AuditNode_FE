import { test, expect, Page } from '@playwright/test';

/**
 * Helper function to perform Keycloak login in Playwright E2E tests.
 */
async function loginToKeycloak(page: Page, username: string, pass: string) {
  await page.goto('/inventory');
  await page.waitForLoadState('networkidle');

  const userField = page.locator('#login-username').first();
  const passField = page.locator('#login-password').first();
  const submitBtn = page.locator('#login-submit').first();

  await userField.fill(username);
  await passField.fill(pass);
  await submitBtn.click();
  await page.waitForLoadState('networkidle');
}

test.describe('Dependency Graph - Label Grouping & 3-Tier Nesting', () => {

  test('Should render boundary frames and nest servers correctly when filtering by label', async ({ page }) => {
    // 0. Mock workspaces
    await page.route(/\/api\/v1\/workspaces/, async route => {
      console.log('Intercepted workspaces route:', route.request().url());
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
        body: JSON.stringify([
          { id: '11111111-1111-1111-1111-111111111111', name: 'E2E Workspace' }
        ])
      });
    });

    // 1. Intercept labels API to provide fake labels for the dropdown
    await page.route(/\/api\/v1\/inventory\/labels/, async route => {
      console.log('Intercepted labels route:', route.request().url());
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
        body: JSON.stringify([
          { key: 'env', value: 'production' },
          { key: 'tier', value: 'database' }
        ])
      });
    });

    // 2. Intercept topology map API to provide controlled node data
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
                labels: [{ key: 'tier', value: 'database' }],
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

    // 3. Login as Admin
    await loginToKeycloak(page, 'Ankinnnnn', '12345');

    // 4. Navigate directly to Dependency Manager
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    await page.goto('/dependency-manager');
    await page.waitForLoadState('networkidle');

    // 5. Verify the Labels Dropdown exists and open it
    const labelsDropdown = page.getByRole('button', { name: /labels/i, exact: false }).first();
    await expect(labelsDropdown).toBeVisible({ timeout: 10000 });
    await labelsDropdown.click();

    // 6. Select the 'database' label from the dropdown
    const dbLabelOption = page.locator('button:has-text("database")').first();
    await expect(dbLabelOption).toBeVisible({ timeout: 10000 });
    await dbLabelOption.click();
    
    // Close dropdown by clicking outside or pressing Escape
    await page.keyboard.press('Escape');

    // 7. Verify that the 3-Tier Nesting correctly rendered in React Flow

    // A. Verify Boundary Frame (Tier 1)
    const frameNode = page.locator('.react-flow__node-boundaryFrame').first();
    await expect(frameNode).toBeVisible({ timeout: 10000 });
    await expect(frameNode).toContainText('Label: tier=database');

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


