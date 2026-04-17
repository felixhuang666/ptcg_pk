# Monster Battle - Architecture Overview

## 1. Project Structure

```
/home/felix/ptcg_pk/
├── backend/                      # Python FastAPI backend
│   ├── main.py                   # FastAPI entry point, OAuth, REST endpoints
│   ├── socket_app.py             # Socket.IO game logic & RPG sync
│   ├── game/                     # Game core logic
│   │   ├── types.py              # Pydantic/dataclass game models
│   │   ├── data.py               # Game data (monsters, skills, settings)
│   │   ├── logic.py              # Combat mechanics (damage, accuracy, skills)
│   │   └── supabase_client.py    # Database integration
│   └── tests/                    # Backend pytest tests
├── src/                          # React frontend
│   ├── components/               # React UI components
│   ├── shared/                   # Shared code between components
│   ├── store/                    # Zustand state management
│   ├── App.tsx                   # Main app router
│   └── main.tsx                  # Entry point
├── public/assets/                # Static game assets
│   ├── monsters/                 # Monster SVG images
│   ├── skills/                   # Skill SVG images
│   ├── players/                  # Player character sprites
│   ├── maps/                     # Pre-built map JSON files
│   ├── game_scene/               # Scene JSON files
│   ├── game_obj_templates/       # NPC/object templates
│   └── map_tileset/              # Tileset images & metadata
├── docs/                         # Design documentation
└── dist/                         # Built frontend output
```

## 2. Tech Stack

### Frontend
- **React 19** + **Vite 6** - UI framework and build tool
- **Phaser 3** - Game engine for RPG maps and tilemaps
- **Zustand 5** - State management with persistence
- **Socket.IO Client 4** - Real-time communication
- **Tailwind CSS 4** - Styling
- **Framer Motion 12** - Animations
- **Lucide React** - Icons

### Backend
- **FastAPI 0.111+** - REST API framework
- **Uvicorn 0.30+** - ASGI server
- **Python Socket.IO 5.11+** - WebSocket server
- **Supabase** - PostgreSQL database
- **Asteval** - Dynamic formula evaluation
- **Pytest** - Testing

## 3. Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (React)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Battle    │  │    RPG      │  │   Editors (Map/     │ │
│  │   Arena     │  │   Mode      │  │   Scene/Sprite)     │ │
│  └──────┬──────┘  └──────┬─────┘  └──────────┬──────────┘ │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│              ┌───────────▼───────────┐                      │
│              │     Zustand Store      │                      │
│              │   (appStore.ts)        │                      │
│              └───────────┬────────────┘                      │
└──────────────────────────┼───────────────────────────────────┘
                           │ Socket.IO / HTTP
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                    Server (FastAPI)                          │
│  ┌────────────────────┐  ┌────────────────────────────────┐  │
│  │   REST API         │  │    Socket.IO Server             │  │
│  │   (main.py)        │  │    (socket_app.py)             │  │
│  │   - /api/auth/*    │  │    - Game room management      │  │
│  │   - /api/map/*     │  │    - RPG sync                  │  │
│  │   - /api/scene/*   │  │    - Battle game loop          │  │
│  └─────────┬──────────┘  └──────────────┬─────────────────┘  │
│            │                             │                    │
│            └──────────────┬──────────────┘                    │
│                           │                                   │
│              ┌────────────▼────────────┐                    │
│              │     Game Logic           │                    │
│              │   (backend/game/)         │                    │
│              │   - types.py              │                    │
│              │   - data.py               │                    │
│              │   - logic.py              │                    │
│              └────────────┬──────────────┘                    │
└──────────────────────────┼───────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │     Supabase             │
              │     (PostgreSQL)         │
              └──────────────────────────┘
```

## 4. Key Components

### 4.1 Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| Battle | `Battle.tsx` | ATB combat arena UI |
| TeamEditor | `TeamEditor.tsx` | Monster & dice configuration |
| RpgMode | `RpgMode.tsx` | Multiplayer map exploration |
| RpgMapEditor | `RpgMapEditor.tsx` | Tile-based map creation |
| RpgSceneEditor | `RpgSceneEditor.tsx` | Multi-map scene composition |
| SpriteSheetEditor | `SpriteSheetEditor.tsx` | Tileset creation tool |
| BossSelect | `BossSelect.tsx` | Boss battle selection |
| Admin | `Admin.tsx` | Game settings panel |

### 4.2 Backend Modules

| Module | File | Purpose |
|--------|------|---------|
| Types | `game/types.py` | Pydantic models for game entities |
| Game Data | `game/data.py` | Monsters, skills, settings |
| Game Logic | `game/logic.py` | Combat calculations |
| Supabase Client | `game/supabase_client.py` | Database operations |

## 5. API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/me` | Get current user |
| GET | `/api/maps` | List all maps |
| GET | `/api/map?id={id}` | Get map by ID |
| POST | `/api/map` | Create/update map |
| POST | `/api/map/generate` | Generate random map |
| GET | `/api/map/tilesets` | List tilesets |
| GET | `/api/scenes` | List all scenes |
| GET | `/api/scene/{id}` | Get scene by ID |
| POST | `/api/scene` | Create scene |
| PUT | `/api/scene/{id}` | Update scene |
| DELETE | `/api/scene/{id}` | Delete scene |

### Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_room` | C→S | Join a battle room |
| `execute_skill` | C→S | Execute a skill |
| `give_up` | C→S | Forfeit the match |
| `toggle_auto` | C→S | Toggle auto-battle |
| `game_state_update` | S→C | Broadcast game state |
| `rpg_connect` | C→S | Connect to RPG mode |
| `player_moved` | C↔S | RPG player position |
| `chat_message` | C↔S | RPG chat message |

## 6. State Management

### Zustand Store (`appStore.ts`)

```typescript
interface AppState {
  // User
  user: User | null;
  isAuthenticated: boolean;
  
  // Navigation
  currentView: string;
  lastView: string;
  
  // Teams
  teams: TeamConfig[];
  currentTeamId: string;
  
  // RPG
  currentMapId: string;
  
  // Actions
  setUser: (user: User | null) => void;
  setCurrentView: (view: string) => void;
  addTeam: (team: TeamConfig) => void;
  // ... etc
}
```

## 7. Game State (Backend)

```typescript
interface GameState {
  roomId: string;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  isPaused: boolean;
  players: Record<string, PlayerState>;
  logs: string[];
  winnerId: string | null;
}

interface PlayerState {
  id: string;
  name: string;
  team: TeamConfig;
  currentMonsterIndex: number;
  monster: BattleMonsterState;
  ap: number;
  rolledDices: DiceFace[];
  isAuto: boolean;
  connected: boolean;
}
```

## 8. Authentication Flow

1. User clicks "Login with Google"
2. Frontend redirects to Google OAuth
3. User grants permissions
4. Google redirects back with auth code
5. Frontend sends code to `/api/auth/google/callback`
6. Backend exchanges code for tokens
7. Backend creates/updates user in Supabase
8. JWT token returned to frontend
9. Frontend stores token and fetches user profile

## 9. Build & Deployment

- **Development**: `npm run dev` (Vite dev server) + `uvicorn backend.main:app --reload`
- **Production**: `npm run build` + run FastAPI with built frontend
- **Package**: Python wheel distribution with embedded frontend
