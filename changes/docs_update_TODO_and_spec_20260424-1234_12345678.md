# docs_update_TODO_and_spec_20260424-1234_12345678

## User Prompt
revisit the project
revisit design spec in docs\*.md and *.md in other folders
check if any conflict, if you found any conflict, create/update to docs/TODO.md
update docs if you found missing spec
create PR if you changed any docs.

## Original Branch Commit ID
6c0bf5d

## Root Cause
- The `docs/rpg_obj_creator.md` and `docs/rpg_object_design.md` design specs were missing the `default_image` attribute support, which was recently implemented.
- `docs/ui_design.md` did not mention the new Player Camera Capture modal.
- `docs/ui_header_navigation_design.md` was missing documentation for the new Quest Scene Dropdown.
- `docs/TODO.md` contained a minor formatting inconsistency in the "Missing Features" table for the RPG Scene Editor.

## Solution
1. Updated `docs/rpg_obj_creator.md` and `docs/rpg_object_design.md` to document the `default_image` attribute for static image fallback support, matching the actual implementation.
2. Updated `docs/ui_design.md` to mention the `PlayerCameraCapture.tsx` component used in the Role Setting page.
3. Updated `docs/ui_header_navigation_design.md` to properly document the new Scene Dropdown grouped by quest in the Play Mode header.
4. Cleaned up the formatting of `docs/TODO.md` to correctly reflect that the missing features (like Mode Switch, Scripting, Dialog Trees, etc.) are still accurately tracked as missing/unimplemented design specs.
5. Ran full backend and E2E test suites to ensure documentation patches introduced no regressions.
