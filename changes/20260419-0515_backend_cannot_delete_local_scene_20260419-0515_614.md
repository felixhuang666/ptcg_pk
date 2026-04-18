# Summary

## User Prompt
Objective:fix bug: cannot delete scene which is from local asset
- TID: 614
- CHANGE_PREFIX: 20260419-0515

## Original Branch Commit ID
753af6c4c31754510825601a9ebcf51de8700558

## Root Cause
The `delete_scene`, `delete_map`, and `delete_npc` endpoints in `backend/main.py` were only removing the entities from Supabase and the in-memory cache. They did not contain any logic to remove the corresponding physical `.json` files representing these local assets from the `dist/assets` and `public/assets` directories. Additionally, `delete_scene` and `delete_scene` endpoints sometimes relied purely on integer IDs, causing UUIDs representing local assets to crash or be skipped.

## Solution
Modified the endpoints `delete_scene`, `delete_map`, and `delete_npc` in `backend/main.py` to:
1. Accept `str` IDs as parameters instead of strict `int` to support local file IDs which can be strings or UUIDs.
2. Maintain backward compatibility for integers by trying to cast to `int` if necessary (e.g. for `delete_scene`).
3. Added logic to locate and delete the corresponding `<id>.json` files from both `dist/assets/...` and `public/assets/...` directories for scenes, maps, and npcs.
