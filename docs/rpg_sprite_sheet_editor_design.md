# RPG Sprite Sheet Editor Design Specification

## 1. Objective
Implement a sprite sheet editor that allows users to import raw images, crop them into predefined tile sizes, manage a working queue of cropped tiles, and output them into a combined tileset PNG and a corresponding metadata JSON file. This tool will streamline the creation of tilesets for the RPG map editor.

## 2. Requirements

### 2.1 Core Features
* **Import Raw Image:** Import one or many image files (png, jpg, etc.) to a raw image queue. Users can select a file in the queue to preview the raw image.
* **Tile Size Definition:** Ability to define tile size in pixels (width x height, e.g., 32x32, 64x64).
* **Predefined Sizes:** A dropdown list with predefined tile sizes: `32x32`, `64x64`, `32x64`, `64x32`, and `customized`. If `customized` is selected, two extra inputs for width and height appear to let the user specify arbitrary tile sizes.
* **Working Queue:** A tile working queue to save tiles. When a user crops the raw image, the cropped tile is saved to this queue first.
* **Output Queue:** A tile output queue for the final tileset output.
* **Rename Output:** Ability to rename the output tileset name.
* **Save Functionality:** A "save" icon button in the toolbar to save the tileset metadata JSON file and the tileset PNG file directly into the `public/assets/map_tileset/` folder.
* **Load Functionality:** A "load" icon button in the toolbar to load a tileset metadata JSON file from the `public/assets/map_tileset/` folder. Loading a JSON file must also process its associated PNG file and populate the tile output queue.
* **Metadata Preview:** Ability to preview the output tileset metadata JSON file in the left sidebar.
* **Cropping Interface:** The right sidebar (main area) can draw a cropping edge/rectangle and adjust its width/height.
* **Tab Navigation:** The left sidebar supports a tab menu to switch functions between `Raw Files`, `Working Queue`, `Output Queue`, and `JSON Preview`.

## 2.2 Advanced Requirements (v1.1)

* **Manual Crop Mode:** A checkbox in the toolbar to toggle "manual crop mode". When active, the crop rectangle can be moved freely without grid snapping via mouse drag or keyboard arrow keys.
* **Hotkeys:** Pressing "c" will perform a "crop selection" and add the current selection to the working queue.
* **Offsets & Gaps:** Toolbar inputs for `offset x`, `offset y`, `gap-x`, and `gap-y`. The cropping grid calculations and manual arrow key movements will respect these settings.
* **Grid Overlay:** A toggle icon button in the toolbar to show/hide a visual grid overlay, assisting users in identifying tile boundaries based on size, offsets, and gaps.
* **Zoom:** Mouse scroll wheel support to zoom in and out of the raw image preview.
* **Image Scaling:** Inputs to scale the raw image down/up (width and height) to adjust high-resolution images to the desired tile scale, complete with undo/redo functionality for these scaling actions. When a scaling action is performed (or undone/redone), the view automatically resets the zoom to 100% and resets the pan coordinates to (0,0) to ensure the newly sized image remains visible.
* **Output Queue Reordering:** Support drag-and-drop mouse reordering of tiles within the Output Queue.
* **Color Picker/Transparency:** A color input in the toolbar to specify a transparent color. An eyedropper button (hotkey 'd') allows clicking a pixel on the raw image to set the transparent color. A "Set Transparent" button (hotkey 't') processes the raw image, filling all matching pixels with transparency and saving the result to the history stack.

## 3. Architecture & Components

### 3.1. Frontend (`src/components/SpriteSheetEditor.tsx`)
A React component that acts as a standalone editor view.
* **State Management:**
  * `rawImages`: Array of `{ name, dataUrl }`.
  * `workingQueue`: Array of `{ id, dataUrl }`.
  * `outputQueue`: Array of `{ id, dataUrl }`.
  * `selectedRawImage`: Index or reference to the currently previewed raw image.
  * `tileSize`: String (e.g., '32x32').
  * `outputName`: String.
  * `activeTab`: Enum (`RAW`, `WORKING`, `OUTPUT`, `JSON`).
* **UI Layout:**
  * **Toolbar:** Top bar containing the generic buttons (Save, Load), Dropdown for Tile Size, Input for Output Name.
  * **Left Sidebar:** Tabbed container for managing the queues and previewing JSON.
  * **Main Area:** Canvas or interactive area to display the `selectedRawImage` and provide a draggable/resizable cropping rectangle.

### 3.2. Backend (`backend/main.py`)
To satisfy the requirement of saving directly to `public/assets/map_tileset/`, a new API endpoint is required.
* **Endpoint:** `POST /api/map/tileset/save`
* **Payload:** JSON containing `name`, `metadata` (JSON object), and `image_base64` (Base64 string of the combined PNG).
* **Action:** Decodes the Base64 image and saves both the PNG and JSON files to `dist/assets/map_tileset/` (if it exists) and `public/assets/map_tileset/`.

## 4. Current Implementation Status

### Implemented Features
- Basic image import (raw file queue)
- Working queue for cropped tiles
- Output queue for final tileset
- Tab navigation (Raw/Working/Output/JSON)
- Tile size presets (32x32, 64x64, etc.)
- Canvas-based cropping interface
- Save tileset to backend

### Missing Features
- Manual crop mode (free movement)
- Hotkey support (c, d, t)
- Offset/gap settings
- Grid overlay toggle
- Zoom controls
- Image scaling inputs
- Drag-and-drop reordering
- Color picker/transparency

## 5. Conflict Analysis
* No significant conflicts with existing components. The existing `/api/map/tilesets` endpoint reads JSON files from the `map_tileset` directory, which correctly aligns with the load functionality.
* We need to ensure that the backend API handles base64 decoding robustly and writes to both `dist/` and `public/` to prevent issues during local dev versus production wheel deployments.
