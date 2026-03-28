import re

with open("src/components/RpgMode.tsx", "r") as f:
    content = f.read()

# I see what you mean! I only render the Toolbar when `mode === 'edit'`!
# The user wants to be able to select maps when THEY ENTER the RPG mode.
# Let's add the map select to the 'play' mode too, or in the Settings menu where they switch modes.
# Actually, the user's prompt says: "在地圖管理介面, 可以選擇地圖... 新增切換地圖的功能 於上方工具列中".
# "在地圖管理介面" means in the map management interface (the Editor).
# Wait, let me make the toolbar show up for BOTH modes or maybe just add a simple map switch for the player too.
# The user's prompt: "在地圖管理介面, 可以選擇地圖... 新增切換地圖的功能 於上方工具列中"
# This typically implies the toolbar. If the user wants it to be visible ALWAYS so players can select maps too, I can remove the `mode === 'edit'` check for the toolbar, or specifically for the map selection part.
# Let's just remove the `mode === 'edit' &&` wrap around the toolbar so the toolbar is ALWAYS visible (maybe hide the editor specific buttons like Generate/Rename if not in edit mode).

toolbar_block = """          <div className="flex-1 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden relative min-h-0 flex flex-col">
            {mode === 'edit' && (
              <div className="w-full bg-slate-900 border-b border-slate-700 p-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0 z-[5000] relative">
                <div className="flex items-center gap-2 shrink-0">"""

new_toolbar_block = """          <div className="flex-1 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden relative min-h-0 flex flex-col">
            {true && (
              <div className="w-full bg-slate-900 border-b border-slate-700 p-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0 z-[5000] relative">
                <div className="flex items-center gap-2 shrink-0">"""

if toolbar_block in content:
    content = content.replace(toolbar_block, new_toolbar_block)

hide_editor_btns = """                  <button onClick={handleMapRename} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap transition-colors">
                    Rename
                  </button>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={async () => {"""

new_hide_editor_btns = """                  {mode === 'edit' && (
                  <button onClick={handleMapRename} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap transition-colors">
                    Rename
                  </button>
                  )}
                </div>
                {mode === 'edit' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={async () => {"""

content = content.replace(hide_editor_btns, new_hide_editor_btns)

hide_editor_btns_end = """                  <button onClick={handleGenerateMap} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-sm font-medium flex items-center gap-1 whitespace-nowrap transition-colors">
                    <RefreshCw size={14} />
                    Generate
                  </button>
                </div>
              </div>
            )}"""

new_hide_editor_btns_end = """                  <button onClick={handleGenerateMap} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-sm font-medium flex items-center gap-1 whitespace-nowrap transition-colors">
                    <RefreshCw size={14} />
                    Generate
                  </button>
                </div>
                )}
              </div>
            )}"""

content = content.replace(hide_editor_btns_end, new_hide_editor_btns_end)

# Also need to fetch maps list in play mode as well
use_effect_fetch_maps = """  useEffect(() => {
    if (mode === 'edit') {
      fetch('/api/maps')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setMapsList(data);
          }
        })
        .catch(err => console.error('Failed to fetch maps', err));
    }
  }, [mode]);"""

new_use_effect_fetch_maps = """  useEffect(() => {
    fetch('/api/maps')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMapsList(data);
        }
      })
      .catch(err => console.error('Failed to fetch maps', err));
  }, []);"""

content = content.replace(use_effect_fetch_maps, new_use_effect_fetch_maps)

with open("src/components/RpgMode.tsx", "w") as f:
    f.write(content)
