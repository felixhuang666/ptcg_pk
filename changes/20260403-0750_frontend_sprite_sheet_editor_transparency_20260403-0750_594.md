# Summary: Add Color Picker and Transparency to Sprite Sheet Editor

## Issue
The user requested the ability to pick a specific color from the raw image and set it to transparent. The requirements included:
- A color detector (eyedropper) button with hotkey 'd' to pick a color from the image via mouse click.
- A standard color picker input in the toolbar.
- A "set-transparent" button with hotkey 't' to process the entire raw image, replacing the selected color with transparency.

## Root Cause
N/A - Feature request.

## Solution
1. **Design Docs:** Updated `docs/rpg_sprite_sheet_editor_design.md` with the new color picker and transparency requirements.
2. **State:** Added `transparentColor` (stores hex color) and `isColorPicking` (boolean for eyedropper mode) to `SpriteSheetEditor.tsx`.
3. **Eyedropper Logic (`isColorPicking`):**
   - Updated `handleMouseDown` to intercept left-clicks when `isColorPicking` is true.
   - It draws the current raw image to an offscreen canvas and uses `ctx.getImageData()` to read the exact RGB pixel data at the mouse coordinates (adjusted for zoom and rect bounds).
   - Converts the RGB pixel data to a Hex string and updates `transparentColor`, then toggles off picking mode.
4. **Transparency Logic (`handleMakeTransparent`):**
   - Iterates over every pixel of the current raw image data via an offscreen canvas.
   - Compares each pixel's RGB to the selected `transparentColor` with a small tolerance (+/- 5) to account for minor compression artifacts.
   - Sets the Alpha channel (index + 3) to `0` for matching pixels.
   - Generates a new Data URL and pushes it onto the `rawImages` history stack, automatically integrating with the existing Undo/Redo logic.
5. **Toolbar & Keyboard:** Added the UI elements to the bottom toolbar row. Bound the 'd' key to toggle picking mode and the 't' key to trigger the transparency fill.