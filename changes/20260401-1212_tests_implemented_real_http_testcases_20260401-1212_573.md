# Summary of Changes

## Original Prompt
Objective: implement test cases
- check Makefile for how to perform test
  * make build bg-start test to launch and run test cases
- study current implementation and design doc (in docs/*.md)
- implement test cases for backend API; don use mock API, should use http to connect to backend for real test
- implement test cases for frondend; don use mock API, should use real http connection to test frontend UI behavior
- TID: 573
- CHANGE_PREFIX: 20260401-1212

## Original Branch Commit ID
N/A

## Root Cause
The codebase lacked end-to-end tests relying on real HTTP connections (without test mocks) for both frontend behavior testing and backend API testing.

## Solution
1. **Backend Tests:** Created `backend/tests/test_real_api.py` that utilizes `httpx.AsyncClient` to directly request `http://localhost:5000/api/maps` and `/api/map/generate` without `ASGITransport` app wrapping.
2. **Frontend Tests:** Created `tests/real_frontend.spec.ts` using Playwright, which navigates to `http://localhost:5000`, performs a full authentication flow via the dev login button (`/auth/dev_login`), verifies UI elements appearing properly, and expects the Phaser canvas object to render.
3. **Vitest Fixes:** Excluded Playwright `*.spec.ts` test files from the `vitest.config.ts` configuration, effectively ensuring Vitest only runs unit tests instead of causing test suite failures on unsupported E2E tools testing blocks.
4. **Makefile Modification:** Updated the `test-frontend` target in `Makefile` to run `npx playwright test` after `npm run test` executes Vitest tests.
