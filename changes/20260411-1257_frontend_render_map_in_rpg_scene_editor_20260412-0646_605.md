# Summary of Changes

## User Request
Objective: render the map in rpg scene editor. In rpg scene editor, when design draw the map to the scene's canvas, should render the map.

## Original Commit
N/A

## Root Cause
The `RpgSceneEditor` and its `SceneEditorPhaser` instance were previously rendering placeholder transparent green rectangles to represent maps added to the scene canvas instead of actually loading the full map tile data and generating the visuals using Phaser's tilemap system.

## Solution
1. Modified the frontend `/api/maps` endpoint call in `backend/main.py` and `RpgSceneEditor.tsx` to ensure that full map details (including `map_data` and tilesets) are loaded and passed down to the Phaser scene.
2. Updated `SceneEditorPhaser.updateSceneData()` in `src/components/RpgSceneEditor.tsx` to:
    - Receive `mapsList` alongside the basic `sceneData`.
    - Iterate over the placed maps in the scene, extracting tileset metadata.
    - Dynamically preload missing tileset images (`this.load.image`) and wait for completion before rendering.
    - Instantiate `Phaser.Tilemaps.Tilemap` for each map.
    - Reconstruct and position the map layers (`base`, `decorations`, etc.) based on the 1D tile arrays provided by the map data.
3. Nested the generated tilemap layers inside a `Phaser.GameObjects.Container` to ensure that dragging the map moves the visual tiles natively.
