# Task Summary: Add a toggle icon button to show/hide the info Overlay in map editor

## Meta
- **TID**: 00000579
- **Change Prefix**: 20260402-0806
- **Category**: frontend
- **Date/Time**: 20260402-0806

## Prompt
Objective: add a toogle icon button to show/hide the info Overlay in map editor

## Original Commit
Commit ID: 0e63e24019271604ceff66aa8906f1788cdfcb90

## Root Cause / Context
The map editor interface displays an information overlay (map ID, pointer position, debug info) over the Phaser map. There was no way to hide this overlay when working on tiles in the top-left corner, making it hard to see underneath.

## Solution
- Added a `showInfoOverlay` state variable to `src/components/RpgMapEditor.tsx`.
- Integrated a new button into the central editor toolbar (next to the Grid button) using the `lucide-react` `Info` icon to toggle this state.
- Passed the `showInfoOverlay` state as a prop to the child `PhaserGame` component.
- Modified `PhaserGame.tsx` (inline in RpgMapEditor or its prop signature) to conditionally toggle `display: 'none'` / `'block'` on the `infoTextRef` wrapper div.
