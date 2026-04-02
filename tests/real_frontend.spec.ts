import { test, expect } from '@playwright/test';

test('verify real frontend via dev login', async ({ page }) => {
  // Go to main page, which is unauthenticated
  await page.goto('http://localhost:5000');

  // Wait for login options
  await page.waitForSelector('text=Google 登入', { timeout: 10000 });

  // Click dev login (Tester)
  // Workaround since "Login as tester" may be hidden by env vars during generic tests
  await page.goto('http://localhost:5000/auth/dev_login');

  // We should be redirected back and load the authenticated App
  await page.waitForSelector('text=RPG 模式', { timeout: 15000 });

  // Click RPG mode
  await page.click('text=RPG 模式');

  // Ensure the RPG scene is rendered
  // A canvas element should appear
  const canvas = await page.waitForSelector('canvas', { timeout: 10000 });
  expect(canvas).not.toBeNull();

  // Test completed successfully
});
