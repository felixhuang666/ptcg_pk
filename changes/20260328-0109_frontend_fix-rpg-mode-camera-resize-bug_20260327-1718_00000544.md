# 20260328-0109 Frontend: Fix RPG Mode Camera Resize Bug
**TID**: 00000544
**Original Branch Commit ID**: a285a9f5f02290b4c226034e09cd7a90a9dbe472
**Date/Time**: 20260327-1718

## Prompt
Objective:要偵測 視窗的大小, 長寬變動

在手機畫面, 使用者會有直向 跟橫向的使用方式
要偵測目前是直向還是橫向
然後調整地圖大小, 若有大小調整, 必須重置目前玩家的view(長寬, zoom), 置中玩家目前的座標
在右上的地圖座標旁 也加上目前的zoom 比例

## Root Cause
When the window size changed, the game camera did not reset its zoom level, position, or target following. This resulted in an unpredictable display of the RPG mode when the user changed the orientation of their mobile phone (or resized their browser window). Additionally, the zoom level of the map was not visible to the user.

## Solution
Modified `src/components/RpgMode.tsx` to explicitly handle the `resize` event by:
1. Setting the camera zoom to `1`.
2. Centering the camera on the player using `this.cameras.main.centerOn(this.player.x, this.player.y)`.
3. Resuming `startFollow` on the player.
4. Added the zoom ratio formatting in the `update` method directly into `this.infoText` for visibility.