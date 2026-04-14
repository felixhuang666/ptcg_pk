# Update Design Specifications and Conflict Tracking

## Prompt
revisit the project
revisit design spec in docs\*.md and *.md in other folders
check if any conflict, if you found any conflict, create/update to docs/TODO.md
update docs if you found missing spec
create PR if you changed any docs.

## Original Commit ID
69c91915

## Root Cause
The codebase is rapidly evolving, leading to discrepancies between the original design documents and the actual implementation in files like `RpgMapEditor.tsx` and `SpriteSheetEditor.tsx`. Keeping the design specs up to date and tracking identified architectural conflicts is important for project maintainability.

## Solution
1. Explored the codebase and `docs/*.md` to compare current implementation against design specs.
2. Updated `docs/design_conflict.md` to note that the missing 'Info Toggle' from the Map Editor design spec has actually been resolved in the codebase.
3. Updated `docs/design_todo.md` with action items to improve the Eraser UX in the Map Editor.
4. Updated `docs/TODO.md` with a missing feature conflict where scaling images in the Sprite Sheet Editor does not currently reset zoom and pan as dictated by its design spec.
