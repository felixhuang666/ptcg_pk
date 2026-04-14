# Summary of Changes

## User Prompt
Objective: when load a scene, add source in left side bar
if a scene is from DB, show source-type as "DB".
if a scene is from local asset, show soure-type ad "local-asset".
TID: 609
CHANGE_PREFIX: 20260414-1823

## Original Branch Commit ID
Unknown (Not explicitly retrieved, using base from execution context).

## Root Cause
The `get_scenes` API endpoint in the backend was not providing the origin of the scene (whether it came from DB, memory, or local assets). Additionally, the frontend component (`RpgSceneEditor.tsx`) did not consume or display this information in the sidebar scene list.

## Solution
1. **Backend** (`backend/main.py`): Modified the `get_scenes` endpoint to attach a `source_type` property to each returned scene object. Valid values include `DB`, `memory`, and `local-asset`.
2. **Frontend** (`src/components/RpgSceneEditor.tsx`): Updated the scene button rendering logic within the left sidebar scene list. It now checks for `source_type` and displays it using a styled mini-badge next to the scene name.
