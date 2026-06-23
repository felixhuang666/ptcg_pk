# RPG Quest System Design

## 1. Overview
The Quest System is designed to manage multi-scene gameplay within the RPG mode. A "Quest" acts as a top-level container orchestrating a collection of interconnected scenes. This allows game designers to create continuous gameplay experiences, stories, and campaigns by grouping maps and logic under a unified quest ID.

## 2. Data Structure

Quests are stored as JSON structures. A Quest entity defines its ID, name, the scenes it contains, and the default entry point.

### Example JSON Payload
```json
{
  "id": "quest_intro_01",
  "name": "Beginner's Journey",
  "scene_list": [
    "scene_town_01",
    "scene_forest_01",
    "scene_cave_01"
  ],
  "default_scene_id": "scene_town_01"
}
```

* **`scene_list`**: An array of string IDs referencing individual scenes (which themselves contain `map_list` and `scene_entities`).
* **`default_scene_id`**: The scene ID that acts as the entry point when a player begins or loads the quest.

## 3. Backend Implementation (FastAPI)

The backend provides REST endpoints for CRUD operations and manages local fallback logic for the quest data.

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quests` | Retrieves a list of all quests. |
| GET | `/api/quest/{id}` | Retrieves a specific quest by ID. |
| POST | `/api/quest` | Creates a new quest. |
| PUT | `/api/quest/{id}` | Updates an existing quest. |
| DELETE | `/api/quest/{id}` | Deletes a quest. |

### Data Persistence & Fallbacks
1. **Supabase Database**: The primary data source, using the `game_quest` table.
2. **In-Memory Cache**: Acts as a fast access layer and fallback during the active session (`in_memory_quests`).
3. **Local Filesystem Fallback**: If Supabase is unavailable or data is missing, the backend scans `dist/assets/game_quest/` and `public/assets/game_quest/` for `<quest_id>.json` files.
4. **Local Saving**: The POST `/api/save_local` endpoint allows saving quest updates directly to the local JSON files for development and standalone deployments.

## 4. Frontend Integration

### 4.1 QuestEditor
* **Component**: `src/components/QuestEditor.tsx`
* **Purpose**: Provides a dedicated UI to create and edit quests.
* **Functionality**:
  * Allows users to define the quest `name`.
  * Manages the `scene_list` by adding or removing scenes from the global scene catalog.
  * Sets the `default_scene_id`.
  * Saves the quest data back to the server (DB or Local fallback).

### 4.2 RpgMode
* **Component**: `src/components/RpgMode.tsx`
* **Integration**:
  * Fetches the quest data via `/api/quest/{id}`.
  * In the top navigation header, a dropdown menu allows players to navigate between scenes. To display scene names instead of just IDs, the frontend independently fetches the global scene catalog (`/api/scenes`) and cross-references the IDs in the quest's `scene_list`.
  * Players initially load into the `default_scene_id` defined by the quest.
