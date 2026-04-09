# docs_update_TODO_and_spec_20260409-1454_85923145

## Request
git fetch origin main && git merge origin/main
revisit the project
revisit design spec in docs\*.md and *.md in other folders
check if any conflict, if you found any conflict, create/update to docs/TODO.md
update docs if you found missing spec
create PR if you changed any docs.

## Original Commit ID
a60ef10f0132a000ce4258ef856d6e2c5f22689d

## Root Cause
N/A

## Solution
Reviewed all markdown files in `docs/` and identified that the `val ? val : val` redundant code mentioned in `docs/design_todo.md` and `docs/design_conflict.md` has already been cleaned up in `src/components/RpgMapEditor.tsx` and `src/components/RpgMode.tsx`. Updated `docs/design_todo.md` and `docs/design_conflict.md` to remove references to this redundant code. The remaining items in `docs/TODO.md` are accurate and do not need modification.
