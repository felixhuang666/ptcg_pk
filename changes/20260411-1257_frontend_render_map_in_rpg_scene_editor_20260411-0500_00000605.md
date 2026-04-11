# 20260411-1257_frontend_render_map_in_rpg_scene_editor_20260411-0500_00000605

## Summary
Render the map inside the RPG Scene Editor.

## Issue Info
- TID: 605
- CHANGE_PREFIX: 20260411-1257

## User Prompt
Objective: render the map in rpg scene editor
in rpg scene editor, when design draw the map to the scene's canvas, should render the map.

## Root Cause
The `SceneEditorPhaser` in `src/components/RpgSceneEditor.tsx` was only rendering a transparent green rectangle with a label (`map_id`) to represent map bounds in the scene editor, ignoring the actual tilemap contents and textures.

## Solution
1. Updated `PhaserGameComponent` to pass `mapsList` from React state down to the `SceneEditorPhaser` via `updateSceneData`.
2. Inside `updateSceneData`, we now gather all unique `tilesets` metadata across all maps in the current scene to preload missing textures into the `Phaser.Textures.TextureManager`.
3. Once textures are loaded, we iterate over the placed maps, dynamically retrieve their `map_data` from `mapsList`, and construct a `Phaser.Tilemaps.Tilemap` container.
4. The 6 map layers (`base`, `decorations`, `obstacles`, `objectCollides`, `objectEvent`, `topLayer`) are instantiated and attached to a movable `Phaser.GameObjects.Container`.
5. The container moves seamlessly with the visual interactable bounding rectangle, rendering the true map visuals inside the global RPG Scene layout editor.
