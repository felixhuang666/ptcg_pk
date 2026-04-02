# Summary of Changes - Map Editor Rendering Fix

## User Input Prompt
Objective:fix map editor cannot render correctly
- add test cases to ensure RPG play mode and RPG Map editor works.
- saw error log in browser as below:
index-DCUHI4aj.js:6530 Uncaught ReferenceError: currentMapId is not defined

## Original Branch Commit ID
f853e5c95ee9bee87ee253e87ec65ec878aced8c

## Root Cause
In `src/components/RpgMapEditor.tsx`, the `PhaserGame` component was using `currentMapId` in its `useEffect` hook (to start the Phaser game) and in the `MainScene` class, but `currentMapId` was not defined in the component's scope or passed as a prop. It was only defined in the parent `RpgMapEditor` component's state.

## Solution
1. Modified `src/components/RpgMapEditor.tsx` to include `currentMapId` in the `PhaserGame` component's props.
2. Updated the `PhaserGame` component in `RpgMapEditor.tsx` to destructure and use the `currentMapId` prop.
3. Improved consistency in `src/components/RpgMode.tsx` and `src/components/RpgMapEditor.tsx` by ensuring `MainScene` consistently uses `this.currentMapId` (initialized from `init(data)`) instead of relying on closed-over props which might lead to similar issues.
4. Added an E2E test in `tmp/583_verify_rpg.spec.ts` that verifies both RPG Play Mode and Map Editor render correctly without console errors.
