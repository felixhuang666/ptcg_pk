# Summary: Sprite Sheet Editor Viewport Reset

## Issue
When a user scales a raw image up or down, or undoes/redoes a scaling operation, the image size changes. If the user was previously zoomed in or panned far away from the origin `(0,0)`, scaling the image might cause it to disappear from the viewport, leaving the user confused and unable to see the image.

## Root Cause
The `zoom` and `pan` coordinate states were persistent across scaling actions and not being reset, preserving the previous viewport context which was no longer relevant for the newly sized image.

## Solution
1. **Reset on Scale Action:** Updated `handleScaleRawImage` in `src/components/SpriteSheetEditor.tsx` to explicitly call `setZoom(1)` and `setPan({ x: 0, y: 0 })` after appending a new scaled image to the history stack.
2. **Reset on History Navigation:** Updated the `onClick` logic for the Undo and Redo scaling buttons to also call `setZoom(1)` and `setPan({ x: 0, y: 0 })` when navigating to a different index in the `rawImages` history stack.
3. **Reset on Image Selection:** Updated the `onClick` handler when a user selects a different raw image from the `rawImages` queue in the left sidebar to call `setZoom(1)` and `setPan({ x: 0, y: 0 })` so new images always start centered at 100% scale.
4. **Documentation Update:** Updated `docs/rpg_sprite_sheet_editor_design.md` to note this behavior.