# Summary

Added Quest design and Quest Editor to the system.

- **Prompt**:
Objective:新增副本的設計
- Quest (副本) 可以有一個或有多個場景(scene)
- 新增副本編輯器(Quest Editor), 可以加入或刪除scene
- 副本可以選擇存在本地(local asset) 或是DB(supabase)
- in Quest editor, designer can set default scene
- 玩家在進入RPG MODE後, 可以選擇副本
- 玩家進入副本後, 要正確顯示地圖跟物件

- **Original Branch Commit ID**: N/A
- **Root Cause**: N/A (New feature)
- **Solution**:
    1.  Created a `game_quest` DB schema migration (`scripts/migrate_20260421-1128_create_game_quest.py`).
    2.  Added full backend CRUD support (`/api/quests`, `/api/quest/{id}`) and local saving (`/api/save_local`) in `backend/main.py`.
    3.  Implemented the `QuestEditor` component (`src/components/QuestEditor.tsx`) to manage quest metadata, assigned scenes, and the default spawn point.
    4.  Integrated the Quest Selection drop-down in `RpgMode.tsx` to link a selected quest to its default starting scene map.
    5.  Modified `App.tsx` routing to show the Quest Editor.
