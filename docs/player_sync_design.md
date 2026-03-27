# Player and NPC Synchronization Design

## Overview
This document outlines the synchronization mechanism for the RPG mode in the Monster Battle game. The goal is to allow real-time synchronization of players and NPCs on the same map, including their positions, names, actions, and an integrated chat system.

## Components

### 1. Backend API & Socket.IO (`backend/main.py`, `backend/socket_app.py`)
- **NPC Data Management:** REST APIs (`POST /api/npc`, `PUT /api/npc/{id}`, `DELETE /api/npc/{id}`, `GET /api/npcs`) are provided to manage NPCs in the `game_npcs` Supabase table.
- **In-Memory Cache:** `rpg_npcs` dictionary is used to hold the current active state of NPCs, loaded at startup.
- **Socket Events:**
  - `rpg_connect`: Sent by the client upon joining the RPG mode. Includes player name and sprite info. The backend responds with `current_players` and `current_npcs` to initialize the client's state, and broadcasts `player_joined` to others.
  - `player_moved`: Sent by the client to update their position and animation. Broadcast to other players.
  - `chat_message`: Broadcasts chat messages to all clients in the RPG mode.
  - `npc_created`, `npc_updated`, `npc_deleted`: Broadcast whenever an NPC is modified via the REST APIs, keeping clients synced.

### 2. Frontend (`src/components/RpgMode.tsx`)
- **State Management:** The client stores active players in `otherPlayers`, NPCs in `npcs`, and their respective name tags in `nameTags`.
- **Rendering:** Phaser is used to render sprites. When a player or NPC joins/updates, the sprite is loaded (or pulled from cache) and placed at the given `x`, `y` coordinates.
- **Name Tags:** A text object is created and anchored above each sprite (`sprite.y - 40`).
- **Chat UI:** A chat overlay is displayed alongside the game. Messages are stored in React state and displayed in a scrollable list. The chat UI is responsive (appears below the game on mobile and on the left on desktop) and includes a collapse/expand toggle.

### 3. Database (`game_npcs` table)
Stores permanent NPC data.
- `id`: Unique identifier (String)
- `name`: Display name (String)
- `x`, `y`: Position coordinates (Float)
- `role_walk_sprite`, `role_atk_sprite`: Texture names (String)
- `map_id`: Identifier for the map (String)
- `dialog`: Optional dialog text (String)

## Flow

1. **Connection:** Client emits `rpg_connect` with `name` and sprite data.
2. **Initialization:** Server responds with existing `rpg_players` and `rpg_npcs`. Client renders them and creates their name tags.
3. **Movement:** As the user interacts (joystick/keys), `player_moved` is emitted to the server with `x`, `y`, `anim`, and `frame`.
4. **Broadcast:** Server forwards `player_moved` to other clients.
5. **Update UI:** Other clients update the specific player's sprite position and play the associated animation. The name tag position is also updated.
6. **Chatting:** Client emits `chat_message`. Server forwards it to all. Clients append to their chat UI.
