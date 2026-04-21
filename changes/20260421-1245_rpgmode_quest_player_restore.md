# Summary

Added restoring of player's last quest in RPG Mode

- **Prompt**:
Objective:新增副本的設計
- in RPG mode, when changed the quest, it must reload the scene and re-render the map and objects.
- save last quest and scene to player's data, when player enter the RPG mode, it must restore last quest and scene and position

- **Original Branch Commit ID**: N/A
- **Root Cause**: The player location saving endpoint (`/api/user/location`) and the frontend periodic sync loop were only saving the player's `map_id` (scene), `pos_x`, and `pos_y`. The `quest_id` was not being persisted or restored on load, causing the player to lose their active quest selection across sessions.
- **Solution**:
    1. Executed a migration script to add a `quest_id` column to the `game_player_data` table.
    2. Updated the `/api/user/location` GET and POST endpoints in `backend/main.py` to retrieve and save the `quest_id`.
    3. Modified `RpgMode.tsx` to include `quest_id` when emitting location updates, and configured the frontend load logic to parse `data.quest_id` from the backend to automatically set `currentQuestId` upon entering RPG mode.
