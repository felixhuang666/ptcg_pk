# Test Report

## Frontend Unit Tests
All tests passed successfully.
- **Duration**: 3.85s
- **File**: `tests/App.test.tsx` (1 test passed)

## End-to-End Tests (Playwright)
All tests passed successfully.
- **Duration**: 12.1s
- **Tests**:
  1. `verify real frontend via dev login` (`tests/real_frontend.spec.ts`)
  2. `RPG Scene Editor - Import/Export Scene` (`tests/test_rpg_scene_editor.spec.ts`)
  3. `verify RPG mode and Map Editor rendering` (`tests/verify_rpg.spec.ts`)

## Backend Unit Tests
All tests passed successfully.
- **Duration**: 3.06s
- **Test Files**:
  1. `backend/tests/test_api_maps.py`
  2. `backend/tests/test_api_maps_resize.py`
  3. `backend/tests/test_api_scenes.py`
  4. `backend/tests/test_main.py`
  5. `backend/tests/test_real_api.py`
  6. `backend/tests/test_save_local.py`
