# Fix RpgSceneEditor map_list parsing bug

## Prompt
Objective:fix bug in scene editor

saw error log:
Uncaught TypeError: M.map_list.forEach is not a function

## Original Commit ID
N/A

## Root Cause
The `map_list` data fetched from the backend (Supabase) could be a JSON string instead of an array, causing `sceneData.map_list.forEach` to throw an error since strings do not have a `forEach` method.

## Solution
Modified `src/components/RpgSceneEditor.tsx` to handle parsing `map_list` robustly. Whenever accessing `sceneData.map_list`, it now checks if it's a string and safely attempts to parse it using `JSON.parse`. If parsing fails or the result is still not an array, it gracefully defaults to an empty array. This protects against crashing when malformed data is provided from the backend.