# RPG Quest System Design

## 1. Overview
The Quest System acts as the top-level container for multi-scene gameplay in "Monster Battle". It groups related RPG Scenes together into a single playable "Quest". This structure allows players to progress through interconnected scenes within a specific narrative or gameplay context.

## 2. Quest Data Structure
A Quest object maintains a collection of associated scenes and determines which scene the player should start in.

### 2.1 Core Properties
- **`id`**: Unique identifier for the quest.
- **`name`**: Display name of the quest.
- **`scene_list`**: A JSON array of Scene IDs (strings) that belong to this quest.
- **`quest_entities`**: A JSON object that holds additional quest metadata.
  - **`default_scene_id`**: The Scene ID (string) that acts as the entry point when a player starts or resumes the quest without a specific saved location.

*Note: The `scene_list` contains only the Scene IDs. The frontend (`RpgMode.tsx`) must independently fetch a global scene catalog (via `/api/scenes`) to cross-reference these IDs and display the actual scene names in the UI (e.g., in the Scene Dropdown).*

## 3. Data Persistence

The Quest System uses a multi-layered approach to store and retrieve data:

### 3.1 Persistence Layers
1. **Supabase Database (`game_quest` table)**: The primary persistent storage when connected to the backend.
2. **Local Assets (`public/assets/game_quest/*.json`)**: JSON files stored directly in the project directory, allowing for local development, offline play, or default quest distribution.
3. **In-Memory Cache (`in_memory_quests`)**: The backend (`backend/main.py`) maintains an in-memory dictionary of quests for fast retrieval and state management during runtime.

### 3.2 Synchronization
To ensure consistency across these layers, the `/api/save_local` endpoint is used. When a quest is saved via the Quest Editor, this endpoint writes the quest data to the local `.json` asset files and simultaneously updates the `in_memory_quests` cache, keeping everything synchronized.

## 4. Player Progress and State
The player's active quest is maintained across gameplay sessions.

The `/api/user/location` endpoint is responsible for tracking where the player is currently located. It updates the `quest_id` column in the `game_player_data` table, alongside their active scene ID and coordinate positions (`pos_x`, `pos_y`). When a player connects to the RPG Mode, this data is retrieved to resume their progress accurately.

## 5. Backend API Endpoints

The Quest System is managed via the following REST API endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quests` | Retrieves a list of all available quests, aggregating data from Supabase, local files, and the in-memory cache. |
| GET | `/api/quest/{id}` | Retrieves detailed data for a specific quest by its ID. |
| POST | `/api/quest` | Creates a new quest. |
| PUT | `/api/quest/{quest_id}` | Updates an existing quest. |
| DELETE | `/api/quest/{id}` | Deletes a quest. |