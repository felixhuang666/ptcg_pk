# Change Log: 620

## Summary
Add a dropdown selector to select a scene within the selected quest in RPG mode. Re-fetch scenes on reload/quest change.

## Original Branch Commit ID
df55ddcde6385eb98056d7c772b373681ba5d23b

## User's Input Prompt
Objective:in RPG mode, add a drop down selector to select scene within selected quest

- when switch to a new quest or reload the page, must reload the scene list as well.

**Task information:
- TID: 620
- CHANGE_PREFIX: 20260422-1829
** Additional Instructions:** (ver 1.3.0)
...

## Root Cause
Previously, the `RpgMode` component only maintained a global list of all maps/scenes. When selecting a quest, the Map drop-down continued to show all maps, which made it confusing to jump between scenes specifically associated with that quest.

## Solution
1. Introduced `allScenes` and `questScenes` states.
2. The global scene list is fetched on mount into `allScenes`.
3. Added a `useEffect` hooked to `currentQuestId` and `allScenes`. This fetches the active quest's metadata, isolates the `scene_list` array, and maps it against `allScenes` to construct a refined `questScenes` array with localized names.
4. Modified the Map/Scene `<select>` drop-down to map over `questScenes` instead of the global map listing.
5. In `handleQuestChange`, retained the logic that defaults the `currentMapId` to the `default_scene_id` or the first scene associated with the newly selected quest to maintain consistency.
