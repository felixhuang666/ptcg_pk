# Summary
Updated project documentation to reflect actual implementation details and resolve accumulated technical debt in the design specs.

- **Prompt**: "revisit design spec in docs\*.md and *.md in other folders. check if any conflict, if you found any conflict, create/update to docs/TODO.md. update docs if you found missing spec"
- **Original Branch Commit ID**: `591` (approximated from previous runs)
- **Root Cause**: As the Map Editor, RPG Mode, and Scene Editor evolved (including features like dual-source persistence, Z-order sorting via layer mapping, and UI design export capabilities), the corresponding documentation files became outdated or out of sync with the actual implementation.
- **Solution**:
  - Updated `docs/rpg_scene_design.md` with details on `instance_id`, local fallback persistence, and strict schema nesting requirements.
  - Updated `docs/rpg_map_editor_design.md` to reflect the `POST /api/save_local` endpoint and map meta extraction.
  - Added Design Export Capabilities (Puppeteer/Figma) to `docs/ui_design.md`.
  - Refreshed the main `README.md` to list the new editor features.
  - Cleaned up `docs/TODO.md` by removing resolved feature flags (Layer Visibilities, Editor Toggles).
