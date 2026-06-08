import { defineConfig, devices } from '@playwright/test';

const LIVE_URL  = 'https://jimbo.fourfoldmedia.uk';
const LOCAL_URL = 'http://localhost:4200';
const useLive   = !!process.env['PLAYWRIGHT_LIVE'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: useLive ? LIVE_URL : LOCAL_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Live-site inspection: authenticated via stored session cookie.
    // Cookie lives in playwright/.auth/session.json (gitignored).
    // Run with: PLAYWRIGHT_LIVE=1 npx playwright test
    {
      name: 'live',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: LIVE_URL,
        storageState: 'playwright/.auth/session.json',
      },
    },
  ],
  webServer: useLive ? undefined : {
    command: 'npx ng serve',
    url: LOCAL_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120000,
  },
});
