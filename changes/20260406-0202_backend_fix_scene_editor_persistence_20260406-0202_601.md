**User's Input Prompt:**
Objective:fix bug in scene editor: cannot add/del

- after create a new scene, click save, and then reload the page, cannot see the scene which is created.
- add test cases for new/save/load

**Task information:**
- TID: 601
- CHANGE_PREFIX: 20260406-0202

**Original Branch Commit ID:**
d621be2142ac2b81b4c75386491156f7acdb4b52

**Root Cause:**
When Supabase is not configured or fails, the `/api/scene` POST, PUT, DELETE, and GET endpoints were either throwing errors or returning empty data because there was no in-memory fallback dict for scenes (like there is for `in_memory_maps`). This caused scenes to not persist across frontend page reloads.

**Solution:**
1. Modified `backend/main.py` to add `in_memory_scenes = {}` and `scene_id_counter = 1`.
2. Updated `get_scenes()`, `get_scene()`, `create_scene()`, `update_scene()`, and `delete_scene()` API endpoints to gracefully fall back to reading from/writing to `in_memory_scenes` when Supabase interaction fails or is not configured.
3. Added API tests in `backend/tests/test_api_scenes.py` to cover new, save, load, delete, and get scenarios.
