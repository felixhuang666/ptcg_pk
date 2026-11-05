# RPG Quest Design

## 1. Overview
The RPG mode uses "Quests" as top-level containers for multi-scene gameplay. A Quest stores a collection of scenes (`scene_list`) and designates a `default_scene_id` which acts as the player's entry point when a quest is selected in RpgMode.

## 2. API Endpoints
The Quest System uses the following REST API endpoints:
- `GET /api/quests` (list all quests)
- `GET /api/quest/{id}` (get quest by ID)
- `POST /api/quest` (create a new quest)
- `PUT /api/quest/{quest_id}` (update an existing quest)
- `DELETE /api/quest/{id}` (delete a quest)

## 3. Player Location and Active Quest
The player's active quest in RPG Mode is maintained across sessions using the `/api/user/location` endpoint. This endpoint updates the `quest_id` column in the `game_player_data` table alongside their scene and position coordinates.

## 4. Data Persistence
Quest data persistence uses a multi-layered approach:
1. **Supabase Database:** Remote persistence (if connected).
2. **Local Assets:** Stored as `.json` file assets (e.g. `public/assets/game_quest/`).
3. **In-Memory Cache:** `in_memory_quests` in `backend/main.py` that must be kept synchronized when quests are saved locally via the `/api/save_local` endpoint.

## 5. Scene Listing
When interacting with the Quest System API, the returned quest data contains a `scene_list` populated with scene IDs rather than scene names. The frontend must independently fetch a global scene catalog to cross-reference and display the actual scene names.
