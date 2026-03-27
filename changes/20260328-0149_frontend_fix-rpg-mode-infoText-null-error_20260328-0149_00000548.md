# Summary
Fixed `TypeError: Cannot read properties of null (reading 'setText')` when entering the RPG Mode.

## Prompt
Objective:fix error

index-CZX31S_P.js:6462 Uncaught TypeError: Cannot read properties of null (reading 'setText')
...
index-CZX31S_P.js:4984 Uncaught Error: Framebuffer status: Incomplete Attachment
...

**Task information:
- TID: 548
- CHANGE_PREFIX: 20260328-0149

## Original Branch Commit ID
N/A (Working on current HEAD)

## Root Cause
The `infoText` was previously converted into a React ref (`infoTextRef`) pointing to an absolute positioned `div` on top of the Phaser game instead of a Phaser game object. However, there were lingering references to the `this.infoText` class property, particularly calling `this.infoText.setText(...)` in the `update()` loop which crashed because the property remained `null`.

## Solution
1. Removed the `private infoText` property from the `MainScene` class.
2. Updated the `update` method to exclusively use the DOM element through the `infoTextRef` via `infoTextRef.current.innerText = ...`.
3. Cleaned up obsolete repositioning logic in the `resize` listener.
