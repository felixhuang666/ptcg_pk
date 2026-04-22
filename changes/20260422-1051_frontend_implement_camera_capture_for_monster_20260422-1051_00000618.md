# Summary of Changes

## User Input
Objective:study how to access camera in HTML5
- study: https://github.com/MABelanger/jslib-html5-camera-photo
- study: https://www.npmjs.com/package/react-html5-camera-photo
- i would like to have a new feature to let player to design monstor in RPG game object editor.
- create a page for player to generate his monstor (user generated content) and publish
- player can use his camera to capure what he like and see the preview and click the snap button to capture the picture and upload to local asset
- player can change back camera  or front camera.

## Root Cause
The project lacked a feature allowing users to capture images from their webcams/mobile cameras within the RPG object editor for creating custom monsters.

## Solution
1. Installed `react-html5-camera-photo` package to easily handle camera permissions, facing modes, and captures.
2. Created `MonsterCameraCapture` React component that toggles between user and environment facing modes, shows a preview of the captured photo, and uploads the base64 image data to the backend.
3. Added a new endpoint `/api/upload_monster_image` in `backend/main.py` that decodes the base64 image data and saves it securely to both `public/assets/images/` and `dist/assets/images/`.
4. Integrated `MonsterCameraCapture` into `GameObjectTemplateCreator`, allowing the user to click "Design Monster via Camera", capture an image, and automatically populate the template's default image and category.
