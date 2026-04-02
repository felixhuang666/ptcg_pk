# Implement RPG Scene Editor

## User Request
- refer to docs/rpg_scene_design.md
- create a new file to implement it, name as RpgSceneEditor.tsx
- in header navigation bar, add a icon to jump the rpg scene editor
- in header navigation bar, add a icon to jump the rpg map editor

## Context & Root Cause
The game lacked a macro-level scene editor to orchestrate multiple maps and entities into a cohesive game world as outlined in `docs/rpg_scene_design.md`.

## Solution
1. Added database migration to create `game_scene` table in Supabase.
2. Implemented backend CRUD REST endpoints for `/api/scene` in `backend/main.py`.
3. Created `src/components/RpgSceneEditor.tsx` with a Phaser.js grid canvas, left/right sidebars, scene management logic, map palette for drag-and-drop, and property inspector for map offsets.
4. Added UI navigation buttons to switch between the new `RPG_SCENE_EDITOR` and `RPG_MAP_EDITOR` in `App.tsx`, `RpgMode.tsx`, and `RpgMapEditor.tsx`.
5. Fixed `tests/verify_rpg.spec.ts` timeout issue.
