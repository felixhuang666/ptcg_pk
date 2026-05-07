# Sync Design Specs with Implemented Features

**TID:** 12345678
**Change Prefix:** 20260424-1234

## User Prompt
pull last main branch
revisit the project
revisit design spec in docs\*.md and *.md in other folders
check if any conflict, if you found any conflict, create/update to docs/TODO.md
update docs if you found missing spec
create PR if you changed any docs.

## Root Cause
Several features were recently implemented and merged into the main branch, but the corresponding design specifications and TODO trackers were not fully updated. This caused a discrepancy between the codebase and the documentation.

## Solution
1. Updated `docs/TODO.md`:
   - Moved "RPG Mode Scene Map Merging" to Resolved Items.
   - Moved "Role Setting Selfie Upload" to Resolved Items.
   - Moved "RPG Mode Quest restore" to Resolved Items.
2. Updated `docs/ui_design.md`:
   - Added section `3.4 Role Setting View` detailing the selfie capture and alias modification feature.
3. Updated `docs/rpg_mode_design.md`:
   - Enhanced `1. Overview` to mention multi-map seamless scene loading.
   - Added `Quest and Location Saving` logic to `4. External Data Interaction` to describe the new persistence of quests across sessions.
