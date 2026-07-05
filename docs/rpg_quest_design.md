# RPG Quest Design

## 1. Overview
The RPG mode uses 'Quests' as top-level containers for multi-scene gameplay. A Quest stores a collection of scenes and designates a default entry point. This architecture allows developers and players to build out larger cohesive areas from smaller modular scenes.

## 2. Architecture & Database Schema
A Quest groups multiple scenes together through the `scene_list` array and specifies the entry point through the `default_scene_id` within the `quest_entities` structure.

```json
{
  "id": "quest_1",
  "name": "Main Story Quest",
  "scene_list": ["scene_1", "scene_2", "scene_3"],
  "quest_entities": {
    "default_scene_id": "scene_1"
  }
}
```

The top level RPG Mode will read the `default_scene_id` and initialize the player at that specific scene when the quest is selected.

### API Endpoints
The backend provides REST APIs to interact with quests. It falls back to `dist/assets/game_quest` and `public/assets/game_quest` for local quest lookup if the DB record does not exist or Supabase is not available.

- `GET /api/quests` - List all quests
- `GET /api/quest/{id}` - Get a specific quest by ID
- `POST /api/quest` - Create a new quest
- `PUT /api/quest/{id}` - Update a quest by ID
- `DELETE /api/quest/{id}` - Delete a quest by ID

## 3. UI Implementation
- **Quest Editor**: `src/components/QuestEditor.tsx` provides the interface to manage quests. It lists all quests in the left sidebar, allows adding scenes to the `scene_list`, and selecting a `default_scene_id`.
- **RPG Mode Header**: Contains a scene dropdown grouped by quest, allowing players to navigate between scenes linked to the active quest. The frontend fetches the global scene catalog (`/api/scenes`) to resolve the scene names based on the IDs provided in the `scene_list`.
