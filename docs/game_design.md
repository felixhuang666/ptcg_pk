# 怪獸對戰 (Monster Battle) - Game Design Spec

## 1. 遊戲概述 (Game Overview)
「怪獸對戰」是一款基於回合制 (Turn-based) 系統與骰子機制的網頁多人對戰遊戲。玩家可以自訂自己的怪獸隊伍與骰子組合，並在每回合擲骰後選擇技能進行對戰，擊敗對手。

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
* **STR (Strength)**: 影響基礎攻擊力。
* **CON (Constitution)**: 影響基礎防禦力。
* **DEX (Dexterity)**: 影響速度 (SPD)，決定行動順序以及閃避率。

**動態數值 (戰鬥中會變動)**:
* **ATK (Attack)**: 當前攻擊力。
* **DEF (Defense)**: 當前防禦力。
* **SPD (Speed)**: 當前速度，上限為 50。速度較高者在每回合中優先行動。
* **Dodge Bonus (閃避加成)**: 透過特定技能獲得的額外閃避率。

### 2.3 骰子系統 (Dice System)
* 每個隊伍配備 **4 顆骰子**。
* 骰子有 6 個面，玩家可以自訂每個面的圖案。
* 骰子面包含：攻擊 (Attack)、防禦 (Defense)、閃避 (Dodge)、水 (Water)、火 (Fire)、風 (Wind)、地 (Earth)，以及雙屬性面 (水風、地火)。
* **保底機制**: 每次擲骰時，系統會自動檢查結果是否至少能滿足該怪獸的一招技能條件。如果完全無法施放任何招式，系統會在背景自動重擲（最多 50 次），確保玩家不會完全卡手。

### 2.4 回合系統與行動 (Turn System & Actions)
* 戰鬥採用回合制，每回合包含：**擲骰階段**、**行動階段**、**結算階段**。
* 每回合開始時，所有玩家重新擲骰，並獲得 100 AP。
* 根據怪獸的 SPD 決定該回合的行動順序。
* 玩家在自己的回合可以施放一項技能，施放後需消耗對應的 AP。
* 玩家可以選擇「重新擲骰」：放棄本回合行動，直接進入下一輪。
* 支援「自動戰鬥」模式，系統會自動選擇當前可施放且強度最高的技能。

### 2.5 命中、閃避與傷害公式 (Formulas)
* **命中率**: `Attacker SPD / (Defender SPD * (1 + Defender Dodge Bonus))` (最高 100%)
* **傷害計算**: `Damage = ATK * AttributeBonus * (100 / (100 + Defender DEF))`
* 屬性剋制時 `AttributeBonus` 為 1.25，否則為 1.0。

## 3. 怪獸圖鑑 (Monsters)

1. **鑽地鼠 (Earth)**
   * HP: 500 | STR: 120 | CON: 200 | DEX: 30
   * 技能: 咬, 鑽地閃, 瘋狂撕咬
2. **風狼 (Wind)**
   * HP: 300 | STR: 100 | CON: 100 | DEX: 60
   * 技能: 飛爪, 閃躲, 雙倍奉還
3. **火鳥 (Fire)**
   * HP: 250 | STR: 250 | CON: 150 | DEX: 25
   * 技能: 火球, 火牆, 火柱
4. **水龜 (Water)**
   * HP: 400 | STR: 150 | CON: 150 | DEX: 30
   * 技能: 龜縮, 水槍, 水柱

## 4. 技能列表 (Skills)

* **咬 (Bite)**: 消耗 20 AP。條件: 攻擊x1。傷害 = STR。
* **鑽地閃 (Burrow)**: 消耗 50 AP。條件: 閃避x2。傷害 = 0。DEF * 1.1, SPD * 1.2, 閃避加成 + 1。
* **瘋狂撕咬 (Frenzy Bite)**: 消耗 90 AP。條件: 攻擊x3。傷害 = 2*STR。DEF * 0.6, SPD 重置為 DEX, 閃避加成歸零。
* **飛爪 (Flying Claw)**: 消耗 40 AP。條件: 攻擊x1, 閃避x1。傷害 = STR。SPD * 1.1。
* **閃躲 (Dodge)**: 消耗 40 AP。條件: 閃避x1, 風x1。傷害 = 0。SPD * 1.5, 閃避加成 + 1。
* **雙倍奉還 (Counter)**: 消耗 90 AP。條件: 攻擊x2, 閃避x1, 風x1。傷害 = 2*STR。SPD 重置為 DEX, DEF * 0.6, 閃避加成歸零。
* **火球 (Fireball)**: 消耗 40 AP。條件: 攻擊x1, 火x1。傷害 = STR。
* **火牆 (Firewall)**: 消耗 40 AP。條件: 防禦x1, 火x1。傷害 = 0。DEF * 1.1。
* **火柱 (Fire Pillar)**: 消耗 90 AP。條件: 攻擊x1, 火x1, 風x1。傷害 = 2*STR。SPD 重置為 DEX, DEF * 0.6, 閃避加成歸零。
* **龜縮 (Withdraw)**: 消耗 40 AP。條件: 防禦x2。傷害 = 0。DEF * 1.3, 閃避加成 + 1。
* **水槍 (Water Gun)**: 消耗 40 AP。條件: 攻擊x1, 水x1。傷害 = STR。
* **水柱 (Water Pillar)**: 消耗 90 AP。條件: 攻擊x2, 水x1。傷害 = 2*STR。閃避加成歸零。

## 5. 遊戲模式 (Game Modes)

1. **人機對戰 (PvE)**: 玩家與預設的電腦 AI 進行對戰。
2. **線上對戰 (PvP - 隨機)**: 透過 Matchmaking 系統，隨機配對兩名正在尋找對手的玩家。
3. **私人對戰 (PvP - 房號)**: 玩家輸入自訂的房號 (Room Code)，與輸入相同房號的玩家進行對戰。

## 6. 網路架構 (Networking)
* 使用 Socket.IO 進行即時雙向通訊。
* 伺服器 (Server) 負責維護所有遊戲房間的狀態 (GameState)，處理回合切換、技能結算與自動戰鬥邏輯。
* 所有的擲骰、技能結算、傷害計算皆在伺服器端進行，確保遊戲公平性。
* 客戶端 (Client) 負責渲染畫面並發送玩家操作指令 (`executeSkill`, `giveUp`, `toggleAuto`)。
