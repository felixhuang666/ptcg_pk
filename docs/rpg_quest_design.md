# RPG Quest Design

## 1. Overview
The Quest System is designed to manage multi-scene gameplay sequences in "Monster Battle". Quests act as top-level containers that string together multiple RPG Scenes, providing a structured progression for players.

## 2. Structure
- **Quests**: A Quest object contains metadata (name, description) and a list of scenes (`scene_list`).
- **Scenes**: Each scene in a quest represents a distinct area or chapter of the game.
- **Default Scene**: A quest designates one of its scenes as the `default_scene_id`. This serves as the player's entry point when they begin or resume the quest in RPG Mode.

## 3. Storage and Data Model
- The backend handles full CRUD operations for Quests via the `/api/quests` and `/api/quest/{id}` REST endpoints.
- Quests can be persisted to a local file system (e.g., using a mock DB saving mechanism via `/api/save_local`) or potentially to a cloud database (like Supabase).

## 4. Editor Interface
- The `QuestEditor.tsx` component provides a user interface for designers to create, edit, and manage Quests.
- Features include assigning scenes to a quest, setting the default entry scene, and toggling persistence options.

## 5. Integration with RPG Mode
- In `RpgMode.tsx`, players can select a Quest from a dropdown menu.
- Upon selection, the game dynamically fetches the quest data and loads the designated default scene, seamlessly transitioning the player into the quest environment.
