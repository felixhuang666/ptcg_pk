# RPG Sprite Sheet Editor Design Specification

## 1. Objective
Implement a sprite sheet editor that allows users to import raw images, crop them into predefined tile sizes, manage a working queue of cropped tiles, and output them into a combined tileset PNG and a corresponding metadata JSON file. This tool will streamline the creation of tilesets for the RPG map editor.

## 2. Requirements

*   **Import Raw Image:** Import one or many image files (png, jpg, etc.) to a raw image queue. Users can select a file in the queue to preview the raw image.
*   **Tile Size Definition:** Ability to define tile size in pixels (width x height, e.g., 32x32, 64x64).
*   **Predefined Sizes:** A dropdown list with predefined tile sizes: `32x32`, `64x64`, `32x64`, `64x32`.
*   **Working Queue:** A tile working queue to save tiles. When a user crops the raw image, the cropped tile is saved to this queue first.
*   **Output Queue:** A tile output queue for the final tileset output.
*   **Rename Output:** Ability to rename the output tileset name.
*   **Save Functionality:** A "save" icon button in the toolbar to save the tileset metadata JSON file and the tileset PNG file directly into the `public/assets/map_tileset/` folder.
*   **Load Functionality:** A "load" icon button in the toolbar to load a tileset metadata JSON file from the `public/assets/map_tileset/` folder. Loading a JSON file must also process its associated PNG file and populate the tile output queue.
*   **Metadata Preview:** Ability to preview the output tileset metadata JSON file in the left sidebar.
*   **Cropping Interface:** The right sidebar (main area) can draw a cropping edge/rectangle and adjust its width/height.
*   **Tab Navigation:** The left sidebar supports a tab menu to switch functions between `Raw Files`, `Working Queue`, `Output Queue`, and `JSON Preview`.

## 3. Architecture & Components

### 3.1. Frontend (`src/components/SpriteSheetEditor.tsx`)
A new React component that will act as a standalone editor view.
*   **State Management:**
    *   `rawImages`: Array of `{ name, dataUrl }`.
    *   `workingQueue`: Array of `{ id, dataUrl }`.
    *   `outputQueue`: Array of `{ id, dataUrl }`.
    *   `selectedRawImage`: Index or reference to the currently previewed raw image.
    *   `tileSize`: String (e.g., '32x32').
    *   `outputName`: String.
    *   `activeTab`: Enum (`RAW`, `WORKING`, `OUTPUT`, `JSON`).
*   **UI Layout:**
    *   **Toolbar:** Top bar containing the generic buttons (Save, Load), Dropdown for Tile Size, Input for Output Name.
    *   **Left Sidebar:** Tabbed container for managing the queues and previewing JSON.
    *   **Main Area:** Canvas or interactive area to display the `selectedRawImage` and provide a draggable/resizable cropping rectangle.

### 3.2. Backend (`backend/main.py`)
To satisfy the requirement of saving directly to `public/assets/map_tileset/`, a new API endpoint is required.
*   **Endpoint:** `POST /api/map/tileset/save`
*   **Payload:** JSON containing `name`, `metadata` (JSON object), and `image_base64` (Base64 string of the combined PNG).
*   **Action:** Decodes the Base64 image and saves both the PNG and JSON files to `dist/assets/map_tileset/` (if it exists) and `public/assets/map_tileset/`.

## 4. Conflict Analysis
*   No significant conflicts with existing components. The existing `/api/map/tilesets` endpoint reads JSON files from the `map_tileset` directory, which correctly aligns with the load functionality.
*   We need to ensure that the backend API handles base64 decoding robustly and writes to both `dist/` and `public/` to prevent issues during local dev versus production wheel deployments.
