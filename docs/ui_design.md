# UI Design Documentation - Monster Battle

## 1. Overview
The UI for "Monster Battle" is designed to be modern, dark-themed, and fully responsive. It uses a high-contrast color palette to highlight interactive elements and battle status.

## 2. Layout Design

### 2.1 Mobile View (Portrait)
- **Top Bar**: Game title and "Exit" button.
- **Opponent Section**: Located at the top. Shows opponent's name, HP bar, AP bar, and a small monster icon.
- **Arena Area**: Central area showing both monsters facing each other. On mobile, this may be simplified to show icons or smaller versions of the SVGs.
- **Player Section**: Located below the arena. Shows player's HP bar and monster info.
- **Log Window**: A small, scrollable area above the controls.
- **Controls (Bottom)**: Sticky bottom area with dice results and skill buttons. Contains an "Engineering Pause" toggle when engineering mode is active.

### 2.2 Desktop View (Landscape)
- **Layout**: 3-column or split layout.
- **Left/Right Sides**: Opponent and Player info panels, including detailed stats and monster SVGs.
- **Center**: Large arena with animated monster SVGs and log window overlay.
- **Bottom**: Full-width control panel for skills and dice.

### 2.3 RPG Map Editor View
The RPG Map Editor features a specialized, highly interactive interface for map creation:
- **Top Bar**: Provides global controls including Map Selection, Grid Toggle, Info Toggle, Mode Switch (Draw/Move), Layer Selection (`Base`, `Decor`, `Obs`, `ObjCol`, `ObjEvt`, `Top`), Eraser, Undo/Redo, Save, and Generate Map.
- **Left Sidebar (Tilesets)**: Displays the active tileset and provides a grid to select specific tiles for painting. It also displays predefined logical IDs (e.g., Wall, Empty) when editing logical layers.
- **Center Canvas**: The main interactive grid powered by Phaser for painting and manipulating the map.
- **Right Sidebar (Details & Settings)**:
  - *Tile Details*: Displays detailed metadata about the currently selected tile (ID, Source Image, Coordinates, Tags).
  - *Advanced Settings*: Provides tools to Rename the map, Resize dimensions (width/height), and modify block sizes.

## 3. Visual Elements

### 3.1 Color Palette
- **Primary Background**: `#0f172a` (Slate-900)
- **Secondary Background**: `#1e293b` (Slate-800)
- **Accent - HP**: Gradient from `#ef4444` (Red-500) to `#b91c1c` (Red-700)
- **Accent - AP**: `#f59e0b` (Amber-500)
- **Accent - Success**: `#10b981` (Emerald-500)
- **Accent - Info**: `#3b82f6` (Blue-500)

### 3.2 Typography
- **Headings**: Sans-serif, bold, high tracking.
- **Stats/Logs**: Monospace font for clarity in calculations.

## 4. Animation Principles
- **Monster Entry**: Fade in and slide from the sides.
- **Attacks**: Brief shake or forward movement of the attacking monster.
- **Damage Feedback**:
  - Shake the receiving monster SVG.
  - Floating damage numbers (red for damage, green for healing/buffs).
- **AP Bar**: Smooth transition as it fills up.
- **Skill Ready**: Pulse effect on the skill button when AP is sufficient and conditions are met.
- **Game Paused**: The "Pause" button pulses with an amber glow when active to indicate the game loop is halted.

## 5. Responsive Breakpoints
- **Mobile (< 640px)**: Vertical stack layout.
- **Tablet (640px - 1024px)**: Improved spacing, larger icons.
- **Desktop (> 1024px)**: Full arena experience with side panels.

## 6. State Persistence
- **View Persistence**: The application remembers the last active game mode (e.g., "RPG_MODE") across sessions using browser cookies (`last_view`). This ensures players returning to the game can seamlessly continue their experience without having to navigate through the main menu again.