# Summary: Map not updated in RPG play mode

**TID:** 581
**Date:** 20260402-1058

## User Prompt

- in map editor, i modify a map (such as id:main_200). But, i go back to RPG player mode, the map is not updated to modified version.
- when admin save the map in editor mode, it must notify all players and update the maps.

## Root Cause

1.  The `RpgMode.tsx` (RPG player mode) used the outdated `mapData.tiles` single-layer format while `RpgMapEditor.tsx` used the newer 6-layer format (`mapData.layers.base`, etc.). This means updates saved in the editor were silently ignored or failed to render in the player mode.
2.  The backend `save_map` API emitted a generic `map_updated` payload containing only `map_data`. The frontend didn't know *which* map was updated, leading to potential state mismatches if a player was viewing a different map than the one modified.

## Solution

1.  **Backend Socket Update:** Modified `backend/main.py` (`save_map` and `generate_map`) to emit a new socket event `map_updated_v2` containing both the `map_id` and the `map_data`. The old `map_updated` event is kept for legacy backwards compatibility.
2.  **RPG Mode Layers Upgrade:** Updated `src/components/RpgMode.tsx` to utilize the new 6-layer map architecture (`base`, `decorations`, `obstacles`, `objectCollides`, `objectEvent`, `topLayer`). Added an `upgradeMapData` helper method to ensure legacy maps without the `layers` property are seamlessly converted.
3.  **Synchronized Frontend Socket Hooks:** Refactored both `RpgMode.tsx` and `RpgMapEditor.tsx` to listen to the new `map_updated_v2` socket event. They now filter updates ensuring that they only re-render the map if the updated `map_id` matches the current scene's `currentMapId`. Backward compatibility for `map_updated` was preserved.
4.  **Fixed Missing Methods:** Corrected a `TypeError` in `RpgMapEditor.tsx` by adding the `upgradeMapData` method to its `MainScene` class.