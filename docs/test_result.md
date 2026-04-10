# Test Results

## Frontend Tests
### Vitest (React Components)
- `tests/App.test.tsx` (1 test): **Passed**
- Summary: 1/1 test suites passed, 1/1 tests passed.

### Playwright (E2E Tests)
- `tests/real_frontend.spec.ts:3:1` › verify real frontend via dev login: **Passed**
- `tests/test_rpg_scene_editor.spec.ts:5:1` › RPG Scene Editor - Import/Export Scene: **Passed**
- `tests/verify_rpg.spec.ts:3:1` › verify RPG mode and Map Editor rendering: **Passed**
- Summary: 3 passed tests.

## Backend Tests (Pytest)
- `backend/tests/test_api_maps.py`: 4 tests, **Passed**
- `backend/tests/test_api_maps_resize.py`: 1 test, **Passed**
- `backend/tests/test_api_scenes.py`: 4 tests, **Passed**
- `backend/tests/test_main.py`: 3 tests, **Passed**
- `backend/tests/test_real_api.py`: 2 tests, **Passed**
- Summary: 14 passed tests in 3.16s.

## Changes Made
- Updated `Makefile` to restrict Playwright to run with 1 worker (`npx playwright test --workers 1`) to prevent concurrent state conflict which could lead to flakiness (timeout) during the execution of `test_rpg_scene_editor.spec.ts`.


## Raw Output

```text
> react-example@0.0.0 test
> vitest run


 RUN  v4.1.2 /app

 ✓ tests/App.test.tsx (1 test) 308ms
     ✓ renders login container when unauthenticated  304ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  23:35:59
   Duration  3.79s (transform 760ms, setup 103ms, import 2.21s, tests 308ms, environment 978ms)


Running 3 tests using 1 worker

[1/3] [chromium] › tests/real_frontend.spec.ts:3:1 › verify real frontend via dev login
[2/3] [chromium] › tests/test_rpg_scene_editor.spec.ts:5:1 › RPG Scene Editor - Import/Export Scene
[3/3] [chromium] › tests/verify_rpg.spec.ts:3:1 › verify RPG mode and Map Editor rendering
  3 passed (16.7s)
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.0.2, pluggy-1.6.0
rootdir: /app
configfile: pyproject.toml
plugins: asyncio-1.3.0, anyio-4.13.0
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function
collected 14 items

backend/tests/test_api_maps.py ....                                      [ 28%]
backend/tests/test_api_maps_resize.py .                                  [ 35%]
backend/tests/test_api_scenes.py ....                                    [ 64%]
backend/tests/test_main.py ...                                           [ 85%]
backend/tests/test_real_api.py ..                                        [100%]

============================== 14 passed in 3.27s ==============================
```
