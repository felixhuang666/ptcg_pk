import { test, expect } from '@playwright/test';

test('phaser collision test', async ({ page }) => {
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
        <script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.js"></script>
    </head>
    <body>
        <script>
            const config = {
                type: Phaser.HEADLESS,
                width: 800,
                height: 600,
                physics: {
                    default: 'arcade',
                },
                scene: {
                    create: function() {
                        const tilemap = this.make.tilemap({ width: 10, height: 10, tileWidth: 32, tileHeight: 32 });
                        const l = tilemap.createBlankLayer('layer1', [], 0, 0);
                        const player = this.physics.add.sprite(100, 100, 'player');
                        this.physics.add.collider(player, l);
                        console.log("createBlankLayer returned:", l);

                        setTimeout(() => {
                            console.log("Destroying tilemap");
                            tilemap.destroy();
                            console.log("l.tilemap:", l.tilemap);
                        }, 500);
                    },
                    update: function() {
                    }
                }
            };
            const game = new Phaser.Game(config);
        </script>
    </body>
    </html>
  `);

  await page.waitForTimeout(2000);
});
