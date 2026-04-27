# Update Documentation and Design Specs

**TID:** 85923145
**Change Prefix:** 20260427-1540

## Summary
Revisited the project design documentation (`docs/*.md`) to synchronize the specs with the current implementation details across the frontend and backend, identifying and recording technical debt, resolving conflicts, and updating UI states.

## User Prompt
Revisit the project, revisit design spec in docs\*.md and *.md in other folders, check if any conflict, if you found any conflict, create/update to docs/TODO.md, update docs if you found missing spec, create PR if you changed any docs.

## Root Cause
Several design documents were out of sync with the latest code implementations:
- The nesting logic of `map_list` inside `sceneData` in earlier versions led to conflicting parsing logic (checking both root and `scene_entities.map_list`).
- The `GameObjectTemplateCreator` component was not properly noted as both an editor and creator tool in the `docs/TODO.md` and `docs/rpg_object_design.md`.
- `docs/rpg_scene_design.md` lacked explanations for `layer_id` rendering and tilemap rendering implementation instead of bounding boxes.
- `docs/rpg_mode_design.md` did not mention "Quests" implementation and multi-map scenes rendering as a single virtual `mapData`.
- `docs/ui_design.md` lacked details about deep linking functionality via URL parameters.

## Solution
1. Appended a new section to `docs/design_conflict.md` regarding the `scene_entities.map_list` vs root `map_list` placement.
2. Updated `docs/TODO.md` to add `GameObjectTemplateCreator` to "Resolved Items" and `map_list` normalization to "Technical Debt".
3. Added details about `GameObjectTemplateCreator` acting as a dual-purpose editor to `docs/rpg_object_design.md`.
4. Detailed the `layer_id` index mapping and Phaser tilemap rendering process in `docs/rpg_scene_design.md`.
5. Added descriptions for the new "Quests" container system and virtual `mapData` composite map handling in `docs/rpg_mode_design.md`.
6. Mentioned deep linking via query params (like `?view=SPRITE_SHEET_EDITOR`) in `docs/ui_design.md`.
