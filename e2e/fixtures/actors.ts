import { expect, type Page } from '@playwright/test';

export type E2EActorName = 'systemAdmin' | 'owner' | 'workspaceAdmin' | 'labelAuditor' | 'frameAuditor' | 'viewer';

export interface E2EActor {
  username: string;
  password: string;
  workspaceName?: string;
}

const envKeys: Record<E2EActorName, [string, string]> = {
  systemAdmin: ['E2E_SYSTEM_ADMIN_USERNAME', 'E2E_SYSTEM_ADMIN_PASSWORD'],
  owner: ['E2E_OWNER_USERNAME', 'E2E_OWNER_PASSWORD'],
  workspaceAdmin: ['E2E_WORKSPACE_ADMIN_USERNAME', 'E2E_WORKSPACE_ADMIN_PASSWORD'],
  labelAuditor: ['E2E_LABEL_AUDITOR_USERNAME', 'E2E_LABEL_AUDITOR_PASSWORD'],
  frameAuditor: ['E2E_FRAME_AUDITOR_USERNAME', 'E2E_FRAME_AUDITOR_PASSWORD'],
  viewer: ['E2E_VIEWER_USERNAME', 'E2E_VIEWER_PASSWORD'],
};

export function actor(name: E2EActorName): E2EActor {
  const [usernameKey, passwordKey] = envKeys[name];
  const username = process.env[usernameKey];
  const password = process.env[passwordKey];
  if (!username || !password) {
    throw new Error(`E2E environment is missing ${!username ? usernameKey : passwordKey}. Credentials must be supplied through process environment variables.`);
  }
  return { username, password, workspaceName: process.env.E2E_WORKSPACE_NAME };
}

export async function loginAs(page: Page, name: E2EActorName, path = '/inventory/servers') {
  const credentials = actor(name);
  await page.goto(path);
  await page.locator('#login-username').fill(credentials.username);
  await page.locator('#login-password').fill(credentials.password);
  await page.locator('#login-submit').click();
  await expect(page.getByRole('link', { name: /servers/i })).toBeVisible({ timeout: 15_000 });

  const selector = page.locator('select[aria-label="Workspace"]');
  if (await selector.count()) {
    const desiredRole = name === 'owner' ? 'owner' : name === 'workspaceAdmin' ? 'admin' : name === 'systemAdmin' ? 'owner' : name === 'labelAuditor' || name === 'frameAuditor' ? 'auditor' : 'viewer';
    const sharedOption = selector.locator('optgroup[label="Shared with Me"] option').first();
    const shouldUseSharedWorkspace = name !== 'owner' && name !== 'systemAdmin';
    const sharedValue = shouldUseSharedWorkspace && await sharedOption.count()
      ? await sharedOption.getAttribute('value')
      : null;
    const value = sharedValue ?? await selector.locator('option').evaluateAll((options, role) => {
      const match = options.find(option => option.textContent?.trim().toLowerCase().endsWith(role));
      return match?.getAttribute('value') ?? null;
    }, desiredRole);
    if (value) await selectWorkspace(page, value);
  }
}

/** Re-assert the shared workspace after client-side route transitions. */
export async function selectWorkspace(page: Page, workspaceId: string) {
  const selector = page.locator('select[aria-label="Workspace"]');
  await expect(selector).toBeVisible();
  await selector.selectOption(workspaceId);
  await expect(selector).toHaveValue(workspaceId);
  await page.waitForLoadState('networkidle');
}
