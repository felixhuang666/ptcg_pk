import re

with open("src/components/RpgMode.tsx", "r") as f:
    content = f.read()

# Add states for map resizing
react_state_old = """  const [editLayer, setEditLayer] = useState<'ground' | 'object'>('ground');
  const [isEraser, setIsEraser] = useState<boolean>(false);"""
react_state_new = """  const [editLayer, setEditLayer] = useState<'ground' | 'object'>('ground');
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [resizeWidth, setResizeWidth] = useState<number>(200);
  const [resizeHeight, setResizeHeight] = useState<number>(200);"""
content = content.replace(react_state_old, react_state_new)

# Hook into map changes to update resize inputs
map_change_old = """  const handleMapChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setCurrentMapId(newId);
    const mapObj = mapsList.find(m => m.id === newId);
    if (mapObj) setCurrentMapName(mapObj.name);
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (scene && scene.loadNewMap) {
      scene.loadNewMap(newId);
    }
  };"""
map_change_new = """  const handleMapChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setCurrentMapId(newId);
    const mapObj = mapsList.find(m => m.id === newId);
    if (mapObj) setCurrentMapName(mapObj.name);
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (scene && scene.loadNewMap) {
      scene.loadNewMap(newId).then(() => {
        if (scene.mapData) {
          setResizeWidth(scene.mapData.width);
          setResizeHeight(scene.mapData.height);
        }
      });
    }
  };"""
content = content.replace(map_change_old, map_change_new)

# Add Resize handler
handler_old = """  const handleRedo = () => {
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (scene && scene.performRedo) scene.performRedo();
  };"""
handler_new = """  const handleRedo = () => {
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (scene && scene.performRedo) scene.performRedo();
  };

  const handleResizeMap = async () => {
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (scene && scene.resizeMapData) {
      scene.resizeMapData(resizeWidth, resizeHeight);
      await handleSaveMap(); // Save automatically as requested
    }
  };"""
content = content.replace(handler_old, handler_new)

# Update UI Toolbar
toolbar_old = """                {mode === 'edit' && (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-slate-800 rounded px-2 py-1 text-xs text-white border border-slate-600 mr-2 gap-2">"""

toolbar_new = """                {mode === 'edit' && (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-slate-800 rounded px-2 py-1 text-xs text-white border border-slate-600 mr-2 gap-2">
                    <span>W:</span>
                    <input
                      type="number"
                      value={resizeWidth}
                      onChange={(e) => setResizeWidth(parseInt(e.target.value) || 10)}
                      className="w-12 bg-slate-700 text-white rounded outline-none px-1 text-center"
                      min="10"
                    />
                    <span>H:</span>
                    <input
                      type="number"
                      value={resizeHeight}
                      onChange={(e) => setResizeHeight(parseInt(e.target.value) || 10)}
                      className="w-12 bg-slate-700 text-white rounded outline-none px-1 text-center"
                      min="10"
                    />
                    <button onClick={handleResizeMap} className="bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded text-[10px] transition-colors ml-1">
                      Resize & Save
                    </button>
                  </div>
                  <div className="flex items-center bg-slate-800 rounded px-2 py-1 text-xs text-white border border-slate-600 mr-2 gap-2">"""
content = content.replace(toolbar_old, toolbar_new)

# Add loadNewMap returning promise to sync UI state
load_map_old = """      async loadNewMap(mapId: string) {
        try {
          const res = await fetch(`/api/map?id=${mapId}`);
          if (!res.ok) throw new Error('Failed to fetch map');
          const data = await res.json();
          this.mapData = data.map_data || data;
          this.renderMap();
        } catch (err) {
          console.error('Failed to load map', err);
        }
      }"""
load_map_new = """      async loadNewMap(mapId: string) {
        try {
          const res = await fetch(`/api/map?id=${mapId}`);
          if (!res.ok) throw new Error('Failed to fetch map');
          const data = await res.json();
          this.mapData = data.map_data || data;
          this.renderMap();

          // sync react UI states on load via a custom event
          const ev = new CustomEvent('mapLoaded', { detail: { width: this.mapData.width, height: this.mapData.height } });
          window.dispatchEvent(ev);
        } catch (err) {
          console.error('Failed to load map', err);
        }
      }"""
content = content.replace(load_map_old, load_map_new)


# Sync UI state in useEffect
init_map_loaded_old = """  useEffect(() => {
    const handleTileChange = (e: any) => setSelectedTile(e.detail);
    window.addEventListener('tileTypeChanged', handleTileChange);
    return () => window.removeEventListener('tileTypeChanged', handleTileChange);
  }, []);"""
init_map_loaded_new = """  useEffect(() => {
    const handleTileChange = (e: any) => setSelectedTile(e.detail);
    const handleMapLoaded = (e: any) => {
      setResizeWidth(e.detail.width);
      setResizeHeight(e.detail.height);
    };
    window.addEventListener('tileTypeChanged', handleTileChange);
    window.addEventListener('mapLoaded', handleMapLoaded);
    return () => {
      window.removeEventListener('tileTypeChanged', handleTileChange);
      window.removeEventListener('mapLoaded', handleMapLoaded);
    };
  }, []);"""
content = content.replace(init_map_loaded_old, init_map_loaded_new)

with open("src/components/RpgMode.tsx", "w") as f:
    f.write(content)
