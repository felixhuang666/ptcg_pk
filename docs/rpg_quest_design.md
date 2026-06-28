# RPG Quest Design Document

## 1. Overview
The RPG Mode uses **Quests** as top-level containers for multi-scene gameplay. A Quest acts as the narrative or mechanical boundary for a specific portion of the game, linking together multiple individual game scenes.

## 2. Quest Architecture

### 2.1 Scene Management
A Quest stores a collection of scenes via the `scene_list` property. This list dictates which scenes are associated with the given quest.

```json
{
  "id": "quest_1",
  "name": "Tutorial Quest",
  "scene_list": ["scene_101", "scene_102"],
  "default_scene_id": "scene_101"
}
```

### 2.2 Default Scene (Spawn Point)
Each quest must designate a `default_scene_id`. This acts as the player's entry point when a quest is selected in the RPG Mode. When a player transitions to a new quest, they will automatically spawn into this default scene.

### 2.3 Scene Resolution
Quest data fetched from `/api/quest/{id}` contains a `scene_list` of scene IDs but no corresponding display names. To resolve scene names for UI elements (like scene selection dropdowns), the frontend must independently fetch the global scene catalog (`/api/scenes`) and cross-reference the IDs.

## 3. Data Persistence
Quests can be saved and loaded from two primary sources:
- **Database (Supabase):** Persistent global storage.
- **Local File Storage:** Stored locally as JSON assets for offline use or default fallbacks.

## 4. Backend API Endpoints (Quest System)
The Quest System utilizes the following REST API endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quests` | List all quests |
| GET | `/api/quest/{id}` | Get a specific quest by ID |
| POST | `/api/quest` | Create or update a quest |
| DELETE | `/api/quest/{id}` | Delete a specific quest by ID |
