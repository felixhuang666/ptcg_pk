# UI Header Navigation Design - Monster Battle

## 1. Overview
The Header Navigation is a persistent, responsive toolbar located at the top of the screen in various application views, primarily designed for RPG-related interfaces such as the `RpgMode`, `RpgMapEditor`, and `RpgSceneEditor`. It provides users with global actions and fast context switching.

## 2. Common Elements
Across most RPG-related interfaces, the header generally contains:

### 2.1 Left Controls
*   **Back Button**: A generic return action (using `ArrowLeft` icon) that navigates the user back to the previous screen or main menu.

### 2.2 Global State & View Toggles
*   **Map Editor Toggle**: Quick switch button to access the standalone `RpgMapEditor` view.
*   **Scene Editor Toggle**: Quick switch button to access the `RpgSceneEditor` view.
*   **Fullscreen Toggle**: A button to enter or exit browser fullscreen mode (using `Maximize`/`Minimize` icons).

### 2.3 Context-Specific Actions
Depending on the active mode (`RpgMode` Play vs Edit, `RpgMapEditor`, `RpgSceneEditor`), the header adapts to include tools specific to that mode.

#### 2.3.1 RpgMode (Play Mode)
*   **Refresh**: Reloads the current state or view (using `RefreshCw` icon).
*   **Chat Toggle**: For authenticated players, a button to show or hide the global real-time chat interface (using `MessageSquare` icon).
*   **Settings**: A button to open the RPG settings overlay, allowing users to switch between "Play Mode" and "Edit Mode" (using `Settings` icon).

#### 2.3.2 RpgMapEditor
The dedicated Map Editor extends the top bar to become a full tool palette:
*   **Map Selection Dropdown**: Allows choosing which map to edit.
*   **Map Data Management**:
    *   `New Empty Map`
    *   `Random Map` (Procedural generation)
    *   `Reload Map`
    *   `Save Map`
*   **Editor Tools**:
    *   `Grid Toggle`: Shows/hides the editor grid.
    *   `Info Toggle`: Shows/hides coordinate info text.
    *   `Move Mode` vs `Draw Mode`: Toggles camera panning vs tile painting.
    *   `Layer Selection`: Buttons to select the active editing layer (`Base`, `Decor`, `Obs`, `ObjCol`, `ObjEvt`, `Top`).
    *   `Eraser Toggle`: Switches the active brush to erase mode.
    *   `Undo / Redo`: Actions to traverse the editing history stack.

#### 2.3.3 RpgSceneEditor
The Scene Editor provides scene-level composition tools:
*   **New Scene** (`Plus` icon): Prompts to create a new scene.
*   **Save Scene** (`Save` icon): Saves the current composition to the backend.
*   **Export/Import**: Tools to download the scene JSON or upload an existing configuration (`Download`/`Upload` icons).
*   **Panel Toggles**: Buttons to show/hide the Left Palette sidebar and the Right Inspector sidebar (`PanelLeft`, `PanelRight` icons).
*   **Title**: Displays "RPG場景編輯器".

## 3. Interaction & Visual Design
*   **Theme**: Dark-themed (`bg-slate-800`), matching the overall game aesthetic.
*   **Responsiveness**: Uses flexbox layouts to ensure buttons remain accessible on various screen sizes.
*   **Tooltips**: Buttons utilize standard HTML `title` attributes alongside custom absolute-positioned elements (visible on group-hover) to provide descriptive labels without consuming horizontal space.
*   **Feedback**: Buttons feature hover states (e.g., `hover:bg-slate-700`, `text-blue-400 hover:text-blue-300`) to indicate interactivity.
