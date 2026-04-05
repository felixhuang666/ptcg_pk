import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Maximize, Minimize, Settings, PanelLeft, PanelRight, Download, Upload } from 'lucide-react';
import Phaser from 'phaser';

class SceneEditorPhaser extends Phaser.Scene {
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private mapsContainer!: Phaser.GameObjects.Container;
  private onSelect!: (item: any) => void;

  constructor() {
    super({ key: 'SceneEditorPhaser' });
  }

  init(data: any) {
    this.onSelect = data.onSelect;
    (window as any).__PHASER_SCENE_EDITOR__ = this;
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a1a');

    // Draw Grid
    const gridSize = 32;
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.lineStyle(1, 0x444444, 0.5);
    for (let x = -4000; x <= 4000; x += gridSize) {
      this.gridGraphics.moveTo(x, -4000);
      this.gridGraphics.lineTo(x, 4000);
    }
    for (let y = -4000; y <= 4000; y += gridSize) {
      this.gridGraphics.moveTo(-4000, y);
      this.gridGraphics.lineTo(4000, y);
    }
    this.gridGraphics.strokePath();

    this.mapsContainer = this.add.container(0, 0);

    // Zoom and Pan
    this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number, deltaZ: number) => {
      let newZoom = this.cameras.main.zoom - (deltaY * 0.001);
      newZoom = Phaser.Math.Clamp(newZoom, 0.1, 2);
      this.cameras.main.setZoom(newZoom);
    });

    let isPanning = false;
    this.input.on('pointerdown', (pointer: any) => {
      if (pointer.middleButtonDown() || this.input.keyboard?.checkDown(this.input.keyboard.addKey('SPACE'), 0)) {
        isPanning = true;
      }
    });

    this.input.on('pointerup', () => {
      isPanning = false;
    });

    this.input.on('pointermove', (pointer: any) => {
      if (isPanning && pointer.isDown) {
        this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
      }
    });
  }

  updateSceneData(sceneData: any) {
    if (!this.mapsContainer) return;
    this.mapsContainer.removeAll(true);

    if (!sceneData || !sceneData.map_list) return;

    let mapList = getParsedMapList(sceneData.map_list);

    // Sort maps by layer index so they render in correct order
    const layers = sceneData.layers || [];
    const layerIndices = layers.reduce((acc: any, layer: any, idx: number) => {
      acc[layer.id] = idx;
      return acc;
    }, {});

    mapList.sort((a: any, b: any) => {
      const idxA = layerIndices[a.layer_id] ?? 999;
      const idxB = layerIndices[b.layer_id] ?? 999;
      return idxA - idxB;
    });

    mapList.forEach((map: any) => {
      const pxX = (map.offset_position?.x || 0) * 32;
      const pxY = (map.offset_position?.y || 0) * 32;
      const pxW = (map.map_size?.width || 20) * 32;
      const pxH = (map.map_size?.height || 20) * 32;

      const rect = this.add.rectangle(pxX + pxW/2, pxY + pxH/2, pxW, pxH, 0x00ff00, 0.2);
      rect.setStrokeStyle(2, 0x00ff00);
      rect.setInteractive();

      rect.on('pointerdown', (pointer: any) => {
        if (pointer.leftButtonDown()) {
          this.onSelect({ type: 'map', ...map });
        }
      });

      const text = this.add.text(pxX + 5, pxY + 5, map.map_id, { color: '#ffffff', fontSize: '16px' });

      this.mapsContainer.add([rect, text]);
    });
  }
}

function PhaserGameComponent({ sceneData, onSelect }: { sceneData: any, onSelect: (item: any) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: '100%',
      height: '100%',
      scene: [SceneEditorPhaser],
      scale: {
        mode: Phaser.Scale.RESIZE,
      },
    };

    gameRef.current = new Phaser.Game(config);

    gameRef.current.events.on('ready', () => {
      const scene = gameRef.current?.scene.getScene('SceneEditorPhaser') as SceneEditorPhaser;
      if (scene) {
        scene.init({ onSelect });
        if (sceneData) {
          scene.updateSceneData(sceneData);
        }
      }
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      (window as any).__PHASER_SCENE_EDITOR__ = null;
    };
  }, []);

  useEffect(() => {
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('SceneEditorPhaser') as SceneEditorPhaser;
      if (scene && scene.updateSceneData) {
        scene.updateSceneData(sceneData);
      }
    }
  }, [sceneData]);

  return <div ref={containerRef} className="w-full h-full" />;
}

function getParsedMapList(mapListRaw: any): any[] {
  let list = mapListRaw;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch (e) { list = []; }
  }
  return Array.isArray(list) ? list : [];
}

