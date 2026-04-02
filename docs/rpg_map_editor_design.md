# RPG Map Editor Design Document

## 1. Overview
The RPG Map Editor is a dedicated tool within "Monster Battle" for creating, editing, and saving custom game maps. It was extracted into a standalone component (`RpgMapEditor.tsx`) to separate concerns and simplify the main RPG game logic.

## 2. UI Layout
The map editor interface is divided into a central canvas and configurable sidebars:

- **Top Bar**: Controls for map selection, reloading map data, grid toggle, info overlay toggle, mode switching (draw/move), layer selection (`Base`, `Decor`, `Obs`, `ObjCol`, `ObjEvt`, `Top`), eraser toggle, undo/redo, saving, creating new empty maps, and generating random maps.
- **Left Sidebar (Tilesets)**: Allows selection of dynamic tilesets loaded from the backend. Provides a visual grid of available tiles for the active visual layer, and predefined logical IDs when a logical layer is selected.
- **Right Sidebar (Details & Settings)**:
  - *Tile Details Tab*: Shows information about the currently selected tile, including source image, dimensions, category, and tags.
  - *Advanced Settings Tab*: Provides controls to rename the map, resize the map's width and height dynamically, and adjust the block size properties.
- **Editor Canvas**: A Phaser-powered interactive grid allowing users to pan, zoom (via scroll or pinch), and paint tiles onto the selected layer.

## 3. Implementation Details (Frontend & Backend)

### 3.1 Frontend (React + Phaser)
- Implemented in `RpgMapEditor.tsx` using React for the interface and Phaser for rendering the tilemap.
- Uses a dedicated `PhaserGame` optimized for pointer down/move interactions on a grid system (painting/erasing tiles across 6 distinct layers).
- Features Undo/Redo stacks maintained in the Phaser scene to track layer state modifications.
- Supports dynamic loading of tileset metadata (`/api/map/tilesets`) to populate the UI and render visual layers accurately.

### 3.2 Backend (FastAPI)
- Uses RESTful endpoints to load (`GET /api/maps`, `GET /api/map?id=...`) and save (`POST /api/map`) map data.
- Includes a procedural generation endpoint (`POST /api/map/generate`) to quickly scaffold new maps.
- Maps are serialized as JSON structures containing dimensions (`width`, `height`, `block_width`, `block_height`) and a nested `layers` object containing 1D arrays for the 6 layers.

## 4. Map Architecture & Layers
Maps have evolved from a simple 2-layer structure to a comprehensive 6-layer architecture:
- `base`: Visual ground.
- `decorations`: Visual enhancements.
- `obstacles`: Logical collisions (walls).
- `objectCollides`: Logical interactive colliders.
- `objectEvent`: Logical triggers.
- `topLayer`: Visual elements drawn above the player with dynamic transparency.

## 5. External Data Interaction
- **Database (Supabase/Local Storage)**: Maps are stored server-side. The `/api/map` endpoint is responsible for persisting the map layout JSON objects to the underlying database.
- **Map Retrieval**: React effect hooks fetch the list of available maps on component mount. Selecting a map triggers a re-fetch of the specific map data layout.
- **Save Operations**: Emits updated map JSON payloads directly to the server, overriding the existing `id`.