# Map Editor UI Refactor and Tileset Integration

**TID:** 551
**CHANGE_PREFIX:** 20260329-1422

## User Prompt
Refactor map editor:
- adjust default map's size to 40x40;
- check current map's data (in-memory or in supabase), update the size (40x40) to all maps, include working maps
- add collapsible left side bar for map elements for admin to select elements to draw into to map
- add collapsible left side bar for detailed of selected the element, include the file name, positon (x,y,w,h) of the file name
- search files in map_tileset folder (dist/assets/map_tileset/xxxx_tileset.json) and render elements from the selected file (xxxx_tileset.png); xxxx_tileset.json defines elements data and pictures in xxxx_tileset.png
- add toggle icon button in tool bar to hide/show the left side bar and right side bar

## Root Cause
- The old Map Editor layout hardcoded a 200x200 grid dimension and forced users to select from a small set of fixed tiles via a static dummy tileset.
- There was no UI allowing admins to select from multiple advanced tilesets or see individual tile properties from external files.
- The Phaser game initialization similarly hardcoded the tileset keys.

## Solution
- **Backend Size Change:** Changed map creation logic (in `backend/main.py`) and existing in-memory defaults to generate a `width: 40`, `height: 40` layout instead of `200x200`. Updated unit tests to expect 1600 total elements in `tiles` and `objects`.
- **Database Migration:** Created a database migration script `scripts/migrate_20260329_1422_resize_maps_40x40.py` that loops over Supabase maps, truncates dimensions exceeding 40x40, and copies existing structures into new 40x40 layouts.
- **Dynamic Tileset Endpoint:** Added `GET /api/map/tilesets` to search `public/assets/map_tileset` and retrieve all valid tileset `.json` definition files.
- **Frontend Refactor (`RpgMapEditor.tsx`):**
  - Added two collapsible sidebars wrapped around the core `PhaserGame` element.
  - Implemented header toggles utilizing `PanelLeft` and `PanelRight` from `lucide-react`.
  - Left Sidebar uses `fetch` to grab available tilesets, lets users select an active JSON tileset, and displays available tiles as a graphical grid parsed using their `x, y` offsets from the source image.
  - Right Sidebar updates dynamically based on the clicked element to show detailed properties (Image source, dimensions, metadata from the JSON).
- **Phaser Integration:** `MainScene` now dynamically preloads the `image_source` specified in the `activeTileset` context to render maps appropriately, falling back correctly if missing.
