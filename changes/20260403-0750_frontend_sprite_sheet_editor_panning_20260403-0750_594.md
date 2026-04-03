# Summary: Enhance Sprite Sheet Editor Panning

## Issue
The user requested the ability to pan the raw image preview area using the right mouse button, particularly useful after zooming in/out.

## Root Cause
N/A - This is a feature request.

## Solution
1. **State:** Added `pan` (x,y coordinate object), `isPanning` (boolean), and `panStart` (x,y coordinate object) states to `SpriteSheetEditor.tsx`.
2. **Event Handlers:**
   - Modified `handleMouseDown` to intercept right clicks (`e.button === 2`). If a right click is detected, it enters `isPanning` mode and calculates the starting offset.
   - Modified `handleMouseMove` to update the `pan` coordinates based on the current mouse position minus the starting offset when `isPanning` is true.
   - Modified `handleMouseUp` and created `handleMouseLeave` to stop dragging or panning gracefully.
   - Added `onContextMenu={(e) => e.preventDefault()}` to the preview container to disable the default browser right-click menu, allowing the custom panning behavior to take precedence.
3. **Rendering:** Wrapped the preview image and its grid overlays inside an `absolute` positioned div and applied an inline `transform: translate(${pan.x}px, ${pan.y}px)` to visually shift the entire canvas group. Swapped the container overflow from `overflow-auto` to `overflow-hidden` so panning behavior replaces native scrollbars.