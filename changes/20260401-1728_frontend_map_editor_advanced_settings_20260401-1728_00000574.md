# Task Summary

## Input Prompt
enhance UI for map editor:
- remove camera support in map editor; no need to show camer information in the map editor's canvas
- add "advanced setting" icon button in tool bar for advance settings; when click the "advanced setting" icon button, show a div frame to provide below settings:
  * rename map
  * map resize
  * block size information
- move rename map UI components to "advanced settings"
- move map resize UI components to "advanced settings"
- move block size information UI components to "advanced settings"

## Original Branch Commit ID
7fba44db

## Root Cause
The map editor toolbar was cluttered with many different settings (Rename, Map Resize, Block Size) and the camera coordinates in the canvas display were requested to be removed to clear up the debug text.

## Solution
1. Modified `src/components/RpgMapEditor.tsx` to remove the `Cam: ...` coordinates from the information text overlay, which simplifies the map info overlay while retaining mouse coordinates.
2. Added an "Advanced Settings" gear icon (`Settings` from `lucide-react`) to the toolbar.
3. Created a new state variable `showAdvancedSettings` to track the open/closed state of the new dropdown div.
4. Moved the UI controls for Renaming the Map, Resizing the Map, and setting Block Size Information out of the main toolbar flow and into a new absolutely-positioned div that toggles when clicking the Advanced Settings icon. This cleans up the top bar dramatically.
