# Application TODOs & Conflicting Designs

This document tracks conflicting designs, implementation differences, or general issues that must be addressed in the future. See `docs/design_todo.md` and `docs/design_conflict.md` for older or deeper technical debt.

## 1. Map Layer Editor Toggle UI
*   **Conflict / Missing Implementation**: `docs/rpg_map_layer_design.md` mentions a planned feature: "Enhance the editor UI to allow hiding/showing individual layers during the editing process." However, this is not fully implemented in the UI yet.

## 2. RPG Scene Editor - Phaser Rendering
*   **Difference**: `docs/rpg_scene_design.md` specifies that "The global grid... When a map is placed... local tiles are rendered at those global coordinates." Currently, the implementation of `RpgSceneEditor.tsx` renders a green bounding box (`rect = this.add.rectangle(...)`) to represent the map chunks instead of actually rendering the static map layers.
*   **Resolution**: (Resolved) The spec has been updated to mention bounding box representations.

## 3. Top Header Navigation Buttons
*   **Design Note**: `docs/rpg_mode_design.md` describes a "Header Navigation" containing only a few actions (`Back`, `Refresh`, `Settings`, `Fullscreen`). However, the implementation adds multiple robust navigation methods (`Map` toggles, `Scene` toggles, etc.), which we've now documented in `docs/ui_header_navigation_design.md`.
*   **Resolution**: `docs/rpg_mode_design.md` should be considered an overview, while `docs/ui_header_navigation_design.md` provides the specific details for the headers.

## 4. Tile Index Logic Inconsistencies
*   **Conflict**: Documented in `docs/design_conflict.md` and `docs/design_todo.md`, the frontend `RpgMapEditor.tsx` sometimes handles tiles as 0-based and sometimes 1-based, relying on index checks like `val !== 0 && val !== -1`.
*   **Action Needed**: This still remains to be formally fixed in both map procedural generation on the backend and tile map usage on the frontend.

## 5. RPG Scene Editor UI Inconsistencies
*   **Conflict / Missing Implementation**: `docs/rpg_scene_design.md` specifies several features and UI elements that are currently missing in `RpgSceneEditor.tsx`:
    *   **Layer Visibility Toggles**: Missing toggles for static map layers vs. dynamic entity layers in the Top Bar.
    *   **Mode Switch**: Missing `[ Scene Composition | Map Paint | Preview ]` in the Top Bar.
    *   **Left Sidebar Tabs**: Missing "Outliner Tab" and "Asset Manager Tab". The current implementation only shows stacked "Scenes" and "Palette" sections without proper tabbed navigation.
    *   **Scripting & Logic Integration**: The integrated text/script editor for custom object logic and scene lifecycle hooks is not implemented.
    *   **NPC & Dialog Tools**: The Path Tool for patrol routes and the Dialog Tree editor are not implemented.
    *   **Preview & Debugging Modes**: The interactive Scene Preview (Inspector Mode) and Game Preview functionalities are missing.
    *   **Advanced Physics Integration**: The UI for configuring Matter/Arcade physics properties directly from the inspector is missing.

## 6. RPG Scene Editor Missing Features
*   **Conflict / Missing Implementation**: `docs/rpg_scene_design.md` specifies several features that are currently missing in `RpgSceneEditor.tsx`:
    *   **Prefabs**: Dragging and dropping predefined "Prefabs" (e.g., Chest, Signpost, Switch).
    *   **Path Tool**: A "Path Tool" for NPC patrol paths.
    *   **Dialog Trees**: Node-based or JSON-based dialog editor in the Property Editor.
    *   **Scripting & Logic Integration**: Integrated text/script editor for defining custom logic (e.g., Scene Lifecycle Hooks, Custom Object Logic).
    *   **Physics Integration**: One-click conversion of Sprites/Images into physical Matter/Arcade bodies.
