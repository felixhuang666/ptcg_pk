# RPG Quest Design Document

## 1. Overview
The RPG Mode uses 'Quests' as top-level containers for multi-scene gameplay. A Quest stores a collection of scenes (`scene_list`) and designates a `default_scene_id` which acts as the player's entry point when a quest is selected in RpgMode.

## 2. Structure
- `scene_list`: A collection of scene IDs.
- `default_scene_id`: The player's entry point.

## 3. UI Implementation
- The `QuestEditor.tsx` component is used for quest composition.
- The `RpgMode.tsx` frontend fetches the global scene catalog (`/api/scenes`) and cross-references the IDs to resolve scene names for UI elements (like dropdowns).

## 4. Backend Endpoints
- `GET /api/quests`: List all quests.
- `GET /api/quest/{id}`: Get quest by ID.
- `POST /api/quest`: Create a new quest.
- `PUT /api/quest/{id}`: Update a quest.
- `DELETE /api/quest/{id}`: Delete a quest.
