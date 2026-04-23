# RPG Mode Design Document

## 1. Overview
RPG Mode is a multi-player, real-time map exploration feature within "Monster Battle". It allows players to walk around the map, interact with others, chat in real-time, and trigger map events.

## 2. UI Design
- **Map Viewport**: Central full-screen or maximized container powered by the Phaser game engine.
- **Header Navigation**: Contains actions like 'Back', 'Refresh', 'Settings', 'Map/Scene Editor toggles, and a toggle for full-screen mode. It also includes a scene dropdown grouped by quest, allowing players to navigate between scenes linked to the active quest.
- **Chat Interface**: Floating/collapsible window showing real-time messages and an input field for sending chat messages to the current map session.
- **Controls**: On-screen buttons (e.g., Attack/Action modes) are overlayed on top of the map viewport. Supports touch inputs and virtual joystick on mobile devices.
- **Status Overlay**: Lightweight overlay providing current coordinates, map name, and current zoom level.

## 3. Implementation Details (Frontend & Backend)

### 3.1 Frontend (React + Phaser)
- Developed using React 19 and Vite 6, utilizing `RpgMode.tsx` to handle React lifecycle, state management, and UI overlays.
- `PhaserGame` (internal to `RpgMode.tsx`) handles map rendering across 6 distinct layers (`base`, `decorations`, `obstacles`, `objectCollides`, `objectEvent`, `topLayer`).
- Implements a Field of View (FOV) / Fog of War mechanism to cull visual visibility of out-of-range players/NPCs and draw darkness outside the player's immediate radius.
- The `topLayer` actively monitors the player's coordinate to apply dynamic transparency (reducing alpha) when the player walks "under" an element on this layer.
- Implements dynamic tileset loading (`/api/map/tilesets`) to accurately map tile IDs to the proper visual textures.
- State management relies on Zustand (`appStore`) for user roles and global state.
- Component communicates with Backend via WebSocket (`socket.io-client`).

### 3.2 Backend (FastAPI + Socket.IO)
- Hosts WebSocket server to manage player connections (`rpg_connect`, `player_moved`, `chat_message`).
- Broadcasts real-time events (`current_players`, `player_joined`, `player_moved`, `player_left`, `chat_message`) back to all connected clients.
- Serves dynamic static assets (sprites, tilesets) and map data via REST endpoints (`/api/map`, `/api/maps`, `/api/map/tilesets`).

## 4. External Data Interaction
- **Database (Supabase)**: User authentication and persistent profiles/roles are synced via REST API endpoints (`/api/auth/me`).
- **Map Data**: Stored dynamically on the server or in persistent storage (e.g., Supabase storage/database) and fetched at initialization.
- **State Synchronization**: Position and animations are synchronized locally in memory on the server during the session. Map updates are broadcasted to active clients via `map_updated_v2` events.

## 5. Player Controls
- **Movement**: WASD keys or arrow keys for desktop; virtual joystick for mobile.
- **Action**: Spacebar or on-screen button to interact with NPCs/objects.
- **Camera**: Follows player with smooth interpolation; supports manual pan via middle mouse button or spacebar + drag.

## 6. Multiplayer Sync Protocol
| Event | Direction | Payload |
|-------|-----------|---------|
| `rpg_connect` | Client → Server | `{ name, sprite, x, y }` |
| `current_players` | Server → Client | Array of player states |
| `player_joined` | Server → Client | New player data |
| `player_moved` | Bidirectional | `{ id, x, y, anim, frame }` |
| `chat_message` | Bidirectional | `{ sender, message, timestamp }` |
| `player_left` | Server → Client | `{ id }` |
