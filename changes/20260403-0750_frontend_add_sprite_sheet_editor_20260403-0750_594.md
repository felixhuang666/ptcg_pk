# Summary: Implement Sprite Sheet Editor

## Issue
The user requested the implementation of a sprite sheet editor with specific requirements, including importing raw images, cropping, maintaining working/output queues, and saving/loading metadata directly from `public/assets/map_tileset/`.

## User Input Prompt
> Objective:sprite sheet editor
>
> - study how to implement a sprite sheet editor
> - basic requirement:
>   * import one or any image files (png, jpg,...) to a raw image queue; user can select file in the queue to preivew raw image
>   * able to define tile size in pixel (width x height, such as 32x32, 64x64, 32x64);
>   * a dropdown list for predefined tile size (32x32, 64x64, 32x64, 64x32)
>   * a tile working queue to save tiles; when user crop the raw image, it will be save to working queue first.
>   * a tile output queue for final output;
>   * able to rename the output name
>   * a "save" icon button in tool bar to save the tileset meta json file and tileset png file into public/assets/map_tileset/ folder
>   * a icon button in toolbar to load tileset meta json file from public/assets/map_tileset/ folder; when load the json file, must also process its png file into tile output queue.
>   * able to preview the output tileset meta json file in left side bar.
>   * the right side bar can draw the edge and adjust its width
>   * the left side support a menu tab to swtich functions for  raw_file, tile working queue,  tile output queue
> - please check if any conflict and make your suggestions
> - create/update the design spec to docs/rpg_sprite_sheet_editor_design.md

## Root Cause
N/A - This is a feature request.

## Solution
1. Created `docs/rpg_sprite_sheet_editor_design.md` outlining the architecture, requirements, and an added backend endpoint for saving tileset files directly.
2. Added `POST /api/map/tileset/save` in `backend/main.py` which accepts a JSON payload of the metadata and a base64 encoded string of the combined PNG file. This writes to both `public/` and `dist/` directories to accommodate Dev and Prod modes.
3. Implemented `src/components/SpriteSheetEditor.tsx` with all the specified UI requirements (toolbar, tabs, queues, canvas cropper).
4. Implemented logic to process raw images, slice them based on user drags/clicks into a working queue, and move them to an output queue.
5. Implemented canvas compositing to merge the output queue back into a single PNG upon clicking save.
6. Implemented reverse processing for "Load" to take an existing tileset and slice its image back into the output queue.
7. Integrated `SpriteSheetEditor` into `src/App.tsx`, providing a button to launch it next to the Map Editor.
8. Resolved type errors, ran `make build`, and `make test`. All passed.