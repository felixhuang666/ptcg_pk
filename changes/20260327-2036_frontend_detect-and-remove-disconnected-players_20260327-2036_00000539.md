# 偵測其他玩家斷線

**Prompt:**
當斷線後, 要通知玩家更新顯示, 移除斷線玩家的狀態(包含小對話框, 暱稱, 腳色顯示 等)

**Original Branch Commit ID:**
591459b4fc9feb4bc14b5566fa79b1fa17fdecff

**Root Cause:**
前端的 Phaser 引擎 `RpgMode.tsx` 在接收到其他玩家斷線的 `player_left` 事件時，雖然會移除玩家精靈 `otherPlayers[id]` 與其名字標籤 `nameTags[id]`，但缺少了對「小對話框」(chat bubbles) 相關 UI 狀態的實作及清理。

**Solution:**
在 `RpgMode.tsx` 中的 `MainScene` 裡加入 `chatBubbles` 和 `chatTimers` 兩個 Map 來追蹤對話框的狀態。
新增 `showChatBubble` 方法來負責顯示玩家對話時的彈出訊息方塊，並設定 4 秒後自動清理的計時器。
在玩家移動 `player_moved` 時與每一幀 `update` 裡，根據玩家座標更新對話框的位置。
在收到 `player_left` 斷線事件時，同時清除該位斷線玩家的 `chatBubbles` 與 `chatTimers`，確保沒有殘留的 UI 元素在畫面上。