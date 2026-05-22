# Quest Editor Design Document

## 1. Overview
The Quest Editor is a tool for creating, editing, and managing Quests within the game. A Quest acts as a top-level container for multi-scene gameplay, allowing designers to group related scenes together and define entry points.

## 2. Quest Structure
A Quest groups a collection of scenes (`scene_list`) and designates a `default_scene_id` which acts as the player's entry point when a quest is selected in RpgMode.

### Table Schema
```sql
create table public.game_quests (
  id text not null,
  created_at timestamp with time zone not null default now(),
  name text not null,
  description text null,
  scene_list jsonb null,
  default_scene_id text null,
  constraint game_quests_pkey primary key (id)
) TABLESPACE pg_default;
```

## 3. UI Design
The Quest Editor provides a user-friendly interface for managing quests:
- **Left Panel (Quest List)**: Displays a list of all available quests. Users can select a quest to edit or create a new one. Includes buttons to "Load DB" and "Load Local".
- **Right Panel (Quest Editor)**:
  - **Basic Info**: Fields for editing the quest's ID, Name, and Description.
  - **Scene Management**: A section to manage the `scene_list`. Users can add scenes by selecting them from a dropdown menu (populated from the backend API `/api/scenes`) and remove scenes from the list.
  - **Default Scene**: A dropdown to select the `default_scene_id` from the list of scenes currently added to the quest.
  - **Save Controls**: Buttons to "Save to DB" and "Save Local".

## 4. Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quests` | List all quests |
| GET | `/api/quests/{id}` | Get quest by ID |
| POST | `/api/quests` | Create or update a quest in Supabase |
| POST | `/api/save_local_quest` | Save quest to local filesystem (`public/assets/quests/` and `dist/assets/quests/`) |

## 5. Data Persistence
- **Supabase Integration**: Quests can be saved to and loaded from the Supabase database.
- **Local Fallback**: Quests are also saved as JSON files in `public/assets/quests/` and `dist/assets/quests/` for local development and fallback when the database is unavailable.
