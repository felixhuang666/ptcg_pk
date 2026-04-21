# Summary

Fixed an issue where saving a quest locally did not reflect the changes in the UI upon reload.

- **Prompt**:
Objective:新增副本的設計
...
- when add scene and then click save local, the quest doesn't save the scene correctly

- **Original Branch Commit ID**: N/A
- **Root Cause**: When a quest was saved using the `/api/save_local` endpoint, it was correctly written to the `.json` files on disk. However, the GET endpoints (`/api/quests` and `/api/quest/{id}`) prioritize returning the quest from `in_memory_quests` if it exists there (which it does if newly created during the session). Since `save_local` wasn't updating the `in_memory_quests` fallback cache, the old state was continuously returned to the frontend.
- **Solution**:
    1. Modified the `/api/save_local` endpoint in `backend/main.py`.
    2. When successfully saving `quest` data to the disk, also explicitly check and update `in_memory_quests` if the quest ID is currently cached in memory, ensuring subsequent GET requests return the correctly updated `scene_list` and metadata.
