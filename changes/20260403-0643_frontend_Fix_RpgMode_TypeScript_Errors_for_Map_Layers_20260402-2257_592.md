# Summary: Fix RpgMode TypeScript Errors for Map Layers

## Context
- **TID**: 592
- **Branch/Commit ID**: (current branch state)
- **User Prompt**: Fix TypeScript errors in `src/components/RpgMode.tsx` related to `currentEditLayer` comparison, `this.layer`, and `this.objectLayer`.

## Root Cause
The `RpgMode.tsx` file had an incomplete refactor for the map layer structure. Previously, the map editing structure differentiated only between `ground` and `objects`, using corresponding missing Phaser layer variables like `this.layer` and `this.objectLayer`. The new architecture supports 6 layers (`base`, `decorations`, `obstacles`, `objectCollides`, `objectEvent`, `topLayer`). The `handlePointerDown` function was still executing legacy condition branches referring to the old properties, leading to TypeScript compilation errors. In addition, the undo-redo stack logic was still configured to push `tiles` and `objects` instead of copying the `layers` map object.

## Solution
1. **Fix `undoStack` Population:** Modified `pointerdown` logic around line 313 to perform a shallow copy of each array located in `this.mapData.layers` instead of storing the deprecated `tiles` and `objects` properties.
2. **Update Map Update Logic:** Replaced the legacy `if (this.currentEditLayer === 'ground')` block inside `handlePointerDown` with logic that dynamically modifies the selected layer's tile array using `this.mapData.layers[this.currentEditLayer][index] = targetVal`.
3. **Map to Correct Phaser Layers:** Implemented a switch block inside `handlePointerDown` mapping the value of `this.currentEditLayer` directly to the corresponding `Phaser.Tilemaps.TilemapLayer` instance (e.g., `this.baseLayer`, `this.decorationsLayer`, etc.), so the live scene updates correctly.
