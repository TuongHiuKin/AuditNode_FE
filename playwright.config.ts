import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_FRONTEND_URL ?? (process.env.E2E_EXTERNAL_STACK === '1' ? 'http://localhost:15173' : 'http://localhost:5173');
const stagingBaseURL = process.env.E2E_STAGING_FRONTEND_URL ?? baseURL;
const productionBaseURL = process.env.E2E_PRODUCTION_FRONTEND_URL ?? baseURL;
const desktopChrome = { ...devices['Desktop Chrome'] };
const remoteTarget = process.env.E2E_EXTERNAL_STACK === '1'
  || process.env.E2E_SKIP_WEBSERVER === '1'
  || !!process.env.E2E_STAGING_FRONTEND_URL
  || !!process.env.E2E_PRODUCTION_FRONTEND_URL;

export default defineConfig({
  testDir: './e2e',
  /* Maximum time one test can run for. */
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Stateful full-stack tests fail visibly; only remote smoke retries transient transport once. */
  retries: 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI || process.env.E2E_EXTERNAL_STACK === '1' ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [['line'], ['junit', { outputFile: 'artifacts/playwright-junit.xml' }], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    ignoreHTTPSErrors: false,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'fullstack',
      testMatch: 'fullstack/**/*.spec.ts',
      use: desktopChrome,
    },
    {
      name: 'mocked',
      testMatch: 'mocked/**/*.spec.ts',
      use: desktopChrome,
    },
    {
      name: 'smoke-staging',
      testMatch: 'smoke/staging.spec.ts',
      retries: process.env.CI ? 1 : 0,
      use: { ...desktopChrome, baseURL: stagingBaseURL },
    },
    {
      name: 'smoke-production',
      testMatch: 'smoke/production.spec.ts',
      retries: process.env.CI ? 1 : 0,
      use: { ...desktopChrome, baseURL: productionBaseURL },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: remoteTarget ? undefined : {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
