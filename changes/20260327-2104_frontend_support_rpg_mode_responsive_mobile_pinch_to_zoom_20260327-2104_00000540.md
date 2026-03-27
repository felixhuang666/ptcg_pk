# RPG Mode Responsive Layout and Mobile Pinch to Zoom

**TID:** 540
**Original Branch Commit ID:** (Unknown/Initial)
**Prompt:** 偵測到手機直向/橫向 改變的時候 要自動調整 顯示比例 不要產生需要捲動
- 支持手機的拖曳放大/縮小
- UI調整: 隱藏下方的說明列
- UI調整: 改動 攻擊模式的選擇按鈕到左下方

## Root Cause
- The `RpgMode` component container was not set up to fill the viewport and prevent scrolling (`min-h-screen` instead of `h-screen overflow-hidden`).
- Phaser GameConfig used `Phaser.Scale.FIT` which does not dynamically respond to orientation changes efficiently without scrolling the outer container.
- Mobile pinch-to-zoom was not implemented as Phaser only tracked one active pointer by default and lacked logic to track pointer distance.
- UI elements (mode/attack buttons, info text, editor tools) were positioned with static absolute coordinates instead of dynamic relative coordinates anchored to the screen bounds.

## Solution
1. **Container Styles**: Updated `src/components/RpgMode.tsx` outermost div to `h-screen overflow-hidden` and inner container to `flex-1 w-full min-h-0` to fill the screen and prevent scrolling. Removed the bottom instructional text div.
2. **Phaser GameConfig**: Changed `scale.mode` to `Phaser.Scale.RESIZE` and dimensions to `100%` width and height.
3. **Phaser UI Placement & Resizing**: Positioned the `modeButton` and `attackButton` to the bottom left corner (`y = this.scale.height - 100` / `- 60`). Added a `this.scale.on('resize', ...)` listener to dynamically update the positions of these UI elements (and `infoText` and Editor tools) when the screen size or orientation changes.
4. **Mobile Pinch-to-Zoom**: Enabled 3 `activePointers` in `input` config. Added logic to track `this.input.pointer1` and `this.input.pointer2`. When both are down, it calculates the distance between them, sets an `initialZoom` factor, and adjusts `this.cameras.main.zoom` proportionately on `pointermove`. Disabled the virtual joystick while pinch-to-zoom is active.
