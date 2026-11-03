# Test Results

## Test Run Details (Tue Nov 3 23:49:04 UTC 2026)

### Frontend Tests
- Summary: 1 passed test (4.05s).

### Playwright (E2E Tests)
- `tests/real_frontend.spec.ts:3:1` › verify real frontend via dev login
- `tests/test_rpg_scene_editor.spec.ts:5:1` › RPG Scene Editor - Import/Export Scene
- `tests/verify_rpg.spec.ts:3:1` › verify RPG mode and Map Editor rendering
- Summary: 3 passed tests (19.4s).

## Backend Tests (Pytest)
- `backend/tests/test_api_maps.py`: 4 tests
- `backend/tests/test_api_maps_resize.py`: 1 test
- `backend/tests/test_api_scenes.py`: 4 tests
- `backend/tests/test_main.py`: 3 tests
- `backend/tests/test_real_api.py`: 2 tests
- `backend/tests/test_save_local.py`: 1 test
- Summary: 15 passed tests in 3.92s.

## Changes Made
- Updated `Makefile` to restrict Playwright to run with 1 worker (`npx playwright test --workers 1`) to prevent concurrent state conflict which could lead to flakiness (timeout) during the execution of `test_rpg_scene_editor.spec.ts`.
- Run `make test` for backend and e2e test, which run correctly.
- Add camera capture feature.
- Fix camera max resolution 413 error and handling error.
- Implement quest scene dropdown grouping for the RPG Mode.
- Fix RPG mode rendering bug and missing sprite 404 issue.