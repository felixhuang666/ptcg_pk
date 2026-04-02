class SceneEditorPhaser extends Phaser.Scene {
  constructor() {
    super({ key: 'SceneEditorPhaser' });
  }

  create() {
    // Basic setup
    this.cameras.main.setBackgroundColor('#1a1a1a');

    // Grid
    const gridSize = 32;
    const grid = this.add.grid(0, 0, 8000, 8000, gridSize, gridSize, 0x000000, 0, 0xffffff, 0.1);

    // Zoom and Pan
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
      let newZoom = this.cameras.main.zoom - (deltaY * 0.001);
      newZoom = Phaser.Math.Clamp(newZoom, 0.1, 2);
      this.cameras.main.setZoom(newZoom);
    });

    this.input.on('pointermove', (pointer) => {
      if (!pointer.isDown) return;
      if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SPACE'), 0)) {
        this.cameras.main.scrollX -= pointer.position.x - pointer.prevPosition.x;
        this.cameras.main.scrollY -= pointer.position.y - pointer.prevPosition.y;
      }
    });
  }
}
