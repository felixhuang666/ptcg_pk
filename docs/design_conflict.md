# Design Conflicts & Resolutions

This document tracks identified conflicts between original design specifications and the actual implementation within the codebase, along with notes on how they are (or should be) resolved.

## 1. Map Layer Architecture Evolution
*   **Conflict**: The original `RpgMapEditor` design only defined two layers: a "Ground" layer (`tiles`) and an "Object" layer (`objects`). However, the implementation has since evolved to utilize a comprehensive 6-layer architecture (`base`, `decorations`, `obstacles`, `objectCollides`, `objectEvent`, `topLayer`).
*   **Resolution**: Documentation across `docs/rpg_map_editor_design.md` and `docs/rpg_mode_design.md` has been updated to reflect the new 6-layer standard.

## 2. Hardcoded Tiles vs. Dynamic Tilesets
*   **Conflict**: Early implementations of the map editor and RPG mode used hardcoded tile index assumptions (e.g., `2` for grass, `48` for water, `94` for mountain). The new system dynamically loads tileset metadata from `/api/map/tilesets` and maps index values to whatever tileset is currently active.
*   **Resolution**: Hardcoded references have been minimized. The frontend now fetches the `__ACTIVE_TILESET__` global object and calculates tile source positions based on dynamic rows/columns and IDs.

## 3. Tile Index Base (0-based vs 1-based)
*   **Conflict**: There is inconsistency regarding whether tile IDs are 0-based or 1-based.
    *   Tileset JSON metadata uses 1-based IDs (e.g., `id: 1` is the first tile).
    *   Phaser's `putTileAt` traditionally expects 0-based indexing for calculations but sometimes 1-based depending on how the tileset was added.
    *   The current `renderMap` method in `RpgMapEditor.tsx` has code indicating confusion: `l.putTileAt(name === 'base' || name === 'decorations' || name === 'topLayer' ? val : val, x, y);`. Note that previously it attempted `val + 1`.
*   **Resolution**: This remains an active technical debt item. The frontend seems to currently work around it by injecting 1-based IDs directly into the map JSON `layers` arrays and using those exact values in Phaser. However, a formal unification of the index baseline is required (See `docs/design_todo.md`).