# RPG Object Designer 系統設計

## 1. 系統概述
Scene Editor 不僅是排版地圖的工具，更是一個迷你的 Game Engine。透過 Game Object 系統，遊戲設計師可以快速佈置場景，支援：地圖行走、NPC 互動、跨場景傳送，乃至於戰鬥觸發。

Game Object 採用三層架構設計：
1. **Template (模板)**：定義物件的外觀、精靈圖 (SpriteSheet)、碰撞框與預設邏輯。
2. **Instance (實例)**：放置於 Scene 內的實際物件，記錄座標、大小縮放、與特定參數。
3. **Controller (控制器)**：決定物件的運行時期行為與互動邏輯。

---

## 2. Game Object Template (物件模板)

以 JSON 格式描述，存放在 `public/assets/game_obj_templates/` 中。
為了支援「地圖行走」與「戰鬥場景」的巨大差異，Template 需要支援多種動畫狀態與彈性的碰撞尺寸。

```jsonc
{
    "id": "npc_boss_dragon",
    "name": "Fire Dragon",
    "category": "npc", // "npc", "monster", "trigger", "item", "environment"
    
    // 預設容器大小 (地圖上)
    "container_width": 32,
    "container_height": 32,
    
    // 定義各個腳本情境所需的所有 Sprite Sheets
    "sprite_sheets": [
      {
         "state": "map_idle",
         "sprite_sheet_name": "dragon_small_idle",
         "frame_width": 32, "frame_height": 32, "frame_rate": 8
      },
      {
         "state": "battle_idle", // 戰鬥場景的巨大圖
         "sprite_sheet_name": "dragon_huge_idle",
         "frame_width": 256, "frame_height": 256, "frame_rate": 10
      },
      {
         "state": "battle_atk",  // 戰鬥專屬動畫
         "sprite_sheet_name": "dragon_huge_attack",
         "frame_width": 256, "frame_height": 256, "frame_rate": 15
      }
    ],

    "collision": {
        "enabled": true,
        "width": 32,
        "height": 32
    },

    // 預設掛載的行為控制器
    "default_controller": "EncounterMonsterController"
}
```

---

## 3. Game Object Controller (控制器設計)

Controller 用來控制所建立的 Game Object。針對不同的場景需求，設計以下幾種內建的 Controller 供 Editor 調用：

### 3.1 觸發與場景切換類 (Scene & Trigger Controllers)
*   **`EncounterMonsterController` (明雷遇敵/戰鬥觸發器)**
    *   **行為**：在地圖上巡邏或靜止。
    *   **事件 (`onCollide`)**：當玩家碰到它時，觸發轉場特效，暫停當前 Map Scene，並推送 (Push) 特定的 Battle Scene 到最上層。
    *   **預期變數**：`battle_scene_id`、`enemy_formation_id`。
*   **`TeleportController` (傳送點)**
    *   **事件 (`onStep`)**：玩家踩到特定格子，立即切換到另一個 Map Scene 的指定座標。

### 3.2 戰鬥場景專用類 (Battle Controllers)
在戰鬥場景中，物件的大小、位置與地圖邏輯完全不同。
*   **`BattleActorController` (戰鬥單位控制器)**
    *   **行為**：載入時自動播放 `"battle_idle"`，不進行地圖上的網格移動。負責接收戰鬥指令 (Attack, Defend, Magic)。
    *   **事件**：接收到指令時切換對應的動畫狀態 (例如：`play("battle_atk")`)，並處理傷害數值彈出 (Damage Text)。

### 3.3 地圖與 NPC 互動類 (Exploration Controllers)
*   **`StaticNpcController`**：播放地圖待機動畫，被玩家互動時開啟對話框 (`dialog_id`)。
*   **`ChestController`**：管理寶箱開關狀態，點擊後獲得道具並轉換 Sprite 狀態。

---

## 4. Game Object Instance (實例化與場景覆蓋)

存放在 `1.json` (Game Scene JSON) 的 `scene_entities.game_objects` 陣列中。
Scene Editor 中的 Inspector 可以**覆蓋 (Override)** 模板的預設值，以適應「**同一個物件，在戰鬥場景與地圖場景的各種不同表現**」。

```jsonc
{
    "id": "inst_dragon_boss_01",
    "template_id": "npc_boss_dragon", 
    "layer_id": "object_layer",

    // 在當前場景的座標
    "position": { "x": 10, "y": 15 },
    "zoom": 1.5, // 可以針對戰鬥場景設計特別的縮放

    // Override: 如果這是一個戰鬥場景，我們可以覆蓋他的容器大小與預設動畫
    "container_override": {
        "width": 256,
        "height": 256
    },
    "default_state_override": "battle_idle",

    // 傳給 Controller 的自訂參數，例如觸發哪場戰鬥
    "properties": {
        "battle_scene_id": "scene_boss_battle_01",
        "drop_item": "dragon_scale"
    }
}
```

## 5. Editor UI 實作需求
1. **Palette 擴充**：左側選單增加 "Game Object Template" 類別，讀取 `public/assets/game_obj_templates`。
2. **Layer 擴充**：允許拖拉 Object 到特製的 `Object Layer` 或通用的 Layer 上。
3. **Inspector 擴充**：
   - 點擊場景上的 Object 後，右側 Inspector 除了 Position、Scale，還要動態顯示該 Controller 所需要的 `properties` 欄位供設計師填寫 (例如讓設計師填入 `battle_scene_id`)。
   - 支援 Override Container Size (應付戰鬥場景放大需求)。