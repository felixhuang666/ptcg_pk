# RPG Map Editor Design Document

## 1. Overview
The RPG Map Editor is a dedicated tool within "Monster Battle" for creating, editing, and saving custom game maps. It was extracted into a standalone component (`RpgMapEditor.tsx`) to separate concerns and simplify the main RPG game logic.

## 2. UI Design
- **Top Bar**: Controls for map selection, renaming, and creating new empty/generated maps.
- **Tools Panel**: Configurable input fields for Width/Height resizing, Layer Selection (Ground/Object), and Brush Selection (Eraser or Tile Type).
- **Editor Canvas**: A Phaser-powered interactive grid allowing users to paint tiles and place objects.
- **Controls**: Includes 'Undo', 'Redo', and 'Save Map' buttons for quick map iterations.

## 3. Implementation Details (Frontend & Backend)
### 3.1 Frontend (React + Phaser)
- Implemented in `RpgMapEditor.tsx` using React for the interface and Phaser for rendering the tilemap.
- Includes a dedicated version of `PhaserGame` optimized for pointer down/move interactions on a grid system (painting/erasing tiles).
- Keyboard shortcuts implemented in Phaser for quick brush selection (e.g., 1 for Grass, 2 for Water, 3 for Rock).
- Features Undo/Redo stacks maintained in the Phaser scene to track tile modifications.

### 3.2 Backend (FastAPI)
- Uses RESTful endpoints to load (`GET /api/maps`, `GET /api/map?id=...`) and save (`POST /api/map`) map data.
- Includes procedural generation endpoint (`POST /api/map/generate`) to quickly scaffold new maps.
- Maps are serialized as JSON structures containing dimensions (`width`, `height`) and 1D arrays of tile/object indices (`tiles`, `objects`).

## 4. External Data Interaction
- **Database (Supabase/Local Storage)**: Maps are stored server-side. The `/api/map` endpoint is responsible for persisting the map layout JSON objects to the underlying database.
- **Map Retrieval**: React effect hooks fetch the list of available maps on component mount. Selecting a map triggers a re-fetch of the specific map data layout.
- **Save Operations**: Emits updated map JSON payloads directly to the server, overriding the existing `id`.
