# Testing Strategy for Monster Battle

This document outlines how to implement automated tests for the Monster Battle game.

## Backend Testing (Python/FastAPI/Socket.IO)
1. **Unit Testing:** Use `pytest` for unit testing the game logic located in `backend/game/`. This includes testing combat calculations, damage formulas, state management, and utility functions without needing a running server.
2. **Integration Testing:** Test FastAPI endpoints (`backend/main.py`) using `httpx` and FastAPI's `TestClient` to ensure OAuth and other HTTP endpoints work.
3. **Socket.IO Testing:** Use `pytest-asyncio` or write test clients using `python-socketio[client]` to simulate client connections, room joining, and battle events, verifying that the server correctly manages game state and broadcasts messages.

## Frontend Testing (React/Vite)
1. **Unit/Component Testing:** Use `Vitest` and `React Testing Library` to test individual UI components (e.g., buttons, health bars, modal dialogs) and Zustand store logic independently.
2. **E2E Testing:** Playwright or Cypress can be used for End-to-End testing. This will test the full game flow (logging in, forming a team, starting a battle, resolving turns) by simulating real browser interactions against a running instance of the backend and frontend.

## Next Steps
To implement testing, we should:
1. Add `pytest` and related plugins to `requirements.txt` (or dev dependencies).
2. Add `vitest` and `playwright` to `package.json`.
3. Create `backend/tests/` and `src/__tests__/` directories for unit tests.
4. Create an `e2e/` folder for Playwright end-to-end tests.
5. Integrate tests into a CI/CD pipeline (e.g., GitHub Actions).
