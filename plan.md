1. **Backend Implementation (`backend/main.py`)**:
   - Add a new endpoint `GET /api/game_obj_img` to list all available default images (with a `.png`, `.jpg`, `.jpeg` extensions) in the `public/assets/game_obj_img` or `dist/assets/game_obj_img` directory.
   - If no images exist or the folder doesn't exist, return a fallback `["object_default.jpg"]`.
2. **Ensure Asset Exists (`public/assets/game_obj_img/object_default.jpg`)**:
   - Create the directory `public/assets/game_obj_img` and an empty file `object_default.jpg` to satisfy the requirements.
3. **Frontend Updates (`src/components/GameObjectTemplateCreator.tsx`)**:
   - Add `default_image?: string;` to `TemplateData`.
   - On component mount, fetch `GET /api/game_obj_img` to get available images for the dropdown, with fallback state.
   - Add a dropdown for `default_image` under "Default Controller" in the template creator UI.
4. **Frontend Updates (`src/components/RpgSceneEditor.tsx`)**:
   - In the `renderAllGameObjects` loop, instead of always drawing a rectangle (unless an image is provided), check if the game object's template has `default_image` set.
   - If `default_image` is present, render it as an image `this.add.image()`, using `setDisplaySize()` to fit `pxW` and `pxH`. Add lazy-loading using `this.load.image` if the texture isn't already loaded.
   - If not present, fallback to drawing the orange rectangle as it originally did.
   - Attach all interactive events (pointerdown, drag, dragend) and text labels properly to the newly rendered image container or object.
5. **Pre-commit step**: Ensure proper testing, verification, review, and reflection are done.
6. **Submit PR**: Create change report markdown and submit.
