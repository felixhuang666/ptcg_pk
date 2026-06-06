# Test Run Details

**Date:** 2025-02-27
**Scope:** Frontend, E2E, and Backend Tests

## Summary
- Frontend: 1 passed
- E2E: 3 passed
- Backend: 15 passed

## Details

### Frontend Tests (Vitest)
- `tests/App.test.tsx`: Passed
**Total**: 1 passed

### E2E Tests (Playwright)
- `tests/real_frontend.spec.ts` - verify real frontend via dev login: Passed
- `tests/test_rpg_scene_editor.spec.ts` - RPG Scene Editor - Import/Export Scene: Passed
- `tests/verify_rpg.spec.ts` - verify RPG mode and Map Editor rendering: Passed
**Total**: 3 passed

### Backend Tests (Pytest)
- `backend/tests/test_api_maps.py`
- `backend/tests/test_api_maps_resize.py`
- `backend/tests/test_api_scenes.py`
- `backend/tests/test_main.py`
- `backend/tests/test_real_api.py`
- `backend/tests/test_save_local.py`
**Total**: 15 passed
