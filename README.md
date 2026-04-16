# 怪獸對戰 (Monster Battle)

這是一款基於 React + Vite + Express + Socket.IO 的即時回合制怪獸對戰遊戲。

## 功能特色
- **人機對戰**：與電腦 AI 進行對戰。
- **線上對戰**：隨機配對其他玩家進行即時對戰。
- **私人對戰**：透過房號與好友進行對戰。
- **挑戰 BOSS**：挑戰勝率前十名的玩家隊伍。
- **自訂隊伍**：自由搭配怪獸與 4 顆召喚師骰子（每顆上限 10 點）。
- **RPG Mode**: A real-time multiplayer map exploration mode with synced players, NPCs, and chat.
- **Map Editor**: A fully-featured visual map editor with 6 layers, dynamic tilesets, and procedural generation.
- **Scene Editor**: A comprehensive tool to compose entire game worlds, stitch maps together, and place interactive game objects and NPCs.

## 本地安裝與執行

### 1. 安裝依賴與設定
請確保您的電腦已安裝 Node.js (建議 v18+) 以及 Python 3.12+。
在專案根目錄下執行以下指令安裝所有依賴套件並建立 `.env` 檔案：

```bash
make setup
```

請編輯 `.env` 檔案並填入您的 `GOOGLE_CLIENT_ID` 以及 `GOOGLE_CLIENT_SECRET`。

### 2. 編譯與啟動伺服器
執行以下指令編譯前端與後端，並在背景啟動 FastAPI 伺服器：

```bash
make build
make bg-start
```

伺服器啟動後，您可以在瀏覽器中開啟 `http://localhost:5000` 來遊玩遊戲並進行 Google OAuth 登入。

### 3. 專案結構
- `src/components/`：React UI 元件 (戰鬥畫面、隊伍編輯器等)
- `src/store/`：Zustand 狀態管理 (儲存本地隊伍)
- `backend/`：FastAPI 後端程式碼
  - `main.py`：伺服器進入點、OAuth 與靜態檔案服務
  - `socket_app.py`：Socket.IO 遊戲對戰邏輯
  - `game/`：遊戲核心邏輯 (資料、型別、傷害計算)

## 遊戲規則
1. 每回合雙方會擲出 4 顆自訂的召喚師骰子。
2. 根據擲出的元素與點數，怪獸可以施放對應的技能。
3. 玩家可以開啟「自動戰鬥」讓系統代為操作。
4. 將對手的所有怪獸擊敗即可獲得勝利！
