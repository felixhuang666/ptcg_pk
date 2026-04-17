# RPG Map Layer Design Document

## 1. Overview
The RPG Map system in "Monster Battle" utilizes a multi-layered tilemap approach to create rich, interactive environments. This architecture separates visual presentation from logical interactions (such as collisions and events), providing flexibility for both map creators and the game engine.

## 2. Layer Architecture
The system consists of 6 distinct layers, rendered from bottom to top:

### 2.1 Base Layer (`base`)
* **Purpose**: The fundamental ground layer (e.g., grass, dirt, water, paths).
* **Collision**: None (players can freely walk on these tiles unless obstructed by higher layers).
* **Data**: Uses standard visual tiles from the active tileset.

### 2.2 Decorations Layer (`decorations`)
* **Purpose**: Non-colliding visual enhancements placed on top of the base layer (e.g., flowers, small stones, markings).
* **Collision**: None.
* **Data**: Uses standard visual tiles from the active tileset. Rendered with depth 1.

### 2.3 Obstacles Layer (`obstacles`)
* **Purpose**: Invisible (or visible if needed) logical barriers that prevent movement (e.g., invisible walls, solid boundaries).
* **Collision**: Yes. The player's physics body will collide with these tiles.
* **Data**: Typically uses specific, non-visual logical tile IDs (e.g., `0` for empty, `1` for wall).

### 2.4 Object Collides Layer (`objectCollides`)
* **Purpose**: Interactive solid objects in the world (e.g., rocks, trees, fences).
* **Collision**: Yes.
* **Data**: Uses logical tile IDs in the 10000+ range (e.g., `10001` for `obj_1`). These IDs map to specific visual representations or metadata handled dynamically.

### 2.5 Object Event Layer (`objectEvent`)
* **Purpose**: Invisible triggers that execute specific game logic when the player steps on or interacts with them (e.g., teleports, NPC spawns, cutscene triggers).
* **Collision**: None (they are triggers, not solid objects).
* **Data**: Uses logical tile IDs in the 20000+ range (e.g., `20001` for `evt_1`).

### 2.6 Top Layer (`topLayer`)
* **Purpose**: Visual elements that appear *above* the player, such as treetops, archways, or building roofs.
* **Collision**: None.
* **Interaction**: Dynamic transparency. When the player walks "under" a tile in this layer, the entire `topLayer`'s alpha is reduced (e.g., to 0.5) to reveal the player underneath.
* **Data**: Uses standard visual tiles from the active tileset. Rendered with a high depth (e.g., 10).

## 3. Data Structure & Backend
Maps are serialized and stored as JSON objects in the backend database. A typical map object includes:

```json
{
  "id": "map_id_string",
  "name": "Map Name",
  "map_data": {
    "width": 40,
    "height": 40,
    "block_width": 32,
    "block_height": 32,
    "layers": {
      "base": [/* 1D array of integers */],
      "decorations": [/* 1D array of integers */],
      "obstacles": [/* 1D array of integers */],
      "objectCollides": [/* 1D array of integers */],
      "objectEvent": [/* 1D array of integers */],
      "topLayer": [/* 1D array of integers */]
    }
  }
}
```

The layers are flat 1D arrays of size `width * height`. The value at index `y * width + x` represents the tile ID at coordinate `(x, y)`.

## 4. UI Layout in Editor
The `RpgMapEditor` component provides specific tools to manage these layers:
* **Layer Selection**: A set of toggle buttons in the top toolbar allows the user to switch the active `editLayer` (`Base`, `Decor`, `Obs`, `ObjCol`, `ObjEvt`, `Top`).
* **Brush Selection**:
  * For visual layers (`base`, `decorations`, `topLayer`), the left sidebar displays the loaded tileset, allowing the user to pick visual tiles.
  * For logical layers (`obstacles`, `objectCollides`, `objectEvent`), the left sidebar displays predefined logical IDs (e.g., `0: Empty`, `1: Wall`, `10001: obj_1`).
* **Visibility Toggle**: Layer visibility toggles (eye icons) in the Map Editor's top bar allow hiding specific layers during editing.

## 5. Related Operations
* **Drawing/Erasing**: When the user clicks the grid, the selected tile ID (or `0` if erasing) is updated *only* in the array of the currently active `editLayer`.
* **Resizing**: Changing map dimensions dynamically creates new 1D arrays for all 6 layers, copying existing data over and filling new space with defaults (`2` for base, `0` for others).
* **Rendering (Phaser)**: The `PhaserGame` loop initializes 6 separate `Phaser.Tilemaps.TilemapLayer` objects. The `topLayer` logic continuously checks the tile at the player's coordinate to adjust transparency.

## 6. Tile Index Convention

### Current Convention (1-based for visual tiles)
| Layer Type | Tile Range | Notes |
|------------|------------|-------|
| Visual tiles | 1-9999 | Standard tileset tiles |
| Object Collides | 10001+ | Object references |
| Object Events | 20001+ | Event triggers |
| Empty/None | 0 | No tile |

### Known Issues
- Tile index logic may have inconsistencies between 0-based and 1-based indexing across frontend, backend, and tileset generation.
- The code checks for both `val !== 0` and `val !== -1` in various places.

## 7. Future Enhancements
- Unify tile indexing logic across all components
- Implement functional event handling for `objectEvent` layer in RpgMode gameplay
- Add per-layer opacity controls
- Support animated tiles
