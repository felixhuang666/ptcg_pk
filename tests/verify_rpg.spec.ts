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
  await page.goto('http://127.0.0.1:5000');

  // Login as tester
  await page.goto('http://127.0.0.1:5000/auth/dev_login');

  // Wait for RPG mode button and click it
  await page.waitForSelector('text=RPG 模式', { timeout: 15000 });
  await page.click('text=RPG 模式');

  // Dismiss fullscreen prompt if it appears
  try {
    await page.waitForSelector('text=進入全螢幕模式', { timeout: 5000 });
    await page.click('text=稍後再說');
  } catch (e) {
    // Prompt didn't appear, continue
  }

  // Verify Play mode renders
  const canvas = await page.waitForSelector('canvas', { timeout: 10000 });
  expect(canvas).not.toBeNull();

  // Switch to Map Editor
  await page.waitForSelector('button[title="設定"]', { timeout: 10000 });
  await page.click('button[title="設定"]');
  // Handle potentially multiple "地圖編輯" texts by selecting the button specifically
  await page.click('button:has-text("地圖編輯")');

  // Verify Map Editor renders
  // RpgMapEditor also uses a canvas
  await page.waitForSelector('canvas', { timeout: 10000 });

  // Check for the specific ReferenceError or any other console errors
  const currentMapIdError = consoleErrors.find(err => err.includes('currentMapId is not defined'));
  expect(currentMapIdError).toBeUndefined();

  // Filter out common ignorable environmental errors
  const relevantErrors = consoleErrors.filter(err =>
    !err.includes('failed to load resource') &&
    !err.includes('404') &&
    !err.includes('Failed to fetch')
    //&& !err.includes('Error checking auth')
    //&& !err.includes('WebSocket connection')
    //&& !err.includes('failed to connect to websocket')
    //&& !err.includes('Failed to process file:')
  );
  expect(relevantErrors).toEqual([]);
});
