import { test, expect } from '@playwright/test';

test('verify RPG mode and Map Editor rendering', async ({ page }) => {
  // Catch console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Go to main page
  await page.goto('http://localhost:5000');

  // Login as tester
  await page.goto('http://localhost:5000/auth/dev_login');

  // Wait for RPG mode button and click it
  await page.waitForSelector('text=RPG 模式', { timeout: 15000 });
  await page.click('text=RPG 模式');

  // Verify Play mode renders
  const canvas = await page.waitForSelector('canvas', { timeout: 10000 });
  expect(canvas).not.toBeNull();

  // Switch to Map Editor
  await page.waitForSelector('button[title="設定"]', { timeout: 10000 });
  await page.click('button[title="設定"]');
  await page.click('text=地圖編輯');

  // Verify Map Editor renders
  // RpgMapEditor also uses a canvas
  await page.waitForSelector('canvas', { timeout: 10000 });

  // Check for the specific ReferenceError or any other console errors
  const currentMapIdError = consoleErrors.find(err => err.includes('currentMapId is not defined'));
  expect(currentMapIdError).toBeUndefined();

  // Filter out some common ignorable errors if necessary
  const relevantErrors = consoleErrors.filter(err => !err.includes('failed to load resource') && !err.includes('404'));
  expect(relevantErrors).toEqual([]);
});
