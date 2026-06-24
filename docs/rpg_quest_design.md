# RPG Quest Design

## 1. Overview
The RPG Mode uses **Quests** as the top-level container for multi-scene gameplay. A quest essentially groups multiple "scenes" together, acting as a cohesive campaign or narrative arc within the game world.

## 2. Quest Architecture

A Quest is defined as an entity that stores a collection of scenes and designates an entry point for the player.

### Schema Configuration
A Quest typically contains:
*   **id**: Unique identifier for the quest.
*   **name**: The display name of the quest.
*   **scene_list**: An array of Scene IDs that belong to this quest.
*   **quest_entities**: An object containing quest-specific configurations. Most notably, it contains `default_scene_id`.

### 2.1 scene_list
The `scene_list` determines the available scenes for navigation when a quest is selected. In the frontend RPG Mode UI, when a player selects a specific quest from the header dropdown, the scene dropdown is subsequently populated only with the scenes explicitly listed in this `scene_list`.

### 2.2 default_scene_id
The `default_scene_id` (nested under `quest_entities`) acts as the player's initial entry point. When a player switches to a new quest in the RPG Mode, the game engine will automatically load and teleport the player to the scene corresponding to this ID. If `default_scene_id` is not set or is invalid, the engine will fallback to the first scene found in the `scene_list`.

## 3. UI Integration

*   **Quest Editor (`QuestEditor.tsx`)**: Allows for creating quests, managing the `scene_list`, and setting the `default_scene_id`. Quests can be saved locally or to the Supabase database.
*   **RPG Mode Header (`RpgMode.tsx`)**: Contains a quest selection dropdown. Changing the quest dynamically triggers a fetch to `/api/quest/{id}` to load the associated `scene_list` and immediately changes the current map to the `default_scene_id`.
