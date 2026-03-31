import { test, expect } from '@playwright/test';

test('verify drawing map block without offset', async ({ page }) => {
  await page.route('**/api/auth/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authenticated: true,
        user: { id: 'test_user', name: 'Test User', email: 'test@example.com' },
        roles: ['admin'],
        profile: { nickname: 'Tester' }
      })
    });
  });

  await page.context().addCookies([
    { name: 'session_id', value: 'mock_session', domain: 'localhost', path: '/' }
  ]);

  await page.goto('http://localhost:5000');

  await page.waitForTimeout(1000);

  // force inject fullscreen mock bypass
  await page.evaluate(() => {
    (window as any).matchMedia = () => ({ matches: true });
    (document as any).fullscreenEnabled = true;
    (document.documentElement as any).requestFullscreen = async () => {};
  });

  // Click RPG Mode in App menu
  await page.waitForSelector('text=RPG', { timeout: 10000 });
  await page.click('text=RPG');

  // We are in RPG Mode. Wait for map rendering
  await page.waitForTimeout(1000);

  // Try to bypass fullscreen modal if it appears
  try {
    const fsBtn = await page.$('button:has-text("進入全螢幕")');
    if (fsBtn) await fsBtn.click();
  } catch(e) {}

  // click settings button
  const settingsButtons = await page.$$('button[title="設定"]');
  if (settingsButtons.length > 0) {
    await settingsButtons[0].click({ force: true });
  }

  // Click Map Edit mode
  await page.waitForSelector('text=地圖編輯', { timeout: 10000 });
  await page.click('text=地圖編輯', { force: true });

  // Wait for RpgMapEditor component
  await page.waitForSelector('text=Tilesets', { timeout: 10000 });

  const getTileData = await page.evaluate(async () => {
    await new Promise(r => setTimeout(r, 2000));
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (!scene) return { error: 'No scene' };

    scene.currentTileType = 1; // 1-based, matches JSON
    scene.editorMode = 'draw';
    scene.currentEditLayer = 'ground';

    const tileX = Math.floor(150/32);
    const tileY = Math.floor(150/32);
    const index = tileY * scene.mapData.width + tileX;

    scene.input.emit('pointerdown', {
      x: 150, y: 150,
      middleButtonDown: () => false,
      rightButtonDown: () => false
    });

    const tileVal = scene.mapData.tiles[index];
    const layerTile = scene.layer.getTileAtWorldXY(150, 150, true);

    return {
      currentTileType: scene.currentTileType,
      arrayVal: tileVal,
      layerTileIndex: layerTile ? layerTile.index : -1
    };
  });

  console.log('Result:', getTileData);
  expect(getTileData.arrayVal).toBe(1);
  expect(getTileData.layerTileIndex).toBe(1);
});
