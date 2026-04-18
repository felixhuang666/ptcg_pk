# Add Game Object Template Creator to RpgSceneEditor

**TID:** 612
**CHANGE_PREFIX:** 20260418-0045
**User Prompt:** Objective:RPG game object design and implementation - study docs/rpg_obj_creator.md - study docs/rpg_object_design.md - check if able to use local data (scene/maps/objects) to support and test in first stage
**Original Branch Commit ID:** N/A (Based on current state)

## Root Cause
The `RpgSceneEditor` required a tool to dynamically create `Game Object Templates` using an AI-assisted natural language prompt workflow as specified in `rpg_obj_creator.md`.

## Solution
1. **Created `GameObjectTemplateCreator` Component**:
   - Implemented a full-screen overlay UI with a text area for entering a prompt.
   - Built a simple keyword-based parser that generates a base template JSON (handling "NPC", "Monster", "Chest" variations) from the prompt.
   - Added an interactive Properties editor for IDs, names, controllers, sprite sheets, and collision settings.
   - Added a real-time JSON preview of the generated template.
   - Wired up the component to save the output locally via `POST /api/save_local`.
2. **Integrated with `RpgSceneEditor`**:
   - Added a "Create Template" button (`Wand2` icon) to the main action bar.
   - Displayed the creator component conditionally and automatically fetched the newly created templates into the Palette state upon successful save.
3. **Updated Documentation**:
   - Checked off completed implementation tasks in `docs/rpg_obj_creator.md`.
