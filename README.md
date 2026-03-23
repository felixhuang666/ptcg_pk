# 怪獸對戰 (Monster Battle)

這是一款基於 React + Vite + Express + Socket.IO 的即時回合制怪獸對戰遊戲。

## 功能特色
- **人機對戰**：與電腦 AI 進行對戰。
- **線上對戰**：隨機配對其他玩家進行即時對戰。
- **私人對戰**：透過房號與好友進行對戰。
- **挑戰 BOSS**：挑戰勝率前十名的玩家隊伍。
- **自訂隊伍**：自由搭配怪獸與 4 顆召喚師骰子（每顆上限 10 點）。

## 本地安裝與執行

### 1. 安裝依賴
請確保您的電腦已安裝 Node.js (建議 v18+)。
在專案根目錄下執行以下指令安裝所有依賴套件：

```bash
npm install
```

### 2. 環境變數設定 (選填)
若需啟用 Supabase 以儲存戰鬥紀錄及對手資料，請將 `.env.example` 複製為 `.env` 並填入：

```env
# 後端設定
SUPABASE_URL="https://your-project.supabase.co"
SUPERBASE_API_KEY="your-service-key"

# 前端設定
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPERBASE_API_KEY="your-anon-key"
```

如果您要建立對應的資料表結構，可以執行 `scripts/migrate_20260323_2000_game_data_oauth.py` 參考 SQL 語法。

### 3. 啟動開發伺服器
執行以下指令啟動前端與後端伺服器：

```bash
npm run dev
```

伺服器啟動後，您可以在瀏覽器中開啟 `http://localhost:3000` 來遊玩遊戲。

### 4. 專案結構
- `src/components/`：React UI 元件 (戰鬥畫面、隊伍編輯器等)
- `src/shared/`：前後端共用的型別與遊戲資料 (怪獸、技能、骰子設定)
- `src/store/`：Zustand 狀態管理 (儲存本地隊伍)
- `server.ts`：Express + Socket.IO 後端伺服器邏輯

## 遊戲規則
1. 每回合雙方會擲出 4 顆自訂的召喚師骰子。
2. 根據擲出的元素與點數，怪獸可以施放對應的技能。
3. 玩家可以開啟「自動戰鬥」讓系統代為操作。
4. 將對手的所有怪獸擊敗即可獲得勝利！
