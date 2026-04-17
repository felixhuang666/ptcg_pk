**User Prompt:**
Objective:RPG game object design and implementation
- study docs/rpg_obj_creator.md
- study docs/rpg_object_design.md
- check if able to use local data (scene/maps/objects) to support and test in first stage
Task information:
- TID: 611
- CHANGE_PREFIX: 20260418-0044

**Original Branch Commit ID:**
$(git rev-parse HEAD)

**Root Cause:**
The RPG Scene Editor lacked a user interface and API to generate and save Game Object Templates as defined in the design documents `rpg_obj_creator.md` and `rpg_object_design.md`.

**Solution:**
1. Created `GameObjectTemplateCreator.tsx` allowing users to configure game object properties (sprites, collision, controller) and save them as JSON. Added a mock AI generation logic based on keywords.
2. Added `POST /api/game_obj_templates` endpoint in `backend/main.py` to persist generated templates to both `public/assets/game_obj_templates` and `dist/assets/game_obj_templates`.
3. Integrated the creator into `RpgSceneEditor.tsx` via a "Create Template" button in the Palette section.
4. Cleaned up temporary scripts.
