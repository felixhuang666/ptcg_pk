import re

with open("src/components/RpgMode.tsx", "r") as f:
    content = f.read()

# I had added a UI in the earlier step but it seems my sed and python replace scripts may have collided or failed.
# Looking at line 1220 onwards, it seems the Top Toolbar code I tried to insert previously is MISSING.
# The `modify_rpgmode_react_2.py` failed silently or I overwrote it.
# Let's insert the Top Toolbar properly.

toolbar_block = """          <div className="flex-1 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden relative min-h-0">
            {(playerName !== 'Player' || mode === 'edit') && ("""

new_toolbar_block = """          <div className="flex-1 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden relative min-h-0 flex flex-col">
            {mode === 'edit' && (
              <div className="w-full bg-slate-900 border-b border-slate-700 p-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0 z-[5000] relative">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-white text-sm whitespace-nowrap">Map:</span>
                  <select
                    value={currentMapId}
                    onChange={handleMapChange}
                    className="bg-slate-800 border border-slate-600 text-white text-sm rounded px-2 py-1 outline-none"
                  >
                    {mapsList.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <button onClick={handleMapRename} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap transition-colors">
                    Rename
                  </button>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={async () => {
                    const newId = 'map_' + Date.now();
                    const res = await fetch('/api/map', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: newId, name: 'New Map', map_data: { width: 200, height: 200, tiles: Array(200*200).fill(2) } })
                    });
                    if (res.ok) {
                      setMapsList(prev => [...prev, { id: newId, name: 'New Map' }]);
                      setCurrentMapId(newId);
                      setCurrentMapName('New Map');
                      const scene = (window as any).__PHASER_MAIN_SCENE__;
                      if (scene && scene.loadNewMap) scene.loadNewMap(newId);
                    }
                  }} className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-sm font-medium flex items-center gap-1 whitespace-nowrap transition-colors">
                    New Empty
                  </button>
                  <button onClick={handleGenerateMap} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-sm font-medium flex items-center gap-1 whitespace-nowrap transition-colors">
                    <RefreshCw size={14} />
                    Generate
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 relative min-h-0">
            {(playerName !== 'Player' || mode === 'edit') && ("""

if toolbar_block in content:
    content = content.replace(toolbar_block, new_toolbar_block)

    # Balance closing tags
    target_block = """            )}
            {playerName === 'Player' && mode === 'play' && (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="text-white text-xl animate-pulse">載入中...</div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}"""

    replacement_block = """            )}
            {playerName === 'Player' && mode === 'play' && (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="text-white text-xl animate-pulse">載入中...</div>
              </div>
            )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}"""
    content = content.replace(target_block, replacement_block)

    with open("src/components/RpgMode.tsx", "w") as f:
        f.write(content)
else:
    print("Could not find toolbar insertion point!")
