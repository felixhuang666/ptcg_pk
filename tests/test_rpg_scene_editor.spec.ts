import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('RPG Scene Editor - Import/Export Scene', async ({ page }) => {
  // Navigate to dev login
  await page.goto('http://localhost:5000/auth/dev_login');
  await page.waitForTimeout(1000);

  await page.goto('http://localhost:5000/');
  await page.waitForSelector('text=場景編輯器');
  await page.click('text=場景編輯器');

  await page.waitForSelector('h2:has-text("RPG場景編輯器")');

  // Create a new scene to make sure sceneData is not null
  page.once('dialog', async dialog => {
      if (dialog.type() === 'prompt') {
          await dialog.accept('Test Scene');
      } else {
          await dialog.accept();
      }
  });
  await page.click('button[title="New Scene"]');
  await page.waitForTimeout(1000);

  // Create dummy test file for import
  const dummySceneData = {
      name: "Test Imported Scene",
      map_list: [
          {
              map_id: "test_map_999",
              map_size: { width: 10, height: 10 },
              offset_position: { x: 5, y: 5 }
          }
      ],
      scene_entities: {}
  };
  const dummyFilePath = path.resolve('tmp/dummy_scene.json');
  fs.mkdirSync(path.resolve('tmp'), { recursive: true });
  fs.writeFileSync(dummyFilePath, JSON.stringify(dummySceneData));

  // Upload the file
  await page.setInputFiles('input[type="file"][accept=".json"]', dummyFilePath);

  // Wait a bit for the import to process and the canvas to update
  await page.waitForTimeout(1000);

  // Test Export - setting up the listener first
  const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
  await page.click('button[title="Export Scene"]');
  const download = await downloadPromise;

  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();

  if (downloadPath) {
      const fileContent = fs.readFileSync(downloadPath, 'utf8');
      const exportedData = JSON.parse(fileContent);
      expect(exportedData.map_list[0].map_id).toBe("test_map_999");
  }
});
