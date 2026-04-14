# Summary

- **TID**: 12345678
- **Prompt**: in map editor, i click "ave Map to Local Asset", but not work. in map editor, after I click the button "save Map to Local Asset", it must save both map_meta json and map_data json to local storage. I can see map_data saved to DB (supabase) if i click save. I expected that map_data should have a copy if I click "save Map to Local Asset". verify if backend API handle reading map from local asset as well. verify if scene editor can read map from local asset as well. after fix, add test-case to veryify.
- **Original Branch Commit ID**: N/A
- **Root Cause**: The RpgMapEditor sent an invalid `maps` array format to `/api/save_local`, omitting the `id` field. The backend's `save_local` also did not contain the logic to extract and save the `map_meta` section of the map data to the filesystem.
- **Solution**: Updated the payload in `RpgMapEditor.tsx` to include `id`, `name`, and mapped `scene.mapData` to `map_data`. Added `map_meta` extraction and local saving to `backend/main.py`. Added a test to verify saving and loading maps works seamlessly with `/api/save_local` and `/api/map`.
