## Summary
Support default image for game objects in the template editor and scene editor.

## Original Commit
7d77826898b7b57dae2d07255d22793f724f0fd9

## User Prompt
Objective:support default img for an object

- in object editor, able to select default image for an object.
- default image path: assets/game_obj_img/
- default image is from assets/game_obj_img/object_default.jpg
- designer can select image from default image path
- in scene editor, when draw a object to canvs, must render the default image, should resize to object's container size

**Task information:
- TID: 615
- CHANGE_PREFIX: 20260420-1040

## Root Cause
No functionality existed to allow assigning or rendering default images for game objects in the editors.

## Solution
1. **Backend:** Added an API endpoint \`/api/game_obj_img\` to list available images from \`public/assets/game_obj_img\` with fallback to \`object_default.jpg\`.
2. **Assets:** Created the \`public/assets/game_obj_img/\` directory and the \`object_default.jpg\` file.
3. **Frontend (\`GameObjectTemplateCreator.tsx\`):** Added the \`default_image\` field to \`TemplateData\`. Included a dropdown field in the editor UI to allow selecting from available images fetched from the backend.
4. **Frontend (\`RpgSceneEditor.tsx\`):** Updated the \`renderAllGameObjects\` method. Instead of just rendering an orange rectangle for all game objects, it now looks for the template's \`default_image\`. If present, it loads and renders the image scaled to the object's width (\`pxW\`) and height (\`pxH\`). If no default image is specified, it gracefully falls back to the original orange rectangle renderer. All interaction listeners were attached to the correct graphic objects.
