# Quest System Design

## 1. Overview
In "Monster Battle", Quests serve as top-level containers for multi-scene gameplay within the RPG Mode. They orchestrate collections of interconnected scenes, allowing players to traverse larger story arcs and navigate complex, multi-map environments logically grouped under a single quest umbrella.

## 2. Quest Architecture
A Quest is primarily a grouping mechanism that binds multiple scenes together and defines the player's entry point.

### 2.1 Core Components
* **Quest ID/Name**: Identifiers for the quest.
* **Scene List (`scene_list`)**: An array of Scene IDs that belong to this quest. This list determines which scenes are considered part of the quest's scope.
* **Default Scene (`default_scene_id`)**: Acts as the initial entry point. When a player selects or loads a quest in `RpgMode`, they are placed into this default scene to begin their exploration.

## 3. Implementation Details

### 3.1 Editor (`QuestEditor.tsx`)
The application includes a dedicated `QuestEditor` component to facilitate quest creation and modification:
* Allows developers/designers to manage quest properties.
* Provides UI to add scenes to the `scene_list` and define the `default_scene_id`.
* Supports both database (Supabase) and local asset file saving architectures.

### 3.2 RPG Mode Integration
In `RpgMode.tsx`, quests play a central role in scene navigation:
* **Loading**: Upon startup or quest selection, the frontend fetches quest data.
* **Scene Resolution**: Because the `scene_list` strictly contains IDs, the frontend independently queries the global scene catalog (`/api/scenes`) to resolve and display human-readable scene names in the UI.
* **Dropdown Navigation**: The Header Navigation includes a scene dropdown grouped by the active quest, allowing players to quickly switch between the scenes defined in the quest's `scene_list`.

## 4. Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quests` | Retrieve a list of all quests |
| GET | `/api/quest/{id}` | Retrieve data for a specific quest |
| POST | `/api/quest` | Create a new quest |
| PUT | `/api/quest/{id}` | Update an existing quest |
| DELETE | `/api/quest/{id}` | Delete a quest |