export default function RpgSceneEditor({ onBack }: { onBack: () => void }) {
  const [scenes, setScenes] = useState<any[]>([]);
  const [currentSceneId, setCurrentSceneId] = useState<number | null>(null);
  const [sceneData, setSceneData] = useState<any>(null);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [mapsList, setMapsList] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [mode, setMode] = useState<'SCENE' | 'MAP'>('SCENE');
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

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
          let updatedData = { ...data };
          if (!updatedData.layers || updatedData.layers.length === 0) {
            const newLayerId = 'layer-' + Date.now();
            updatedData.layers = [{ id: newLayerId, name: 'Base Layer' }];
            const currentList = getParsedMapList(updatedData.map_list);
            updatedData.map_list = currentList.map((m: any) => ({
              ...m,
              layer_id: m.layer_id || newLayerId
            }));
          }
          setSceneData(updatedData);
          if (updatedData.layers.length > 0) {
            setActiveLayerId(updatedData.layers[0].id);
          }
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
                  body: JSON.stringify({
                    name,
                    layers: [{ id: 'layer-' + Date.now(), name: 'Base Layer' }],
                    map_list: [],
                    scene_entities: { npcs: [], items: [], events: [] }
                  })
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
            onClick={() => {
              if (!sceneData) return;
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sceneData, null, 2));
              const downloadAnchorNode = document.createElement('a');
              downloadAnchorNode.setAttribute("href", dataStr);
              downloadAnchorNode.setAttribute("download", `scene_${currentSceneId || 'export'}.json`);
              document.body.appendChild(downloadAnchorNode);
              downloadAnchorNode.click();
              downloadAnchorNode.remove();
            }}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors flex items-center justify-center group relative"
            title="Export Scene"
          >
            <Download className="w-5 h-5" />
          </button>

          <label
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors flex items-center justify-center group relative cursor-pointer"
            title="Import Scene"
          >
            <Upload className="w-5 h-5" />
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const importedData = JSON.parse(event.target?.result as string);
                    if (importedData && importedData.map_list) {
                      setSceneData(importedData);
                      alert('Scene imported! Don\'t forget to save.');
                    } else {
                      alert('Invalid scene data format.');
                    }
                  } catch (err) {
                    console.error('Error parsing JSON:', err);
                    alert('Error reading file.');
                  }
                };
                reader.readAsText(file);
                // Reset input value so the same file can be selected again
                e.target.value = '';
              }}
            />
          </label>

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

            <div className="p-4 border-b border-slate-700 font-bold flex justify-between items-center">
              <span>Layers</span>
              <button
                onClick={() => {
                  if (sceneData) {
                    const newLayerId = 'layer-' + Date.now();
                    const newLayerName = prompt("Enter layer name:", "New Layer");
                    if (newLayerName) {
                      const newLayers = [...(sceneData.layers || []), { id: newLayerId, name: newLayerName }];
                      setSceneData({ ...sceneData, layers: newLayers });
                      setActiveLayerId(newLayerId);
                    }
                  }
                }}
                className="p-1 bg-slate-700 hover:bg-slate-600 rounded"
                title="Add Layer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 border-b border-slate-700">
              {(sceneData?.layers || []).map((layer: any) => (
                <div key={layer.id} className="flex gap-1 mb-1">
                  <button
                    className={`flex-1 text-left px-2 py-1 rounded text-sm ${layer.id === activeLayerId ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}
                    onClick={() => setActiveLayerId(layer.id)}
                  >
                    {layer.name}
                  </button>
                  <button
                    className="p-1 text-red-400 hover:bg-slate-700 rounded"
                    onClick={() => {
                      if (confirm('Delete layer and all its maps?')) {
                        const newLayers = sceneData.layers.filter((l: any) => l.id !== layer.id);
                        const newMapList = getParsedMapList(sceneData.map_list).filter((m: any) => m.layer_id !== layer.id);
                        setSceneData({ ...sceneData, layers: newLayers, map_list: newMapList });
                        if (activeLayerId === layer.id) {
                          setActiveLayerId(newLayers.length > 0 ? newLayers[0].id : null);
                        }
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

                if (!activeLayerId) {
                  alert("Please select a layer first!");
                  return;
                }

                const newMapEntry = {
                  map_id: data.map_id,
                  map_size: data.map_size,
                  offset_position: { x: worldX, y: worldY },
                  layer_id: activeLayerId
                };

                const currentList = getParsedMapList(sceneData.map_list);

                setSceneData({
                  ...sceneData,
                  map_list: [...currentList, newMapEntry]
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
                    <label className="block text-slate-400 text-xs mb-1">Layer</label>
                    <select
                      value={selectedItem.layer_id || ''}
                      onChange={(e) => {
                        const newLayerId = e.target.value;
                        setSelectedItem({ ...selectedItem, layer_id: newLayerId });
                        if (sceneData) {
                          const currentList = getParsedMapList(sceneData.map_list);
                          const newMapList = currentList.map((m: any) => m.map_id === selectedItem.map_id ? { ...m, layer_id: newLayerId } : m);
                          setSceneData({ ...sceneData, map_list: newMapList });
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white"
                    >
                      {(sceneData?.layers || []).map((l: any) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
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
                          const currentList = getParsedMapList(sceneData.map_list);
                          const newMapList = currentList.map((m: any) => m.map_id === selectedItem.map_id ? { ...m, offset_position: { ...m.offset_position, x: newX } } : m);
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
                          const currentList = getParsedMapList(sceneData.map_list);
                          const newMapList = currentList.map((m: any) => m.map_id === selectedItem.map_id ? { ...m, offset_position: { ...m.offset_position, y: newY } } : m);
                          setSceneData({ ...sceneData, map_list: newMapList });
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (sceneData) {
                        const currentList = getParsedMapList(sceneData.map_list);
                        const newMapList = currentList.filter((m: any) => m.map_id !== selectedItem.map_id);
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
