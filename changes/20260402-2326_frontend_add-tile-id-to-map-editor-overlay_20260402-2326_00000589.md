# 20260402-2326_frontend_add-tile-id-to-map-editor-overlay_20260402-2326_00000589

## User Input
Objective:in map editor, print tiletype of current pos (x,y) in infoTextRef overlay
I would like to debug the targetVal of the positon which mouse pointed.
use getTileAt to get the targetVal
Task information:
- TID: 589
- CHANGE_PREFIX: 20260402-2326

## Original Branch Commit ID
N/A

## Root Cause
The `update` loop in `RpgMapEditor.tsx` calculated the `Col` and `Row` of the pointer's position in the map editor, but hardcoded the ID metadata in the overlay to `ID: ` without extracting the actual tile index from the Phaser map layers.

## Solution
Modified the `update` loop to dynamically determine the `x` and `y` block coordinates under the pointer. Mapped the `this.currentEditLayer` to the actual `Phaser.Tilemaps.TilemapLayer` object, and used `l.getTileAt(x, y)` to retrieve the tile. Extracted the tile's `index` property and successfully appended it to the `idText` string shown in the overlay.
