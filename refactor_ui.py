import re

with open("src/components/RpgMode.tsx", "r") as f:
    content = f.read()

# 1. We need to move logic from setupEditorUI (Phaser UI) to the React component.
# Instead of deleting setupEditorUI entirely, I will just remove the UI components from it and keep the keyboard handlers.
# Actually, the user asked to "move save map and other control key/button to tool bar".
# The keyboard shortcuts for selecting tiles can probably stay in Phaser as shortcuts, but let's expose setters so React can also change them.
# The user wants Tile Selector in the React toolbar.

old_setup_editor_ui = """      setupEditorUI() {
        this.add.rectangle(this.scale.width / 2, this.scale.height - 40, this.scale.width, 80, 0x333333).setScrollFactor(0).setDepth(10);

        this.tileSelector = this.add.text(20, this.scale.height - 50, 'Selected: Water (Press 1:Grass, 2:Water, 3:Mountain)', { color: '#ffffff', fontSize: '14px' }).setScrollFactor(0).setDepth(11);

        this.saveButton = this.add.text(this.scale.width - 120, this.scale.height - 55, '[ SAVE MAP ]', {
          color: '#00ff00',
          backgroundColor: '#004400',
          padding: { x: 10, y: 5 }
        }).setScrollFactor(0).setDepth(11).setInteractive({ useHandCursor: true });

        const undoBtn = this.add.text(this.scale.width - 250, this.scale.height - 55, 'UNDO', {
          color: '#ffffff', backgroundColor: '#555555', padding: { x: 8, y: 5 }
        }).setScrollFactor(0).setDepth(11).setInteractive({ useHandCursor: true });

        undoBtn.on('pointerdown', () => {
          if (this.undoStack.length > 0) {
            this.redoStack.push([...this.mapData.tiles]);
            this.mapData.tiles = this.undoStack.pop();
            this.renderMap();
          }
        });

        const redoBtn = this.add.text(this.scale.width - 180, this.scale.height - 55, 'REDO', {
          color: '#ffffff', backgroundColor: '#555555', padding: { x: 8, y: 5 }
        }).setScrollFactor(0).setDepth(11).setInteractive({ useHandCursor: true });

        redoBtn.on('pointerdown', () => {
          if (this.redoStack.length > 0) {
            this.undoStack.push([...this.mapData.tiles]);
            this.mapData.tiles = this.redoStack.pop();
            this.renderMap();
          }
        });

        this.saveButton.on('pointerdown', async () => {
          this.saveButton!.setText('SAVING...');
          try {
            await fetch('/api/map', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(this.mapData)
            });
            this.saveButton!.setText('[ SAVED! ]');
            setTimeout(() => this.saveButton!.setText('[ SAVE MAP ]'), 2000);
            if (onMapSaved) onMapSaved();
          } catch (err) {
            console.error('Save failed', err);
            this.saveButton!.setText('[ ERROR ]');
          }
        });

        this.input.keyboard!.on('keydown-ONE', () => { this.currentTileType = 2; this.updateSelectorText(); });
        this.input.keyboard!.on('keydown-TWO', () => { this.currentTileType = 48; this.updateSelectorText(); });
        this.input.keyboard!.on('keydown-THREE', () => { this.currentTileType = 94; this.updateSelectorText(); });
      }

      updateSelectorText() {
        let name = 'Unknown';
        if (this.currentTileType === 2) name = 'Grass';
        if (this.currentTileType === 48) name = 'Water';
        if (this.currentTileType === 94) name = 'Mountain';
        this.tileSelector?.setText(`Selected: ${name} (Press 1:Grass, 2:Water, 3:Mountain)`);
      }"""

new_setup_editor_ui = """      setupEditorUI() {
        // UI rendering moved to React layer. Keyboard shortcuts kept.
        this.input.keyboard!.on('keydown-ONE', () => {
          this.currentTileType = 2;
          const scene = (window as any).__PHASER_MAIN_SCENE__;
          if (scene && scene.onTileTypeChanged) scene.onTileTypeChanged(2);
        });
        this.input.keyboard!.on('keydown-TWO', () => {
          this.currentTileType = 48;
          const scene = (window as any).__PHASER_MAIN_SCENE__;
          if (scene && scene.onTileTypeChanged) scene.onTileTypeChanged(48);
        });
        this.input.keyboard!.on('keydown-THREE', () => {
          this.currentTileType = 94;
          const scene = (window as any).__PHASER_MAIN_SCENE__;
          if (scene && scene.onTileTypeChanged) scene.onTileTypeChanged(94);
        });
      }

      performUndo() {
        if (this.undoStack.length > 0) {
          this.redoStack.push([...this.mapData.tiles]);
          this.mapData.tiles = this.undoStack.pop();
          this.renderMap();
        }
      }

      performRedo() {
        if (this.redoStack.length > 0) {
          this.undoStack.push([...this.mapData.tiles]);
          this.mapData.tiles = this.redoStack.pop();
          this.renderMap();
        }
      }"""

if old_setup_editor_ui in content:
    content = content.replace(old_setup_editor_ui, new_setup_editor_ui)
else:
    print("WARNING: Could not find old_setup_editor_ui to replace!")

with open("src/components/RpgMode.tsx", "w") as f:
    f.write(content)
