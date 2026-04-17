# Update Documentation for Sprite Sheet Editor

**Original Prompt:**
"git pull last main branch
revisit the project
revisit design spec in docs\*.md and *.md in other folders
check if any conflict, if you found any conflict, create/update to docs/TODO.md
update docs if you found missing spec
create PR if you changed any docs."

**Root Cause:**
While revisiting the project, I found that the advanced features of the RPG Sprite Sheet Editor (such as manual crop, hotkeys, offset/gap, grid overlay, zoom controls, image scaling, reordering, and color picker) were fully implemented in `src/components/SpriteSheetEditor.tsx`, but `docs/TODO.md` and `docs/rpg_sprite_sheet_editor_design.md` incorrectly listed them as "Missing Features" or pending tasks.

**Solution:**
Updated `docs/rpg_sprite_sheet_editor_design.md` to move the advanced features from "Missing Features" to "Implemented Features".
Updated `docs/TODO.md` to move the Sprite Sheet Editor from "Missing Features" to the "Resolved Items" section. Corrected numbering in `TODO.md`.

**Commit ID:**
$(git rev-parse HEAD)
