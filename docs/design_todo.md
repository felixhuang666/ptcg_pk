# Design TODOs

This document tracks actionable technical debt and planned features identified during architectural reviews.

## 1. Unify Tile Index Base Logic
*   **Description**: Clarify and standardize the 0-based vs 1-based tile indexing logic across the entire stack.
*   **Action Items**:
    *   Audit the backend map procedural generation scripts to ensure they output the correct index base.
    *   Audit the frontend `RpgMapEditor.tsx` and `RpgMode.tsx` to handle index mapping consistently when converting between the UI selection, the JSON `map_data` arrays, and Phaser's `putTileAt`.
    *   Clean up redundant code like `val ? val : val` in the rendering loop.

## 2. Implement `objectEvent` Logic
*   **Description**: The 6-layer architecture defines an `objectEvent` layer for triggers (teleports, cutscenes), but the main RPG game loop currently only renders them and does not process interactions.
*   **Action Items**:
    *   Implement collision/overlap detection in `RpgMode.tsx` Phaser scene between the player sprite and tiles in the `objectEvent` layer (e.g., IDs 20000+).
    *   Hook these triggers up to external React state or Socket.io events.

## 3. Enhance Map Editor Layer Visibility
*   **Description**: Editing complex maps with 6 layers is difficult when the `topLayer` obscures the `base` and `decorations` layers.
*   **Action Items**:
    *   Add "eye" icons next to the layer selection buttons in the `RpgMapEditor` Top Bar.
    *   Wire these toggles to the `.setVisible()` properties of the corresponding Phaser `TilemapLayer` instances.

## 4. Standardize Tileset Fallbacks
*   **Description**: If a map's associated tileset image is missing or the backend fails to load the JSON metadata, the map can crash or render black squares.
*   **Action Items**:
    *   Implement robust fallback image generation or a default "missing texture" tileset.
    *   Ensure the active tileset metadata is deeply merged with safe defaults before rendering.