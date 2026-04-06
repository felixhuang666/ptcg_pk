# Changes: Support layers in RPG Scene Editor

## Meta
- **TID:** 602
- **Change Prefix:** 20260406-0657
- **Date:** 20260406-0657
- **Major Category:** UI/Frontend/Backend
- **Summary:** support layers in scene editor and toggle sidebar categories
- **Original Branch Commit ID:** d34d0b3f2e7b07883bbb61c8cb16de697e663ee3

## Prompt
Objective: scene editor to support layers

- in left side bar, add a category “layers” with a icon button to support add a new layer
- user can add/del a map to the layer

Follow-up 1: "Save Scene did not work properly after creating a new scene. (If I click New Scene, it should be empty. But when I add something and click Save Scene, the previous scene is modified.)"
Follow-up 2: "If I add the same map to the scene multiple times, they all share the same ID. I want to move each instance independently... Can you change map coordinates by dragging maps directly? Can you add an 'Add Map' icon on the layer header rather than dragging from palette?"
Follow-up 3: "In the left panel, add expand/collapse icons to category headers (Scenes, Layers, Palette) so we can toggle their visibility."

## Root Cause
- The `RpgSceneEditor` frontend lacked any UI mapping for Z-index or grouping logic (layers) for map instances.
- Newly created scenes were not automatically selecting their newly assigned database ID upon creation, meaning subsequent saves overwrote the previous `currentSceneId`.
- Supabase returned `PGRST204` cache schema errors when directly updating new columns that weren't cached or didn't strictly exist.
- Identical maps on the same layer collided because the logic identified instances merely by `map_id` instead of a unique instance identifier.
- No visibility toggles existed for the sidebar categories, taking up too much screen estate.

## Solution
1. **Frontend Layers & State (UI/Frontend):**
   - Added a "Layers" panel with `lucide-react` icons to create, select, reorder (via Drag-and-Drop API), and delete layers.
   - Converted map placement logic to generate unique `instance_id` values instead of relying on `map_id`.
   - Maps dragged onto the Phaser canvas (or added via the new inline `+` button on layers) are automatically assigned to the active layer.
   - Updated Phaser rendering bounds and Z-ordering to loop through maps sorted by their explicit layer order instead of randomly.
   - Allowed maps on the canvas to be visually dragged to update their `offset_x` and `offset_y` positions.
   - Added interactive `ChevronDown`/`ChevronRight` toggles for the three main categories ("Scenes", "Layers", "Palette") to allow users to collapse and expand them.
   - Fixed the "New Scene" workflow to automatically assign `currentSceneId` to the `newScene.id` upon successful creation, ensuring subsequent saves apply to the right entity.

2. **Backend Fallback Data & Migrations (Backend/DB):**
   - Modified `backend/main.py`'s `/api/scenes` routes (`create_scene` and `update_scene`) to handle `PGRST204` Cache and missing column errors defensively. If `layers` does not exist natively as a column (or cache hasn't updated), it bundles the `layers` payload inside the existing flexible `scene_entities` JSONB column.
   - Generated corresponding PostgreSQL schema migration scripts in `scripts/migrate_20260406-0000_add_layers_to_game_scene.py` and `scripts/migrate_20260406-0001_ensure_scene_entities_json.py` to add `layers` to `game_scene` explicitly for future DB environments.

## End-to-End Tests Verification
- Verified layer rendering order, dragging capability, toggle expansion, and visual consistency using Playwright tests via Dev Login.
