# Tech Stack Refactor Summary

**TID:** 520
**CHANGE_PREFIX:** 20260325-2039

## Prompt Overview
The user requested to refactor the project's tech stack to use FastAPI and Uvicorn for hosting both a Python backend (for Google OAuth) and the React frontend. Nginx will be used to reverse proxy to port 5000. When an OAuth login succeeds, user data needs to be saved as JSON within a `users` folder. The `.env.example` needed updating with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `APP_BACKEND_PORT=5000`. Lastly, a Makefile needed creation/updating to handle setup (Python venv, npm install, copy `.env`), build (React dist and Python wheel), clean, systemd service installation, and background service start.

## Original Commit
Commit ID before changes were applied.

## Root Cause
The project originally utilized a Node.js Express + Socket.IO server to handle the game matchmaking and real-time battle logic, and served the frontend natively. The requirement was to transition to a Python-based backend (FastAPI) to handle OAuth and static file serving, which implied integrating the complex real-time game loops inside a Python framework.

## Solution
1. **Created Python Backend:** Initialized a FastAPI application (`backend/main.py`) that serves the React SPA from the `dist/` directory and exposes `/auth/login` and `/auth/callback` endpoints. The callback logic utilizes `httpx` to exchange the Google OAuth token, retrieves user info, and stores it in `users/<google_id>.json`.
2. **Re-implemented Game Logic:** Migrated the core game components—types, data (monsters/skills), and logic routines (e.g., dice rolling, damage calc, AP updates)—from TypeScript (`src/shared`) into a new Python package (`backend/game`).
3. **Socket.IO Integration:** Created a background asynchronous game loop and Socket.IO ASGI app (`backend/socket_app.py`) to handle matchmaking, PvP/PvE triggers, skill execution, and state propagation, maintaining parity with the Node implementation.
4. **Environment Updates:** Added Google OAuth configuration properties to `.env.example`.
5. **Build Configuration:** Configured `pyproject.toml` and `setup.py` to package the `backend/` and `dist/` directories into a distributable wheel.
6. **Makefile Updates:** Enhanced `Makefile` to include robust build scripts:
   - `setup`: Initializes `venv`, installs deps, and scaffolds `.env`.
   - `build`: Runs `vite build` then builds the Python wheel.
   - `install-service`, `bg-start`, `stop`, `clean`: Service and lifecycle management commands.
7. **Frontend Binding:** Updated `io()` calls in React components (`App.tsx`, `Admin.tsx`, `BossSelect.tsx`, `Battle.tsx`) to directly connect to `window.location.origin`, ensuring traffic hits the FastAPI server rather than relying on a separate Node process.