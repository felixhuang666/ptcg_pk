# Documentation Update: Resolve Tech Stack Mismatch

**TID:** 1234
**Change Prefix:** 20260704-1427

## Summary
Updated project documentation to reflect the current Python FastAPI backend stack, resolving discrepancies where the old Express stack was still mentioned.

## User Prompt
git pull last main branch
revisit the project
revisit design spec in docs\*.md and *.md in other folders
check if any conflict, if you found any conflict, create/update to docs/TODO.md
update docs if you found missing spec
create PR if you changed any docs.

## Root Cause
The project originally utilized a Node.js Express server to handle matchmaking and real-time battle logic. It was later refactored to use a Python FastAPI backend (as documented in `docs/ARCHITECTURE.md` and commit logs). However, `README.md` and `package.json` still contained references to the original `Express` stack in their project descriptions. Additionally, `server.ts` is an orphaned file that remains in the root.

## Solution
1. **Identified Conflict:** Discovered that the descriptions in `README.md` and `package.json` mismatched the actual implemented architecture.
2. **Updated `README.md` and `package.json`**: Changed references from `Express` to `FastAPI`.
3. **Updated `docs/TODO.md`**: Added a new section `3.1 Tech Stack Documentation Mismatch` under `Game Logic Issues` to document the orphaned `server.ts` file and record the documentation override.
4. **Updated `docs/design_conflict.md`**: Added section `5. Backend Tech Stack Documentation Mismatch` to formally track the resolution of the architectural conflict in the specs.
