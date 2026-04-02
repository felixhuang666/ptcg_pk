import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Maximize, Minimize, Settings, PanelLeft, PanelRight } from 'lucide-react';
import Phaser from 'phaser';

export default function RpgSceneEditor({ onBack }: { onBack: () => void }) {
  const [scenes, setScenes] = useState<any[]>([]);
  const [currentSceneId, setCurrentSceneId] = useState<number | null>(null);
  const [sceneData, setSceneData] = useState<any>(null);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [mapsList, setMapsList] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [mode, setMode] = useState<'SCENE' | 'MAP'>('SCENE');

  const loadScenes = () => {
    fetch('/api/scenes')
      .then(res => res.json())
      .then(data => {
        setScenes(data);
        if (data.length > 0 && !currentSceneId) {
          setCurrentSceneId(data[0].id);
        }
      });
  };

  useEffect(() => {
    loadScenes();

    // Load maps list for palette
    fetch('/api/maps')
      .then(res => res.json())
      .then(data => {
        setMapsList(data);
      });
  }, []);

  useEffect(() => {
    if (currentSceneId) {
      fetch(`/api/scene/${currentSceneId}`)
        .then(res => res.json())
        .then(data => {
          setSceneData(data);
        });
    }
  }, [currentSceneId]);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-900 text-white overflow-hidden">
      <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-slate-700 text-slate-300 hover:text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center justify-center group relative"
            title="返回"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">返回</span>
          </button>

          <button
            onClick={() => {
              const name = prompt("Enter scene name:");
              if (name) {
                fetch('/api/scene', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name, map_list: [], scene_entities: { npcs: [], items: [], events: [] } })
                }).then(() => loadScenes());
              }
            }}
            className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center justify-center group relative"
            title="New Scene"
          >
            <Plus className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              if (currentSceneId && sceneData) {
                fetch(`/api/scene/${currentSceneId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(sceneData)
                }).then(() => alert('Saved!'));
              }
            }}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center group relative"
            title="Save Scene"
          >
            <Save className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
            className={`p-2 transition-colors rounded-lg group relative ${showLeftSidebar ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600'}`}
          >
            <PanelLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowRightSidebar(!showRightSidebar)}
            className={`p-2 transition-colors rounded-lg group relative ${showRightSidebar ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600'}`}
          >
            <PanelRight className="w-5 h-5" />
          </button>

          <h2 className="text-xl font-bold text-white tracking-wide ml-4">RPG場景編輯器</h2>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {showLeftSidebar && (
          <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col overflow-y-auto">
            <div className="p-4 border-b border-slate-700 font-bold">Scenes</div>
            <div className="p-2 border-b border-slate-700">
              {scenes.map(s => (
                <div key={s.id} className="flex gap-1 mb-1">
                  <button
                    className={`flex-1 text-left px-2 py-1 rounded text-sm ${s.id === currentSceneId ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
                    onClick={() => setCurrentSceneId(s.id)}
                  >
                    {s.name}
                  </button>
                  <button
                    className="p-1 text-red-400 hover:bg-slate-700 rounded"
                    onClick={() => {
                      if (confirm('Delete scene?')) {
                        fetch(`/api/scene/${s.id}`, { method: 'DELETE' }).then(() => loadScenes());
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 border-b border-slate-700 font-bold">Palette</div>
            <div className="p-2 space-y-4">
              <div>
                <h3 className="text-sm text-slate-400 mb-2">Maps</h3>
                <div className="grid grid-cols-2 gap-2">
                  {mapsList.map(m => (
                    <div
                      key={m.id}
                      className="bg-slate-700 p-2 rounded cursor-grab active:cursor-grabbing text-xs text-center border border-slate-600 hover:border-blue-400"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'map', map_id: m.id, map_size: { width: m.map_data?.width || 20, height: m.map_data?.height || 20 } }));
                      }}
                    >
                      {m.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          className="flex-1 relative bg-black"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(e) => {
            e.preventDefault();
            const dataStr = e.dataTransfer.getData('application/json');
            if (!dataStr) return;
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'map' && sceneData) {
                // Determine drop coordinates based on Phaser camera
                const phaserScene = (window as any).__PHASER_SCENE_EDITOR__;
                let worldX = 0, worldY = 0;
                if (phaserScene && phaserScene.cameras && phaserScene.cameras.main) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const worldPoint = phaserScene.cameras.main.getWorldPoint(x, y);
                  // Snap to grid (32px blocks)
                  worldX = Math.round(worldPoint.x / 32);
                  worldY = Math.round(worldPoint.y / 32);
                }

                const newMapEntry = {
                  map_id: data.map_id,
                  map_size: data.map_size,
                  offset_position: { x: worldX, y: worldY }
                };

                setSceneData({
                  ...sceneData,
                  map_list: [...(sceneData.map_list || []), newMapEntry]
                });
              }
            } catch (err) {
              console.error(err);
            }
          }}
        >
          <PhaserGameComponent sceneData={sceneData} onSelect={(item) => setSelectedItem(item)} />
        </div>

        {showRightSidebar && (
          <div className="w-64 bg-slate-800 border-l border-slate-700 flex flex-col">
            <div className="p-4 border-b border-slate-700 font-bold">Inspector</div>
            <div className="flex-1 overflow-y-auto p-4 text-sm">
              {!selectedItem && <div className="text-slate-400">Select an item to view properties.</div>}
              {selectedItem && selectedItem.type === 'map' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Map ID</label>
                    <input type="text" readOnly value={selectedItem.map_id} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Offset X</label>
                    <input
                      type="number"
                      value={selectedItem.offset_position?.x || 0}
                      onChange={(e) => {
                        const newX = Number(e.target.value);
                        setSelectedItem({ ...selectedItem, offset_position: { ...selectedItem.offset_position, x: newX } });
                        // Update in sceneData
                        if (sceneData) {
                          const newMapList = sceneData.map_list.map((m: any) => m.map_id === selectedItem.map_id ? { ...m, offset_position: { ...m.offset_position, x: newX } } : m);
                          setSceneData({ ...sceneData, map_list: newMapList });
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Offset Y</label>
                    <input
                      type="number"
                      value={selectedItem.offset_position?.y || 0}
                      onChange={(e) => {
                        const newY = Number(e.target.value);
                        setSelectedItem({ ...selectedItem, offset_position: { ...selectedItem.offset_position, y: newY } });
                        if (sceneData) {
                          const newMapList = sceneData.map_list.map((m: any) => m.map_id === selectedItem.map_id ? { ...m, offset_position: { ...m.offset_position, y: newY } } : m);
                          setSceneData({ ...sceneData, map_list: newMapList });
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (sceneData) {
                        const newMapList = sceneData.map_list.filter((m: any) => m.map_id !== selectedItem.map_id);
                        setSceneData({ ...sceneData, map_list: newMapList });
                        setSelectedItem(null);
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-500 text-white rounded px-2 py-1 font-bold mt-4"
                  >
                    Remove Map
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
