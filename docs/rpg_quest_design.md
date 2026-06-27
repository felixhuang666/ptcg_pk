# RPG Quest Design

## 1. Overview
The RPG mode uses 'Quests' as top-level containers for multi-scene gameplay. Quests are used to group together a collection of scenes and define how players enter the game world.

## 2. Architecture
*   **Top-level Container**: A Quest serves as the root entity for organizing scenes.
*   **Scene Collection**: Each Quest stores a `scene_list` that contains the IDs of the scenes associated with it.
*   **Entry Point**: A Quest designates a `default_scene_id`, which acts as the player's entry point when that quest is selected in the RPG Mode.

## 3. UI Components
*   **QuestEditor (`src/components/QuestEditor.tsx`)**: The primary user interface for creating, editing, and deleting quests. It allows users to manage the `scene_list`, set the `default_scene_id`, and handle both local and database (DB) saving capabilities.
*   **RPG Mode Scene Dropdown (`src/components/RpgMode.tsx`)**: Includes a scene dropdown grouped by quest, allowing players to navigate between scenes linked to the active quest. The frontend independently fetches the global scene catalog (`/api/scenes`) and cross-references IDs to display scene names.

## 4. Backend API Endpoints
The Quest System uses the following REST API endpoints:
*   `GET /api/quests`: List all quests.
*   `GET /api/quest/{id}`: Get a specific quest by ID.
*   `POST /api/quest`: Create a new quest.
*   `PUT /api/quest/{id}`: Update an existing quest.
*   `DELETE /api/quest/{id}`: Delete a quest by ID.

## 5. Data Flow & Synchronization
*   Quest data can be saved either to the local file system or directly to the database (e.g., Supabase), depending on the configuration and availability.
*   When a quest is loaded in the `RpgMode`, the system uses the `default_scene_id` to fetch and render the initial scene.
