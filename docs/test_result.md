# Test Results

## Frontend & E2E Tests
```
> react-example@0.0.0 test
> vitest run

 ✓ tests/App.test.tsx (1 test) 276ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  23:41:09
   Duration  3.54s

Running 3 tests using 2 workers
[1/3] [chromium] › tests/real_frontend.spec.ts:3:1 › verify real frontend via dev login
[2/3] [chromium] › tests/test_rpg_scene_editor.spec.ts:5:1 › RPG Scene Editor - Import/Export Scene
[3/3] [chromium] › tests/verify_rpg.spec.ts:3:1 › verify RPG mode and Map Editor rendering
  3 passed (14.8s)
```

## Backend Tests
```
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

============================== 14 passed in 3.11s ==============================
```
