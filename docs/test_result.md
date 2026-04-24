# Test Results

## Frontend Tests
### Vitest (React Components)
- `tests/App.test.tsx`: 1 test passed in 378ms
- Summary: 1/1 test suites passed, 1/1 tests passed.

### Playwright (E2E Tests)
- `tests/real_frontend.spec.ts`: **Passed**
- `tests/test_rpg_scene_editor.spec.ts`: **Passed**
- `tests/verify_rpg.spec.ts`: **Passed**
- Summary: 3 passed tests in 16.4s.

## Backend Tests (Pytest)
- 15 passed in 3.67s
- Test files run:
  - `backend/tests/test_api_maps.py`
  - `backend/tests/test_api_maps_resize.py`
  - `backend/tests/test_api_scenes.py`
  - `backend/tests/test_main.py`
  - `backend/tests/test_real_api.py`
  - `backend/tests/test_save_local.py`

## Changes Made
- Updated `Makefile` to restrict Playwright to run with 1 worker (`npx playwright test --workers 1`) to prevent concurrent state conflict which could lead to flakiness (timeout) during the execution of `test_rpg_scene_editor.spec.ts`.
- Run `make test` for backend and e2e test, which run correctly.