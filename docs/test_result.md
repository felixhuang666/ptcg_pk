# Test Results

## Backend Tests

The backend tests were executed successfully. All 10 test cases passed.

```text
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.0.2, pluggy-1.6.0
rootdir: /app
configfile: pyproject.toml
plugins: asyncio-1.3.0, anyio-4.13.0
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function
collected 10 items

backend/tests/test_api_maps.py ....                                      [ 40%]
backend/tests/test_api_maps_resize.py .                                  [ 50%]
backend/tests/test_main.py ...                                           [ 80%]
backend/tests/test_real_api.py ..                                        [100%]

============================== 10 passed in 3.09s ==============================
```

## Frontend Tests

The frontend tests (both Vitest unit tests and Playwright E2E tests) were executed successfully. All 3 tests passed.

```text
> react-example@0.0.0 test
> vitest run


 RUN  v4.1.2 /app

 ✓ tests/App.test.tsx (1 test) 292ms
     ✓ renders login container when unauthenticated  288ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  02:52:37
   Duration  3.69s (transform 654ms, setup 106ms, import 2.11s, tests 292ms, environment 995ms)


Running 2 tests using 2 workers

[1/2] [chromium] › tests/real_frontend.spec.ts:3:1 › verify real frontend via dev login
[2/2] [chromium] › tests/verify_rpg.spec.ts:3:1 › verify RPG mode and Map Editor rendering
  2 passed (11.1s)
```

## Changes Made

- Fixed E2E test failures caused by `Failed to process file:` errors by setting valid initial fallback player sprite assets (`yo.png` and `yo_atk.png`) in `RpgMode.tsx` and `RpgMapEditor.tsx`.
- Addressed `WebSocket connection` errors by properly configuring `vite.config.ts` to fallback to `127.0.0.1` locally with port `5000` via `ws`, eliminating console noise during Playwright tests.
- Removed ignored console error patterns (`Error checking auth`, `WebSocket connection`, `failed to connect to websocket`) from `tests/verify_rpg.spec.ts` to allow strict failure detection.
- Updated Playwright navigation target to use `http://127.0.0.1:5000` instead of `localhost` in E2E tests to fix hostname mismatches with the Vite Dev server.
