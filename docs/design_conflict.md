# Design Conflicts & Resolutions

This document tracks identified conflicts between original design specifications and the actual implementation within the codebase, along with notes on how they are (or should be) resolved.

## 1. Map Layer Architecture Evolution
*   **Conflict**: The original `RpgMapEditor` design only defined two layers: a "Ground" layer (`tiles`) and an "Object" layer (`objects`). However, the implementation has since evolved to utilize a comprehensive 6-layer architecture (`base`, `decorations`, `obstacles`, `objectCollides`, `objectEvent`, `topLayer`).
*   **Resolution**: Documentation across `docs/rpg_map_editor_design.md` and `docs/rpg_mode_design.md` has been updated to reflect the new 6-layer standard.

## 2. Hardcoded Tiles vs. Dynamic Tilesets (Resolved)
*   **Conflict**: Early implementations of the map editor and RPG mode used hardcoded tile index assumptions (e.g., `2` for grass, `48` for water, `94` for mountain). The new system dynamically loads tileset metadata from `/api/map/tilesets` and maps index values to whatever tileset is currently active.
*   **Resolution**: Hardcoded visual tile references have been completely removed. The system now strictly relies on dynamic loading, with the only hardcoded exception being `id=0` to represent an "empty" tile. The frontend fetches the `__ACTIVE_TILESET__` global object and calculates tile source positions based on dynamic rows/columns and IDs.

## 3. Tile Index Base (0-based vs 1-based)
*   **Conflict**: There is inconsistency regarding whether tile IDs are 0-based or 1-based.
    *   Tileset JSON metadata uses 1-based IDs (e.g., `id: 1` is the first tile).
    *   Phaser's `putTileAt` traditionally expects 0-based indexing for calculations but sometimes 1-based depending on how the tileset was added.
    *   The current `renderMap` method in `RpgMapEditor.tsx` has code indicating confusion: `l.putTileAt(name === 'base' || name === 'decorations' || name === 'topLayer' ? val : val, x, y);`. Note that previously it attempted `val + 1`.
*   **Resolution**: This remains an active technical debt item. The frontend seems to currently work around it by injecting 1-based IDs directly into the map JSON `layers` arrays and using those exact values in Phaser. However, a formal unification of the index baseline is required (See `docs/design_todo.md`).

## 4. RPG Scene Editor Feature Scope
*   **Conflict**: `docs/rpg_scene_design.md` describes a comprehensive, engine-like tool featuring a scripting editor, node-based dialog trees, advanced physics integration, and interactive preview modes. The actual implementation in `src/components/RpgSceneEditor.tsx` is significantly simpler, primarily focusing on grid-based map chunk placement and basic entity positioning.
*   **Resolution**: These aspirational features have been logged in `docs/TODO.md`. The design document currently overstates the capabilities of the editor. Future development phases will need to systematically implement these advanced features or the design spec must be scaled down to reflect MVP status.

## 5. Scene map_list Path Inconsistency
*   **Conflict**: When parsing scene data from the backend, the `map_list` property could be located at either `sceneData.map_list` or nested under `sceneData.scene_entities.map_list`. This inconsistency causes bugs in rendering when the map list cannot be found in the expected location.
*   **Resolution**: Frontend components (`RpgMode.tsx`, `RpgSceneEditor.tsx`) implement defensive parsing to check both paths. A backend refactoring is tracked as technical debt to standardize the payload format.

## 6. GameObjectTemplateCreator AI Parser
*   **Conflict**: The `docs/rpg_obj_creator.md` spec describes an AI-powered system that accepts natural language prompts to generate full game object templates. However, the current implementation in `GameObjectTemplateCreator.tsx` uses a simple static mock object to simulate the "AI" response.
*   **Resolution**: The AI generation is currently an MVP mock. A Camera Capture tool (`MonsterCameraCapture.tsx`) was added instead to allow taking real-world photos as an immediate functional alternative to generative AI. Real AI integration is noted as a future enhancement in `docs/TODO.md`.

## 7. Quest Architecture
*   **Conflict**: Some early designs assumed scenes were the top-level container that players directly select. The game logic evolved to make "Quests" the primary container.
*   **Resolution**: Quests were introduced to group scenes. The system uses a `QuestEditor.tsx` to manage a `scene_list` and define a `default_scene_id` for entry. This change reflects the actual current gameplay flow.