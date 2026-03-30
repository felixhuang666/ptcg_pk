## Task Info
- TID: 561
- CHANGE_PREFIX: 20260330-2057
- Major Category: frontend

## Prompt
RPG mode play mode 無法正常顯示... 進入地圖後, 在canvas看不到圖塊tiles_set... 切換地圖也看不到

## Original Branch Commit ID
8e8a690e8e4c5cffabd269b79218e42e8af872c9

## Root Cause
1. `RpgMode.tsx` fetched `/api/map` without extracting the `map_data` property from the JSON response wrapper, causing `this.mapData.height` to be `undefined`, which resulted in an empty tilemap rendering.
2. The `<PhaserGame>` component did not receive `currentMapId` as a prop and did not fetch the specific map by ID. Map switching only updated state in the parent without triggering the Phaser scene to load the new map.

## Solution
1. Updated `MainScene.create()` to fetch `/api/map?id=${currentMapId}` and handle the `data.map_data` wrapper correctly.
2. Added `loadNewMap` to `MainScene` to dynamically fetch and re-render a map by ID.
3. Passed `currentMapId` into the `<PhaserGame>` component and added a `useEffect` to trigger `loadNewMap` whenever the selected map changes.
