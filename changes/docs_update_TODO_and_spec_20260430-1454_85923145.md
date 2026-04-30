# docs_update_TODO_and_spec_20260430-1454_85923145

## Request
Review the project and design specs in docs/*.md. Check if any conflict, if you found any conflict, create/update to docs/TODO.md. Update docs if you found missing spec.

## Original Commit ID
55585513d971ae37039f0ead102f9eb1e148c53f

## Root Cause
N/A

## Solution
Reviewed all markdown files in `docs/` and identified that the `val ? val : val` redundant code mentioned in `docs/design_todo.md` and `docs/design_conflict.md` has already been cleaned up in the source code. Updated `docs/design_todo.md` and `docs/design_conflict.md` to remove references to this redundant code. Also updated `docs/TODO.md` to track missing features for `Game Object Controller` and `Game Object Template Creator` based on `docs/rpg_object_design.md` and `docs/rpg_obj_creator.md`.
