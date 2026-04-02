## Issue Summary
**TID:** 587
**Date:** 20260402-1731
**User Input Prompt:** save player's last location periodically - when player enter the rpg play mode, it should record player's location (map-id, position) - when player logout and re-login, it should restore his last location - should sync to data base periodically - you can create backend API to support this function - I had create table in supabase, below is table schema...

## Root Cause & Solution
**Root Cause:**
The RPG Mode always instantiated the player character at default coordinates (100, 100) on the default map 'main_200'. There was no backend logic or schema to persist the player's last coordinate, nor was there frontend logic to record or load it.

**Solution:**
1. Created a migration script `scripts/migrate_20260402-1731_game_player_data.py` to add the `game_player_data` table to the Supabase database.
2. Added `GET /api/user/location` to read the player's saved location coordinates.
3. Added `POST /api/user/location` to upsert the current location back into Supabase.
4. Modified the frontend `RpgMode.tsx` to delay spawning the Phaser map until the `locationLoaded` state is confirmed. We query the GET endpoint on load to fetch map id and coordinates, passing them down into the `PhaserGame` parameters (`initialPosX`, `initialPosY`).
5. Implemented a `setInterval` hook in `RpgMode.tsx` to capture the `window.__PHASER_MAIN_SCENE__.player` coordinates and map ID every 5 seconds. If the position has changed since the last poll, it posts the updated location to the backend via the POST endpoint.
