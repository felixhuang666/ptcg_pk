# Summary: Enhance Sprite Sheet Editor

## Issue
The user requested several advanced features for the previously created Sprite Sheet Editor:
- Manual crop mode (move crop rect by mouse or keyboard).
- Hotkey "c" for crop selection.
- Offset X/Y and Gap X/Y support for calculating crop coordinates.
- Grid line toggle.
- Zoom in/out via mouse scroll wheel.
- Scale down/up for the raw image width and height, with undo/redo history.
- Reordering the sequence in the output queue via drag and drop.

## Root Cause
N/A - This is a feature request.

## Solution
1. **Design Docs:** Updated `docs/rpg_sprite_sheet_editor_design.md` with the new requirements.
2. **State & UI:** Added state hooks and toolbar UI elements for manual crop checkbox, offset/gap inputs, grid toggle, and zoom. Added width/height inputs, Apply, Undo, and Redo buttons in the preview area when a raw image is selected.
3. **Zoom & Grid Overlay:** Added `onWheel` event handler on the preview container to modify the CSS transform scale for zoom. Added an absolute-positioned div that uses CSS gradients to draw a grid over the image when `showGrid` is true, reflecting offsets and gaps.
4. **Cropping Logic & Hotkeys:**
   - Updated `handleMouseDown` and `handleMouseMove` to calculate grid snap points using `gapX` and `gapY`, and shifted by `offsetX` and `offsetY`. They also skip snapping if `manualCrop` is true.
   - Added a `useEffect` to listen to keyboard events on the `window`. Pressing arrow keys shifts the `cropPos` (by 1px in manual mode, or by `tileW/H + gap` in grid mode). Pressing "c" calls `cropTile()`.
5. **Image Scaling & History:** Updated the `rawImages` state from `{ dataUrl: string }` to `{ history: string[], currentIndex: number }`. Added `handleScaleRawImage` to draw the image to a new canvas at the chosen scale and push the new dataURL onto the history stack. Undo/Redo buttons simply decrement/increment the `currentIndex`.
6. **Drag & Drop Reordering:** Added `draggable={true}`, `onDragStart`, `onDragEnd`, `onDragOver`, and `onDrop` handlers to the mapped items in the `OUTPUT` tab. The drop handler splices the array to reorder the tiles.