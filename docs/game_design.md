# 怪獸對戰 (Monster Battle) - Game Design Spec

## 1. 遊戲概述 (Game Overview)
「怪獸對戰」是一款基於 Active Time Battle (ATB) 系統與骰子機制的網頁多人對戰遊戲。玩家可以自訂自己的怪獸隊伍與骰子組合，並透過即時累積的 AP (Action Points) 來施放技能，擊敗對手。

## 2. 核心機制 (Core Mechanics)

### 2.1 屬性相剋 (Elemental System)
遊戲中有四種基本屬性，存在相剋關係，剋制時傷害會增加 25% (1.25倍)：
* **水 (Water)** 剋 **火 (Fire)**
* **火 (Fire)** 剋 **風 (Wind)**
* **風 (Wind)** 剋 **地 (Earth)**
* **地 (Earth)** 剋 **水 (Water)**

### 2.2 戰鬥數值 (Combat Stats)
每隻怪獸擁有以下基礎數值：
* **HP (Health Points)**: 生命值，歸零時怪獸倒下。
* **STR (Strength)**: 影響物理攻擊與部分技能的基礎傷害 (ATK)。
* **CON (Constitution)**: 影響防禦力 (DEF)，減少受到的傷害。
* **DEX (Dexterity)**: 影響速度 (SPD)，決定 AP 累積的快慢以及閃避率。

**動態數值 (戰鬥中會變動)**:
* **ATK (Attack)**: 當前攻擊力。
* **DEF (Defense)**: 當前防禦力。
* **SPD (Speed)**: 當前速度，上限為 50。每秒增加的 AP 等於當前的 SPD。
* **Dodge Bonus (閃避加成)**: 透過特定技能獲得的額外閃避率。

### 2.3 骰子系統 (Dice System)
* 每個隊伍配備 **4 顆骰子**。
* 骰子有 6 個面，玩家可以自訂每個面的圖案。
* 骰子面包含：攻擊 (Attack)、防禦 (Defense)、閃避 (Dodge)、水 (Water)、火 (Fire)、風 (Wind)、地 (Earth)，以及雙屬性面 (水風、地火)。
* **保底機制**: 每次擲骰時，系統會自動檢查結果是否至少能滿足該怪獸的一招技能條件。如果完全無法施放任何招式，系統會在背景自動重擲（最多 50 次），確保玩家不會完全卡手。

### 2.4 AP 系統與行動 (AP System & Actions)
* 戰鬥採用即時制，雙方的 AP 會隨時間自動增加（每秒增加量 = SPD），上限為 100。
* 施放技能需要消耗對應的 AP，且當前的骰子結果必須滿足該技能的條件。
* 玩家可以選擇「放棄回合」：消耗 30 AP，重新擲骰。
* 支援「自動戰鬥」模式，AI 會自動選擇可施放且 AP 消耗最高的技能。
* **Game Tick**: AP 的增加速度可以透過管理者介面的 `Game Tick` 設定來調整 (1-100，預設 10)。數值越大，遊戲節奏越快。

### 2.5 命中與傷害公式 (Accuracy & Damage Formulas)
* 這些公式可以在管理者介面中動態設定：
* **攻擊命中率公式** (預設): `attackerSpd / (defenderSpd * (1 + defenderDodgeBonus))`
  * 命中率最高為 100%。如果隨機數大於命中率，則攻擊會被閃避。
* **傷害計算公式** (預設): `Math.floor((attackPower * attribBonus) - defenderDef)`

### 2.6 動態技能解析 (Dynamic Skill Parsing)
* 技能效果透過解析 `description` 欄位動態生成，支援小數點運算。
* 支援的語法包含：
  * `ATK=X*STR` 或 `ATK=X` (設定攻擊力)
  * `DEF*=X` 或 `DEF=X` (修改防禦力)
  * `SPD*=X` 或 `SPD=DEX` (修改速度)
  * `dodge-bonus+=X` 或 `dodge-bonus=X` (修改閃避加成)

## 3. 管理者介面 (Admin Interface)
* 允許即時修改怪獸與技能的各項數值。
* **全域設定**:
  * 可修改命中率與傷害計算公式。
  * 可調整 `Game Tick` 以控制遊戲節奏。
  * 可切換 `工程模式 (Engineering Mode)`，啟用後會在戰鬥對話框中顯示詳細的命中與傷害計算參數。
* **視覺設定**:
  * 可為每隻怪獸與技能指定 SVG 圖片路徑 (`svgPath`)。

## 4. 視覺與場景 (Visuals & Arena)
* 戰鬥畫面採用競技場 (Arena) 視角，怪獸圖片 (SVG) 分別位於畫面兩側。
* 怪獸與技能支援 SVG 動畫，提供更生動的戰鬥體驗。

## 5. 遊戲模式 (Game Modes)
1. **人機對戰 (PvE)**: 玩家與預設的電腦 AI 進行對戰。
2. **線上對戰 (PvP - 隨機)**: 透過 Matchmaking 系統，隨機配對兩名正在尋找對手的玩家。
3. **私人對戰 (PvP - 房號)**: 玩家輸入自訂的房號 (Room Code)，與輸入相同房號的玩家進行對戰。
4. **挑戰 Boss (Boss Battle)**: 玩家可以選擇挑戰強大的 Boss 隊伍。

## 6. 網路架構 (Networking)
* 使用 Socket.IO 進行即時雙向通訊。
* 伺服器 (Server) 負責維護所有遊戲房間的狀態 (GameState)，並根據 `Game Tick` 的頻率更新 AP 與處理自動戰鬥邏輯。
* 所有的擲骰、技能結算、傷害計算皆在伺服器端進行，確保遊戲公平性。
* 客戶端 (Client) 負責渲染畫面並發送玩家操作指令 (`executeSkill`, `giveUp`, `toggleAuto`)。
