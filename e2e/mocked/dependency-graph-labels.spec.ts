import { test, expect } from '@playwright/test';

const sharedLabel = {
  id: 'label-scope-shared',
  key: 'scope',
  value: 'shared',
  ownerUserId: 'mock-owner',
  kind: 'business',
  isProtected: false,
  effectivePermission: 'owner',
  sharedLabelIds: [],
  capabilities: {
    canRead: true,
    canEditProperties: true,
    canCreate: true,
    canDelete: true,
    canChangeLabels: true,
    canChangeOwner: false,
    canManageGrants: true,
  },
};

test.describe('Dependency Graph - Label Grouping & 3-Tier Nesting', () => {

  test('Should render boundary frames and nest servers correctly when filtering by label', async ({ page }) => {
    await page.route(/\/api\/v1\/auth\/login$/, route => route.fulfill({ json: { accessToken: 'mock-owner-token', expiresIn: 300 } }));
    await page.route(/\/api\/v1\/auth\/me$/, route => route.fulfill({ json: { id: 'mock-owner', username: 'mock-owner', email: 'owner@example.test', roles: [] } }));
    await page.route(/\/api\/v1\/labels(?:\?|$)/, route => route.fulfill({ json: { items: [sharedLabel], nextCursor: null, hasNextPage: false } }));
    await page.route(/\/api\/v1\/(?:servers|applications|datacenters)(?:\?|$)/, route => route.fulfill({ json: { items: [], nextCursor: null, hasNextPage: false } }));
    await page.route(/\/api\/v1\/topology\/state(?:\?|$)/, route => route.fulfill({ json: { version: 0, nodes: [], edges: [] } }));

    // Mock the graph integration boundary so this suite never claims backend coverage.
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

    // Login through the real UI against deterministic browser routes.
    await page.goto('/inventory');
    await page.locator('#login-username').fill('mock-owner');
    await page.locator('#login-password').fill('mock-password');
    await page.locator('#login-submit').click();

    // Wait for the app to finish loading and tokens to be saved
    await expect(page.getByRole('link', { name: /servers/i })).toBeVisible({ timeout: 15000 });

    // 3. Navigate through the SPA so the in-memory access token remains active.
    // Wait for the initial graph restoration to finish before changing filters;
    // otherwise its slower response can overwrite the filtered graph state.
    const initialTopologyStateResponse = page.waitForResponse(response => {
      const url = new URL(response.url());
      return response.request().method() === 'GET'
        && url.pathname === '/api/v1/topology/state';
    });
    await page.getByRole('link', { name: 'Dependencies' }).click();
    await expect(page).toHaveURL(/\/dependency-manager$/);
    await initialTopologyStateResponse;

    // 4. Verify the Labels Dropdown exists and open it.
    const labelsDropdown = page.getByRole('button', { name: /labels/i, exact: false }).first();
    await expect(labelsDropdown).toBeVisible({ timeout: 10000 });
    await labelsDropdown.click();

    // 5. Select the deterministic shared-scope label.
    const sharedLabelOption = page.getByRole('button', { name: 'scope shared', exact: true });
    await expect(sharedLabelOption).toBeVisible({ timeout: 10000 });
    const filteredTopologyResponse = page.waitForResponse(response => {
      const url = new URL(response.url());
      return response.request().method() === 'GET'
        && url.pathname === '/api/v1/topology/map'
        && [...url.searchParams.keys()].some(key => key.startsWith('labels'));
    });
    await sharedLabelOption.click();
    await filteredTopologyResponse;
    
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


