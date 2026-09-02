import { expect, type Page } from '@playwright/test';

export type E2EActorName = 'systemAdmin' | 'owner' | 'managedUser' | 'editor' | 'secondOwner' | 'viewer';

export interface E2EActor {
  username: string;
  password: string;
}

const envKeys: Record<E2EActorName, [string, string]> = {
  systemAdmin: ['E2E_SYSTEM_ADMIN_USERNAME', 'E2E_SYSTEM_ADMIN_PASSWORD'],
  owner: ['E2E_OWNER_USERNAME', 'E2E_OWNER_PASSWORD'],
  managedUser: ['E2E_WORKSPACE_ADMIN_USERNAME', 'E2E_WORKSPACE_ADMIN_PASSWORD'],
  editor: ['E2E_LABEL_AUDITOR_USERNAME', 'E2E_LABEL_AUDITOR_PASSWORD'],
  secondOwner: ['E2E_FRAME_AUDITOR_USERNAME', 'E2E_FRAME_AUDITOR_PASSWORD'],
  viewer: ['E2E_VIEWER_USERNAME', 'E2E_VIEWER_PASSWORD'],
};

export function actor(name: E2EActorName): E2EActor {
  const [usernameKey, passwordKey] = envKeys[name];
  const username = process.env[usernameKey];
  const password = process.env[passwordKey];
  if (!username || !password) {
    throw new Error(`E2E environment is missing ${!username ? usernameKey : passwordKey}. Credentials must be supplied through process environment variables.`);
  }
  return { username, password };
}

export async function loginAs(page: Page, name: E2EActorName, path = '/inventory/servers') {
  const credentials = actor(name);
  await page.goto(path);
  await page.locator('#login-username').fill(credentials.username);
  await page.locator('#login-password').fill(credentials.password);
  await page.locator('#login-submit').click();
  await expect(page.getByRole('link', { name: /servers/i })).toBeVisible({ timeout: 15_000 });
}
