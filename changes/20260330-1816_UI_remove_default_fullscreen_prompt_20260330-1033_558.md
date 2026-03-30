# UI - Remove Default Fullscreen Prompt

- **TID:** 558
- **CHANGE_PREFIX:** 20260330-1816
- **Date/Time:** 20260330-1816

## Prompt
Objective:預設不啟用"進入全螢幕模式"的偵測跟提示

- 除非.env 中有指定 enable_full_screen_notification=true, 移除"進入全螢幕模式"的偵測跟提示
- 改成在工具列, add a small icon to enable full screen manually

## Original Branch Commit ID
`eb6512f7a23c268771978c146bcc29899b942b19`

## Root Cause
The fullscreen prompt in `RpgMode` and `RpgMapEditor` was enabled by default. The design previously forced a pop-up prompt suggesting fullscreen mode every time the user entered these views, which could be distracting.

## Solution
1. **Disabled default notification:**
   - Modified the check logic in `RpgMode.tsx` and `RpgMapEditor.tsx` to conditionally display the prompt only when the environment variable `VITE_ENABLE_FULL_SCREEN_NOTIFICATION` is strictly set to `'true'`.
   - Updated `.env.example` to document the new `VITE_ENABLE_FULL_SCREEN_NOTIFICATION` variable.

2. **Added Manual Toggle:**
   - Imported `Maximize` and `Minimize` icons from `lucide-react`.
   - Added an event listener for `fullscreenchange` and vendor prefixes to keep track of fullscreen status (`isFullscreenActive`).
   - Injected a toggle button in the header toolbar using `Maximize` when exiting and `Minimize` when entering fullscreen.

3. **TypeScript Definitions:**
   - Updated `tsconfig.json` to include `"types": ["vite/client"]` to ensure type-checking works correctly for `import.meta.env`.
