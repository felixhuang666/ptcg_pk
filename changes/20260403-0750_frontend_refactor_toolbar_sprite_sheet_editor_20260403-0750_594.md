# Summary: Refactor Toolbar in Sprite Sheet Editor

## Issue
The user requested a UI refactoring for the newly created Sprite Sheet Editor:
- Refactor the main toolbar to be two rows.
- Move the "Crop Selection & Add to Queue", scale inputs, apply, undo, and redo buttons from the right main image preview area into the new second row of the toolbar.

## Root Cause
N/A - UI Refactor request.

## Solution
1. **Toolbar Refactor**: Modified `SpriteSheetEditor.tsx` to wrap the toolbar area in a flex-col container.
2. **Top Row**: Kept the primary inputs (Tile Size, Output Name, Manual Crop, Offsets, Gaps, Load, Save) in the top row (`h-14` height) with a border separating the bottom row.
3. **Bottom Row**: Created a new `h-12` bottom row inside the toolbar container.
4. **Component Relocation**: Extracted the "Crop Selection", "Scale Raw" inputs, "Apply", "Undo", and "Redo" buttons (previously floating directly above the image in the main preview area) and moved them into the new bottom row of the toolbar. Also moved the "Zoom" text indicator into the bottom row.
5. **Preview Area Cleanup**: Removed the floating button container from the right-side main area, allowing the canvas to occupy the full space without obstructing floating UI elements.
6. Added defensive checks (`disabled={selectedRawImageIndex < 0 || ...}`) to the newly moved buttons since they are now always visible in the toolbar, even when no image is selected.