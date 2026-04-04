# Refactor Map Editor, Scene Editor, Sprite Sheet Editor for Multiple Tilesets Support

## Issue Information
- **TID:** 599
- **CHANGE_PREFIX:** 20260404-1152
- **Date/Time:** 20260404-1152
- **Major Category:** frontend

## User Prompt
Objective:refact map editor, scene editor, Sprite Sheet Editor

- study tileset in phaser.js, espically in handle local multiple tileset for a map.
- study https://gemini.google.com/share/17525cf4c8a9

- a scene is associated with a map; one map will include multiple tilesets and a map meta json to describe GID and tileset's png files.
- the map edioto can add one/multiple tilesets (detect tileset property json files) and allocate first GID of imported tilesets.
   * when render the tile, should use GID.

- when Sprite Sheet Editor generate the json file, i will call it as tileset property json to distingulish it with map meta json.
- refactor map editor, Sprite Sheet Editor to meet design changes
- refactor rpg play mode for map rendering.

## Original Branch Commit ID
(Implicit in current branch head prior to this PR)

## Root Cause
The legacy map editor and RPG mode rendering logic were hardcoded to support only a single global tileset (`(window as any).__ACTIVE_TILESET__`). This prevented users from designing maps with varied assets from multiple tilesets. The system lacked an overarching `map_meta` configuration to track multiple imported tilesets, their image sources, and their corresponding Global IDs (GIDs) necessary for correct rendering across different files. Furthermore, terminology in the Sprite Sheet Editor output was not aligned with the new "Tileset Property JSON" specification.

## Solution
1.  **Sprite Sheet Editor UI:** Updated labels to refer to output correctly as "Tileset Property JSON".
2.  **Backend (`main.py`):** Injected default `map_meta` definitions into `in_memory_maps` and dynamically generated maps to structure `firstgid`, `name`, `image_source`, and grid dimensions.
3.  **Map Editor (`RpgMapEditor.tsx`):**
    *   Removed `__ACTIVE_TILESET__` global dependency.
    *   Implemented local React state (`activeTilesetIndex`) and an "Available Tilesets" sidebar panel to browse and import tileset JSON files.
    *   Added logic to push newly added tilesets into the map's `map_meta.tilesets`, automatically calculating and allocating subsequent `firstgid`s sequentially based on previous tileset sizes.
    *   Modified the UI palette click handler to offset the selected `local_id` by the active tileset's `firstgid`, resulting in a correct global `currentTileType` for painting.
4.  **Phaser Rendering Logic (`RpgMapEditor.tsx` & `RpgMode.tsx`):**
    *   Dynamically loop through `map_meta.tilesets` to load all required images during `preload()`.
    *   Map loaded images to `Phaser.Tilemaps.Tileset` instances utilizing `addTilesetImage` combined with the explicit `firstgid` in `create()`.
    *   Updated `createBlankLayer` to accept the array of all registered tilesets instead of a single instance, allowing Phaser to seamlessly resolve GIDs natively.
5.  **Clean up:** Removed temporary playwright files and `puppeteer` dependency that were created for testing during the task but were incorrectly committed.