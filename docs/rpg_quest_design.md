# RPG Quest Design

## Overview
The RPG mode uses "Quests" as top-level containers for multi-scene gameplay. A Quest stores a collection of scenes (`scene_list`) and designates a `default_scene_id` which acts as the player's entry point when a quest is selected in RpgMode.

## Quest Data Structure
- `id`: Unique identifier for the quest.
- `name`: Display name of the quest.
- `scene_list`: Array of scene IDs associated with the quest.
- `default_scene_id`: The ID of the scene where the player starts when entering the quest.

## Persistence
Quest data persistence uses a multi-layered approach involving the Supabase database, local `.json` file assets, and an in-memory cache (`in_memory_quests` in `backend/main.py`) that must be kept synchronized when quests are saved locally via the `/api/save_local` endpoint.
