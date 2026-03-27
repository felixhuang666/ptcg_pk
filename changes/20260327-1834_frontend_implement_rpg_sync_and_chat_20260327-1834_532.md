# 20260327-1834_frontend_implement_rpg_sync_and_chat_20260327-1834_532

**TID:** 532
**Date:** 20260327-1834
**Category:** frontend/backend/DB/bot

## Original Branch Commit ID
5e53cdeb7c350b5c7c502d67811c204f69d10e9e

## User Request Prompt
Objective:進入RPG mode 可以同步所有玩家, NPC的狀態
- 玩家的位置移動後, 系統會同步給所有的玩家, (包含暱稱, 位置, 動作, 跟腳色, type(npc or player))
- 收到其他玩家的動態, 要即時顯示, 顯示其他玩家的時候 會顯示暱稱
- 新增game_npcs table
- backend 新增API: creat_npc/delete_npc/update_npc
- 新增對話框, 可以輸入對話,
- 對話框, 可以看到其他人的對話
- 新增設計文件: docs/player_sync_design.md  說明同步的機制如何實作

## Root Cause
RPG mode currently only supports basic multiplayer movement without names, distinct sprites, or chat. NPCs are not supported, and there's no backend state synchronization or chat broadcasting.

## Solution
1. **DB Changes**: Created a database migration script `scripts/migrate_20260327-1834_create_game_npcs.py` for the `game_npcs` table.
2. **Backend Changes**:
   - Implemented CRUD REST APIs for `game_npcs` in `backend/main.py`.
   - Updated `backend/socket_app.py` to synchronize players with their names and role sprites.
   - Synchronized NPC state from DB to all players in RPG mode.
   - Implemented `chat_message` Socket.IO event handler.
3. **Frontend Changes**:
   - `src/components/RpgMode.tsx` updated to show player names above sprites.
   - Rendered NPC sprites with distinct nametags.
   - Handled dynamically generated textures and animations for multiple characters (prevented texture overriding bug).
   - Added a chat UI component and wired it up via Socket.IO to receive and send messages in real-time.
4. **Docs**: Wrote `docs/player_sync_design.md` detailing the design pattern for Socket.IO synchronization.
