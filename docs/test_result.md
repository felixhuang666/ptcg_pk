# Test Report

## Summary
All tests passed successfully!

## Details

### Frontend Tests (Vitest)
```
> react-example@0.0.0 test
> vitest run

 RUN  v4.1.2 /app

 ✓ tests/App.test.tsx (1 test) 308ms
     ✓ renders login container when unauthenticated  304ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  23:55:13
   Duration  3.90s (transform 796ms, setup 113ms, import 2.27s, tests 308ms, environment 1.01s)
```

### E2E Tests (Playwright)
```
Running 3 tests using 1 worker

[1/3] [chromium] › tests/real_frontend.spec.ts:3:1 › verify real frontend via dev login
[2/3] [chromium] › tests/test_rpg_scene_editor.spec.ts:5:1 › RPG Scene Editor - Import/Export Scene
[3/3] [chromium] › tests/verify_rpg.spec.ts:3:1 › verify RPG mode and Map Editor rendering
  3 passed (19.3s)
```

### Backend Tests (Pytest)
```
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.0.2, pluggy-1.6.0
rootdir: /app
configfile: pyproject.toml
plugins: asyncio-1.3.0, anyio-4.13.0
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function
collected 15 items

backend/tests/test_api_maps.py ....                                      [ 26%]
backend/tests/test_api_maps_resize.py .                                  [ 33%]
backend/tests/test_api_scenes.py ....                                    [ 60%]
backend/tests/test_main.py ...                                           [ 80%]
backend/tests/test_real_api.py ..                                        [ 93%]
backend/tests/test_save_local.py .                                       [100%]

============================== 15 passed in 3.34s ==============================
```
