# Summary

Added default assets and fixed fallback quest loading in RPG mode.

- **Prompt**:
Objective:新增副本的設計
...
- if player's last quest id is null or not exist, load first quest as default.
- create a default quest in public/assets/game_quest/default_quest.json
- create a default scene in public/assets/game_scene/default_scene.json
- create a default map in public/assets/maps/default_map.json
- the default_quest.json use default scene and map for test
...
- fix Phaser crash `Cannot read properties of undefined (reading 'tileWidth')`

- **Original Branch Commit ID**: N/A
- **Root Cause**:
    1. Empty application state did not have a default quest, meaning the RPG mode started blank.
    2. The RPG mode fallback logic did not correctly fetch and select the default map when the quest was implicitly selected as the first item on load.
    3. The physics collider threw a Type Error when iterating map layers if the tileset was not fully loaded or malformed (tileWidth undefined).
- **Solution**:
    1. Created minimal `default_map.json`, `default_scene.json`, and `default_quest.json` local asset files inside `public/assets/` and `dist/assets/`.
    2. Added a robust `useEffect` hook in `RpgMode.tsx` that ensures if `currentQuestId` is blank or invalid, it selects the first available quest (default quest) and automatically fetches its `default_scene_id` to initialize the map state.
    3. Modified the physics logic inside `RpgMode.tsx` to conditionally check `l.tilemap.tileWidth` before applying the Phaser `.collider` logic, completely eliminating the crash.
