# Game Object Template Creator (AI 輔助生成器)

## 1. 定位
在 RPG Scene Editor 中新增一個 Tab，提供 AI 輔助的 Game Object Template 生成功能。作為 `docs/rpg_object_design.md` 中 Template 系統的建立工具。

## 2. 使用流程

### 2.1 Prompt 輸入模式
使用者輸入自然語言描述，系统解析並生成 Template：

```
範例 Prompt:
"建立一個 NPC 模板，名稱為「商人」，包含：
- 精靈圖: merchant.png (frame: 64x64)
- 動畫: idle (8帧), walk (12帧), talk (6帧)
- 碰撞體: 矩形 32x48
- 互動: 對話 (dialog_id)
- 事件: 無"
```

### 2.2 解析後生成的 JSON
```json
{
  "id": "merchant",
  "name": "商人",
  "category": "npc",
  "container_width": 64,
  "container_height": 64,
  "sprite_sheets": [
    { "state": "idle", "sprite_sheet_name": "merchant_idle", "frame_width": 64, "frame_height": 64, "frame_rate": 8 },
    { "state": "walk", "sprite_sheet_name": "merchant_walk", "frame_width": 64, "frame_height": 64, "frame_rate": 12 },
    { "state": "talk", "sprite_sheet_name": "merchant_talk", "frame_width": 64, "frame_height": 64, "frame_rate": 6 }
  ],
  "collision": { "enabled": true, "width": 32, "height": 48, "shape": "rectangle" },
  "interaction": { "type": "dialog", "dialog_id": "merchant_dialog_01" },
  "default_controller": "StaticNpcController"
}
```

## 3. 功能模組

| 屬性 | 說明 | 支援格式 |
|------|------|----------|
| 精靈圖 | 素材檔案與切割尺寸 | .png, .jpg, .gif |
| 動畫狀態 | 各狀態的幀率與順序 | idle, walk, run, attack, etc. |
| 碰撞體 | 形狀、尺寸、位置偏移 | rectangle, circle, polygon |
| 互動類型 | 玩家互動方式 | talk, pickup, open, attack |
| 事件 | 觸發的遊戲邏輯 | teleport, battle, quest, script |

## 4. 預設 Controller 映射

| 互動類型 | 建議 Controller |
|----------|-----------------|
| talk | StaticNpcController |
| pickup | ItemController |
| open | ChestController |
| attack | EncounterMonsterController |
| teleport | TeleportController |

## 5. UI 設計

```
┌─────────────────────────────────────────────────────────────┐
│  Game Object Template Creator                    [生成] [取消] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Prompt:                                             │   │
│  │ ___________________________________________________ │   │
│  │                                                     │   │
│  │ ___________________________________________________ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌───────────────────────┐  ┌───────────────────────────┐ │
│  │    Template 預覽        │  │    屬性面板                │ │
│  │    ┌───────────┐       │  │                           │ │
│  │    │  Sprite   │       │  │  名稱: [___________]       │ │
│  │    │  Preview  │       │  │  分類: [NPC ▼]            │ │
│  │    └───────────┘       │  │                           │ │
│  │                        │  │  碰撞體:                  │ │
│  │    動畫預覽: [▼idle]   │  │    形狀: [矩形 ▼]         │ │
│  │    ▶ ━━━○━━━           │  │    寬: [32] 高: [48]      │ │
│  │                        │  │                           │ │
│  │    動畫列表:            │  │  互動:                    │ │
│  │    ☑ idle   8fps       │  │    類型: [對話 ▼]         │ │
│  │    ☐ walk  12fps       │  │    對話ID: [___________]  │ │
│  │    ☐ run    10fps      │  │                           │ │
│  │                        │  │  Controller:              │ │
│  │                        │  │  [StaticNpcController]    │ │
│  └───────────────────────┘  └───────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  JSON 預覽:                                           │   │
│  │  { "id": "merchant", "name": "商人", ... }           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 6. 實作需求

### 6.1 Prompt 解析器
- [x] 支援自然語言關鍵字識別 (初步實作)
- [ ] 驗證輸入的檔案是否存在於 `public/assets/`
- [ ] 提供自動完成建議

### 6.2 預覽系統
- [ ] 即時渲染精靈圖動畫
- [ ] 顯示碰撞體覆蓋範圍
- [x] 驗證輸出 JSON 格式 (以唯讀模式顯示生成的 JSON)

### 6.3 輸出
- [x] 生成 Template JSON 到 `public/assets/game_obj_templates/`
- [ ] 可選：直接加入到當前 Scene

## 7. 與現有系統整合

```
rpg_obj_creator.md  ──生成──▶  game_obj_templates/
                                    │
                                    ▼
                           rpg_object_design.md
                                    │
                                    ▼
                           RpgSceneEditor.tsx
                                    │
                                    ▼
                           Scene Instance
```

### 7.1 編輯器整合
- **上方選單**：新增 "Create Template" 按鈕來開啟 Creator UI。
- **右側 Inspector**：在 Editor 中已有 Template 屬性面板，Creator 中也提供對應的 Property 編輯。
- **JSON 預覽**：即時更新。
- **自動載入**：Template 生成後自動觸發 Reload 並加入 Editor 的 Palette。

### 7.2 編輯功能
- **複製/修改**：已有 Template 的快速複製修改功能
- **版本控制**：Template 編輯歷史記錄
- **驗證模式**：生成前進行 JSON 格式與引用驗證

## 8. 未來擴展

- **AI 生成圖片**：使用 DALL-E/Midjourney API 直接生成 Sprite
- **AI 生成對話**：自動產生 NPC 對話樹
- **範本市場**：分享/匯入其他玩家的 Template