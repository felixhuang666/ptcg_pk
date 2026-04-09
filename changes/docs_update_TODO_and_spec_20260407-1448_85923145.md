# docs_update_TODO_and_spec_20260407-1448_85923145

## Request
git pull last main branch
revisit the project
revisit design spec in docs\*.md and *.md in other folders
check if any conflict, if you found any conflict, create/update to docs/TODO.md
update docs if you found missing spec
create PR if you changed any docs.

## Original Commit ID
N/A

## Root Cause
N/A

## Solution
Reviewed all markdown files in `docs/` and identified that `docs/rpg_scene_design.md` mentions several features (Prefabs, Path Tool, Dialog Trees, Scripting & Logic Integration, Physics Integration) that are not implemented in `src/components/RpgSceneEditor.tsx`. I updated `docs/TODO.md` with these newly discovered missing implementations under a new section "6. RPG Scene Editor Missing Features".