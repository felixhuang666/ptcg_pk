# RPG Scene Editor - Import/Export Scene

- **TID:** 595
- **Original Commit:** N/A (current branch state)
- **User Prompt:** "Objective: review rpg scene editor - study design spec and create test cases to verify implemenation - add featues: import/export scene to a json format"

## Root Cause
The RPG Scene Editor lacked functionality to export a designed scene configuration to a portable file format or to import an existing configuration, making it difficult to share or backup scene setups.

## Solution
1. **Added Export Functionality:**
   - Added a "Export Scene" button using `lucide-react`'s `Download` icon.
   - When clicked, it takes the current `sceneData`, serializes it to formatted JSON, and creates a downloadable `blob` URI triggering a browser download named `scene_{currentSceneId | 'export'}.json`.
2. **Added Import Functionality:**
   - Added an "Import Scene" button using `lucide-react`'s `Upload` icon wrapped around a hidden file input accepting `.json`.
   - Uses `FileReader` to read the selected file, parses it, validates that it contains a `map_list` property, and updates the editor's `sceneData` state.
3. **Verification Tests:**
   - Created a comprehensive Playwright test case (`tests/test_rpg_scene_editor.spec.ts`) that verifies the end-to-end functionality of importing dummy scene data, confirming UI dialog responses, and exporting it back out to verify integrity.
   - Verified that all existing unit and e2e tests continue to pass.
