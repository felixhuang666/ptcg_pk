# Application TODOs & Implementation Status

This document tracks the current state of implementation and known issues. See `docs/design_todo.md` and `docs/design_conflict.md` for historical technical debt.

## 1. Resolved Items

| Issue | Resolution |
|-------|------------|
| Map Layer Editor Toggle UI | Layer visibility toggles (eye icons) added to Map Editor top bar |
| Top Header Navigation | Documented in `docs/ui_header_navigation_design.md` |
| RPG Sprite Sheet Editor Features | All advanced features (Manual Crop, Hotkeys, Offset/Gap, Grid, Zoom, Scaling, Reordering, Color Picker) implemented |
| Quest Editor | Implemented scene lists, default scene linking, and both DB/Local saving capabilities |
| Camera feature | Implement camera capture for custom monsters |
| RPG Scene Dropdown | Add scene dropdown grouped by quest in RPG Mode |

## 2. RPG Scene Editor - Missing Features

| Feature | Priority | Status |
|---------|----------|--------|
| Layer Visibility Toggles | Medium | Not Implemented |
| Mode Switch (Scene/Map/Preview) | High | Not Implemented |
| Outliner Tab | Medium | Not Implemented |
| Asset Manager Tab | Medium | Not Implemented |
| NPC Patrol Paths | Low | Not Implemented |
| Dialog Tree Editor | Low | Not Implemented |
| Scripting Integration | Low | Not Implemented |
| Physics Configuration UI | Low | Not Implemented |
| Scene Preview Mode | Medium | Not Implemented |
| Prefabs (Chest, Signpost, etc.) | Medium | Not Implemented |

## 3. Game Logic Issues

### 3.1 Tile Index Inconsistencies
- **Issue**: Frontend `RpgMapEditor.tsx` sometimes handles tiles as 0-based and sometimes 1-based
- **Action Needed**: Formal fix required in both map procedural generation and tilemap usage
- **Workaround**: Code uses checks like `val !== 0 && val !== -1`

### 3.2 Event Layer Handling
- **Issue**: `objectEvent` layer triggers not implemented in main `RpgMode` gameplay loop
- **Action Needed**: Implement event dispatch system for step triggers

## 4. Data Persistence

### 4.1 Supabase Integration
- Game data can be loaded from Supabase at startup
- Falls back to local defaults if Supabase unavailable
- Admin can modify game balance via API

### 4.2 Local File Storage
- Maps saved to `public/assets/maps/`
- Tilesets saved to `public/assets/map_tileset/`
- Game scenes saved via REST API

## 5. Known Technical Debt

1. **Type Consistency**: Backend types (Python dataclasses) and frontend types (TypeScript) should be auto-generated from a shared schema
2. **Socket.IO Reconnection**: Handle reconnection scenarios gracefully
3. **Map Procedural Generation**: Ensure deterministic output for same seed
4. **Animation State Machine**: Player/NPC animations should have proper state transitions
5. **AI Generation Mocking**: The AI generation engine in the `GameObjectTemplateCreator` is currently a hardcoded mock using keyword recognition and needs to be replaced with a real LLM API integration.

## 6. Design Conflicts

### 6.1 `scene_entities` Schema Desync
- **Conflict**: The `docs/rpg_scene_design.md` specifies a `scene_entities` object containing arrays for `npcs`, `items`, and `events`. However, the actual codebase extensively relies on a `game_objects` array nested within `scene_entities` to manage dynamic elements in `RpgSceneEditor.tsx` and `RpgMode.tsx`.
- **Resolution Needed**: Update `docs/rpg_scene_design.md` to include `game_objects` as a primary array within the `scene_entities` definition.

### 6.2 Map List Nesting Inconsistency
- **Conflict**: Scene map lists are inconsistently structured in the backend payload. Sometimes `map_list` is present at the top level of `sceneData` (`sceneData.map_list`), and other times it is nested within `scene_entities` (`sceneData.scene_entities.map_list`).
- **Resolution Needed**: Standardize the backend response to place `map_list` predictably. Currently, the frontend mitigates this by checking both paths.
