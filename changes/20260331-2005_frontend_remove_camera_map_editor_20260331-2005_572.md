# Issue Summary: Remove camera support in map editor

## Prompt
Objective:remove camera support in map editor

camera is not necessary for map editor
remove camera related implementation in map editor

**Task information:
- TID: 572
- CHANGE_PREFIX: 20260331-2005
** Additional Instructions:** (ver 1.3.0)
- You don't need to ask me to review your design. Just proceed it, I will do final review when you submit the PR.

## Original Branch Commit ID
43bd687c5b90259dc6f116578f4fa2ebc2c3ff04

## Root Cause
The `RpgMapEditor.tsx` code contained camera zoom code (wheel events, pinch zooming with multi-touch, zoom indicator on the UI overlay) that was not necessary for map editing, as requested by the user.

## Solution
Removed camera support from the map editor. Removed `input.on('wheel')` handler. Removed `initialZoomDistance` and `initialZoom` states from the pointerdown/move/up event handlers related to pinch-to-zoom. Adjusted panning offsets in pointermove handling inside `editorMode === 'move'` to not depend on zoom factor. Adjusted `camSpeed` in the `update` loop to ignore zoom factor when navigating with arrow keys. Changed the overlay text info to exclude the zoom indicator when inside the editor mode. Tested changes via local playwright integration test and unit tests.