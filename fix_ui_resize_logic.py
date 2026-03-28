import re

with open("src/components/RpgMode.tsx", "r") as f:
    content = f.read()

resize_logic = """      resizeMapData(newWidth: number, newHeight: number) {
        if (!this.mapData || newWidth < 10 || newHeight < 10) return;

        const oldW = this.mapData.width;
        const oldH = this.mapData.height;
        const oldTiles = this.mapData.tiles;
        const oldObjects = this.mapData.objects || [];

        const newTiles = new Array(newWidth * newHeight).fill(2); // Default to grass
        const newObjects = new Array(newWidth * newHeight).fill(-1); // Default empty

        for (let y = 0; y < Math.min(oldH, newHeight); y++) {
          for (let x = 0; x < Math.min(oldW, newWidth); x++) {
            const oldIdx = y * oldW + x;
            const newIdx = y * newWidth + x;
            newTiles[newIdx] = oldTiles[oldIdx];
            newObjects[newIdx] = oldObjects[oldIdx] !== undefined ? oldObjects[oldIdx] : -1;
          }
        }

        this.undoStack.push({
          tiles: [...this.mapData.tiles],
          objects: this.mapData.objects ? [...this.mapData.objects] : []
        });
        this.redoStack = [];

        this.mapData.width = newWidth;
        this.mapData.height = newHeight;
        this.mapData.tiles = newTiles;
        this.mapData.objects = newObjects;

        this.renderMap();
      }"""

content = content.replace("      async loadNewMap", resize_logic + "\n\n      async loadNewMap")

with open("src/components/RpgMode.tsx", "w") as f:
    f.write(content)
