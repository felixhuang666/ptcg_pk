# Summary

## User Prompt
Objective: enhance camera upload function in player setting
- 目前上傳monster照片的功能已經修改並測試成功, (refer to /api/upload_monster_image in backend API, src/components/MonsterCameraCapture.tsx in frontend)
- 我要重構角色設定中的照片拍照功能實作, 改成用MonsterCameraCapture.tsx的機制, 改呼叫/api/upload_player_image API, 檔案的prefix 設定為player_xxxxx.png

## Original Branch Commit ID
N/A

## Root Cause
The old player photo capture feature in `RoleSetting.tsx` was using raw HTML5 `<video>` and `<canvas>` elements to capture image manually, storing it via the `/api/user/selfie` API. It lacked the advanced functionality of `react-html5-camera-photo` (such as easy switching between user and environment facing modes) that was recently implemented in `MonsterCameraCapture.tsx`.

## Solution
1. **Created `PlayerCameraCapture.tsx` Component**: Cloned the behavior of `MonsterCameraCapture.tsx` to handle taking player photos, providing a consistent user interface and robust camera functionality.
2. **Updated `RoleSetting.tsx`**: Removed the old raw HTML5 camera implementation and integrated the new `PlayerCameraCapture` component. The image filename display now properly points to `player_${userId}.png`.
3. **Backend Updates**: Replaced the `/api/user/selfie` endpoint with a new `/api/upload_player_image` endpoint in `backend/main.py`. This new endpoint receives `image_base64` and `filename` directly from the client, matching the signature style of the monster upload API.
