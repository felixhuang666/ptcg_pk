# Task Summary

- **TID:** 536
- **CHANGE_PREFIX:** 20260327-2021
- **Original Branch Commit ID:** 591459b4fc9feb4bc14b5566fa79b1fa17fdecff
- **Prompt:** 在IOS下, safari or chrome 都沒有正確啟動全螢幕 (On iOS, Safari or Chrome do not correctly start fullscreen mode)
- **Root Cause:** iOS Safari and Chrome generally do not support the standard Fullscreen API (`requestFullscreen()`) on arbitrary document elements. Calling it either fails silently or throws an error.
- **Solution:**
  - Updated `RpgMode.tsx` to detect if the standard fullscreen API is supported by the browser by checking properties like `document.fullscreenEnabled` and its vendor-prefixed equivalents.
  - Added a check for `(display-mode: standalone)` so that users who have already added the app to their home screen (PWA) are not prompted again.
  - If fullscreen is not supported (like on iOS Safari), gracefully fallback to showing a prompt advising the user to use the "加入主畫面" (Add to Home Screen) feature, and replace the non-functional "啟動全螢幕" button with an "我知道了" acknowledgment button.
  - Wrapped the `requestFullscreen` API call in a `try/catch` block to prevent unhandled promise rejection errors in environments that block the request.
