import React, { useState, useEffect, useRef } from "react";
import GameObjectTemplateCreator from "./GameObjectTemplateCreator";
import { Bot, ArrowLeft, Save, Plus, Trash2, Maximize, Minimize, Settings, PanelLeft, PanelRight, Download, Upload, ChevronDown, ChevronRight, HardDrive } from 'lucide-react';
import Phaser from 'phaser';

class SceneEditorPhaser extends Phaser.Scene {
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private mapsContainer!: Phaser.GameObjects.Container;
  private onSelect!: (item: any) => void;
  private onUpdateMapOffset!: (instanceId: string, newX: number, newY: number) => void;
  private onUpdateGameObjectOffset!: (instanceId: string, newX: number, newY: number) => void;

  constructor() {
    super({ key: 'SceneEditorPhaser' });
  }

  init(data: any) {
    this.onSelect = data.onSelect;
    this.onUpdateMapOffset = data.onUpdateMapOffset;
    this.onUpdateGameObjectOffset = data.onUpdateGameObjectOffset;
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

  private mapTilemaps: Phaser.Tilemaps.Tilemap[] = [];

  updateSceneData(sceneData: any, mapsList: any[] = [], gameObjectTemplates: any[] = []) {
    if (!this.mapsContainer) return;

    this.mapTilemaps.forEach(tm => tm.destroy());
    this.mapTilemaps = [];
    this.mapsContainer.removeAll(true);

    const sceneMapList = sceneData?.map_list || sceneData?.scene_entities?.map_list;

    if (!sceneData || !sceneMapList) {
      return;
    }

    let mapList = getParsedMapList(sceneMapList);

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

    // Gather all required tilesets to preload
    const tilesetsToLoad: any[] = [];
    mapList.forEach((map: any) => {
      const fullMapData = mapsList.find(m => m.id === map.map_id);
      if (fullMapData && fullMapData.map_data) {
        const tilesetsMeta = fullMapData.map_data.map_meta?.tilesets || [];
        if (tilesetsMeta.length === 0 && fullMapData.map_data.tilesets) {
          // fallback
          tilesetsMeta.push(...fullMapData.map_data.tilesets);
        }
        if (tilesetsMeta.length === 0) {
          tilesetsMeta.push({
            firstgid: 1,
            name: 'main_20x10',
            image_source: 'main_20x10.png',
            tilewidth: 32,
            tileheight: 32
          });
        }
        tilesetsMeta.forEach((tsMeta: any) => {
          let src = tsMeta.image_source;
          if (src && !src.endsWith('.png') && !src.endsWith('.jpg') && !src.endsWith('.jpeg')) src += '.png';
          const key = `tileset_${tsMeta.name}`;
          if (!tilesetsToLoad.find(t => t.key === key)) {
            tilesetsToLoad.push({ key, src, tsMeta });
          }
        });
      }
    });

    // Track what needs actual loading
    let filesToLoad = 0;

    tilesetsToLoad.forEach(t => {
      if (!this.textures.exists(t.key)) {
        console.log(`[SceneEditorPhaser] Loading missing texture: ${t.key}`);
        const imgUrl = `/assets/map_tileset/${t.src}`;
        this.load.image(t.key, imgUrl);
        filesToLoad++;
      }
    });

    const renderAllMaps = () => {
      mapList.forEach((map: any) => {
        const startGridX = map.offset_position?.x || 0;
        const startGridY = map.offset_position?.y || 0;
        const pxX = startGridX * 32;
        const pxY = startGridY * 32;

        const fullMapData = mapsList.find(m => m.id === map.map_id);

        // Use actual map dimensions from full map data when available, fallback to scene's map_size
        const actualWidth = (fullMapData?.map_data?.width) || (map.map_size?.width || 20);
        const actualHeight = (fullMapData?.map_data?.height) || (map.map_size?.height || 20);
        const pxW = actualWidth * 32;
        const pxH = actualHeight * 32;

        // Track all tilemap layers for this map (needed for drag since tilemap layers ignore container transforms)
        const mapLayers: Phaser.Tilemaps.TilemapLayer[] = [];

        if (fullMapData && fullMapData.map_data && fullMapData.map_data.layers) {
          const mapData = fullMapData.map_data;
          const tilemap = this.make.tilemap({ width: mapData.width || 20, height: mapData.height || 20, tileWidth: 32, tileHeight: 32 });
          this.mapTilemaps.push(tilemap);

          const tilesetsMeta = mapData.map_meta?.tilesets || [];
          if (tilesetsMeta.length === 0 && mapData.tilesets) {
             tilesetsMeta.push(...mapData.tilesets);
          }
          if (tilesetsMeta.length === 0) {
            tilesetsMeta.push({
              firstgid: 1,
              name: 'main_20x10',
              image_source: 'main_20x10.png',
              tilewidth: 32,
              tileheight: 32
            });
          }

          const tilesetInstances: Phaser.Tilemaps.Tileset[] = [];
          tilesetsMeta.forEach((tsMeta: any) => {
            const key = `tileset_${tsMeta.name}`;
            const ts = tilemap.addTilesetImage(tsMeta.name, key, tsMeta.tilewidth || 32, tsMeta.tileheight || 32, tsMeta.margin || 0, tsMeta.spacing || 0, tsMeta.firstgid);
            if (ts) tilesetInstances.push(ts);
          });

          const createLayer = (name: string, depth: number) => {
            if (tilesetInstances.length === 0) return null;
            // Position tilemap layers directly at the map's pixel offset
            const l = tilemap.createBlankLayer(name, tilesetInstances, pxX, pxY);
            if (!l) {
                console.error(`[SceneEditorPhaser] Failed to create blank layer ${name}`);
                return null;
            }
            l.setDepth(depth);
            const data = mapData.layers[name];
            if (data) {
              for (let y = 0; y < mapData.height; y++) {
                for (let x = 0; x < mapData.width; x++) {
                  const val = data[y * mapData.width + x];
                  if (val !== undefined && val !== 0 && val !== -1) {
                    const tile = l.putTileAt(val, x, y);
                    if (!tile) {
                        console.warn(`[SceneEditorPhaser] putTileAt failed for val ${val} at ${x},${y} on layer ${name}`);
                    }
                  }
                }
              }
            }
            return l;
          };

          const layersToRender = [
            { name: 'base', depth: 0 },
            { name: 'decorations', depth: 1 },
            { name: 'obstacles', depth: 2 },
            { name: 'objectCollides', depth: 3 },
            { name: 'objectEvent', depth: 4 },
            { name: 'topLayer', depth: 10 }
          ];

          layersToRender.forEach(ld => {
            const l = createLayer(ld.name, ld.depth);
            if (l) {
               mapLayers.push(l);
            }
          });
        }

        const rect = this.add.rectangle(pxX + pxW/2, pxY + pxH/2, pxW, pxH, 0x00ff00, 0.0);
        rect.setStrokeStyle(2, 0x00ff00);
        rect.setInteractive({ draggable: true });
        rect.setDepth(100);

        const text = this.add.text(pxX + 5, pxY + 5, map.map_id, { color: '#ffffff', fontSize: '16px' });
        text.setDepth(100);

        rect.on('pointerdown', (pointer: any) => {
          if (pointer.leftButtonDown()) {
            this.onSelect({ type: 'map', ...map });
          }
        });

        rect.on('drag', (pointer: any, dragX: number, dragY: number) => {
          rect.x = dragX;
          rect.y = dragY;
          text.x = dragX - pxW/2 + 5;
          text.y = dragY - pxH/2 + 5;
          const newLeftX = dragX - pxW/2;
          const newTopY = dragY - pxH/2;
          // Move each tilemap layer directly (they don't respond to container transforms)
          mapLayers.forEach(l => l.setPosition(newLeftX, newTopY));
        });

        rect.on('dragend', () => {
          const newLeftX = rect.x - pxW/2;
          const newTopY = rect.y - pxH/2;
          const snappedGridX = Math.round(newLeftX / 32);
          const snappedGridY = Math.round(newTopY / 32);

          const snappedPxX = snappedGridX * 32;
          const snappedPxY = snappedGridY * 32;
          rect.x = snappedPxX + pxW/2;
          rect.y = snappedPxY + pxH/2;
          text.x = snappedPxX + 5;
          text.y = snappedPxY + 5;
          mapLayers.forEach(l => l.setPosition(snappedPxX, snappedPxY));

          if (this.onUpdateMapOffset && (snappedGridX !== startGridX || snappedGridY !== startGridY)) {
            this.onUpdateMapOffset(map.instance_id, snappedGridX, snappedGridY);
          }
        });

        this.mapsContainer.add([rect, text, ...mapLayers]);
      });
    };

    const renderAllGameObjects = () => {
      const gameObjects = sceneData?.scene_entities?.game_objects || [];
      gameObjects.forEach((obj: any) => {
        const startGridX = obj.position?.x || 0;
        const startGridY = obj.position?.y || 0;
        const pxX = startGridX * 32;
        const pxY = startGridY * 32;

        let pxW = 32;
        let pxH = 32;

        if (obj.container_override) {
          pxW = obj.container_override.width || 32;
          pxH = obj.container_override.height || 32;
        } else {
          const tpl = gameObjectTemplates.find(t => t.id === obj.template_id);
          if (tpl) {
             pxW = tpl.container_width || 32;
             pxH = tpl.container_height || 32;
          }
        }

        const rect = this.add.rectangle(pxX + pxW/2, pxY + pxH/2, pxW, pxH, 0xff8800, 0.2);
        rect.setStrokeStyle(2, 0xff8800);
        rect.setInteractive({ draggable: true });
        rect.setDepth(200);

        const labelText = this.add.text(pxX + 5, pxY + 5, obj.template_id, { color: '#ffffff', fontSize: '12px', wordWrap: { width: pxW - 10 } });
        labelText.setDepth(200);

        rect.on('pointerdown', (pointer: any) => {
          if (pointer.leftButtonDown()) {
            this.onSelect({ type: 'game_object', ...obj });
          }
        });

        rect.on('drag', (pointer: any, dragX: number, dragY: number) => {
          rect.x = dragX;
          rect.y = dragY;
          labelText.x = dragX - pxW/2 + 5;
          labelText.y = dragY - pxH/2 + 5;
        });

        rect.on('dragend', () => {
          const newLeftX = rect.x - pxW/2;
          const newTopY = rect.y - pxH/2;
          const snappedGridX = Math.round(newLeftX / 32);
          const snappedGridY = Math.round(newTopY / 32);

          const snappedPxX = snappedGridX * 32;
          const snappedPxY = snappedGridY * 32;
          rect.x = snappedPxX + pxW/2;
          rect.y = snappedPxY + pxH/2;
          labelText.x = snappedPxX + 5;
          labelText.y = snappedPxY + 5;

          if (this.onUpdateGameObjectOffset && (snappedGridX !== startGridX || snappedGridY !== startGridY)) {
            this.onUpdateGameObjectOffset(obj.id, snappedGridX, snappedGridY);
          }
        });

        this.mapsContainer.add([rect, labelText]);
      });
    };

    if (filesToLoad === 0) {
      renderAllMaps();
      renderAllGameObjects();
    } else {
      let loadedCount = 0;
      tilesetsToLoad.forEach(t => {
        this.load.once(`filecomplete-image-${t.key}`, () => {
          loadedCount++;
          if (loadedCount >= filesToLoad) {
            renderAllMaps();
            renderAllGameObjects();
          }
        });
      });

      this.load.once('loaderror', (fileObj: any) => {
         console.error(`[SceneEditorPhaser] Load error for ${fileObj?.key}`);
         loadedCount++;
         if (loadedCount >= filesToLoad) {
            renderAllMaps();
            renderAllGameObjects();
         }
      });

      this.load.start();
    }
  }
}

function PhaserGameComponent({ sceneData, mapsList, gameObjectTemplates, onSelect, onUpdateMapOffset, onUpdateGameObjectOffset }: { sceneData: any, mapsList: any[], gameObjectTemplates: any[], onSelect: (item: any) => void, onUpdateMapOffset: (instanceId: string, newX: number, newY: number) => void, onUpdateGameObjectOffset: (instanceId: string, newX: number, newY: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameRef.current && containerRef.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
        scene: [SceneEditorPhaser]
      };
      gameRef.current = new Phaser.Game(config);

      gameRef.current.events.on('ready', () => {
        const scene = gameRef.current?.scene.getScene('SceneEditorPhaser') as SceneEditorPhaser;
        if (scene) {
          scene.init({ onSelect, onUpdateMapOffset, onUpdateGameObjectOffset });
          scene.updateSceneData(sceneData, mapsList, gameObjectTemplates);
        }
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('SceneEditorPhaser') as SceneEditorPhaser;
      if (scene) {
        scene.updateSceneData(sceneData, mapsList, gameObjectTemplates);
      }
    }
  }, [sceneData, mapsList, gameObjectTemplates]);

  // Update callbacks internally in the scene if they change
  useEffect(() => {
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('SceneEditorPhaser') as SceneEditorPhaser;
      if (scene) {
        scene.init({ onSelect, onUpdateMapOffset });
      }
    }
  }, [onSelect, onUpdateMapOffset]);

  useEffect(() => {
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('SceneEditorPhaser') as SceneEditorPhaser;
      if (scene && scene.updateSceneData) {
        scene.updateSceneData(sceneData, mapsList);
      }
    }
  }, [sceneData, mapsList]);

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
  const [gameObjectTemplates, setGameObjectTemplates] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [mode, setMode] = useState<'SCENE' | 'MAP'>('SCENE');
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [showAddMapModal, setShowAddMapModal] = useState<string | null>(null);
  const [showTemplateCreator, setShowTemplateCreator] = useState(false);

  const [isScenesExpanded, setIsScenesExpanded] = useState(true);
  const [isLayersExpanded, setIsLayersExpanded] = useState(true);
  const [isPaletteExpanded, setIsPaletteExpanded] = useState(true);

  const loadScenes = (newSceneId?: number) => {
    fetch('/api/scenes')
      .then(res => res.json())
      .then(data => {
        setScenes(data);
        if (newSceneId) {
          setCurrentSceneId(newSceneId);
        } else if (data.length > 0 && !currentSceneId) {
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

    // Load game object templates for palette
    fetch('/api/game_obj_templates')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch templates');
        return res.json();
      })
      .then(data => {
        setGameObjectTemplates(data);
      })
      .catch(err => {
        console.error('Error fetching game_obj_templates:', err);
      });
  }, []);

  useEffect(() => {
    if (currentSceneId) {
      fetch(`/api/scene/${currentSceneId}`)
        .then(res => res.json())
        .then(async (data) => {
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

          // Fetch full map data for all maps referenced in this scene
          const currentList = getParsedMapList(updatedData.map_list);
          const usedMapIds = [...new Set(currentList.map((m: any) => m.map_id))];
          if (usedMapIds.length > 0) {
            try {
              const fullMaps = await Promise.all(
                usedMapIds.map(async (mapId: string) => {
                  const res = await fetch(`/api/map?id=${mapId}`);
                  if (res.ok) return res.json();
                  return null;
                })
              );
              const validMaps = fullMaps.filter(Boolean);
              // Merge full map data into mapsList: replace shallow entries with full data
              setMapsList(prev => {
                const merged = [...prev];
                for (const fullMap of validMaps) {
                  const idx = merged.findIndex(m => m.id === fullMap.id);
                  if (idx !== -1) {
                    merged[idx] = fullMap;
                  } else {
                    merged.push(fullMap);
                  }
                }
                return merged;
              });
            } catch (err) {
              console.error('[RpgSceneEditor] Error fetching full map data:', err);
            }
          }
        });
    }
  }, [currentSceneId]);

  // Auto-fetch full map data for any newly added maps that aren't yet enriched
  useEffect(() => {
    if (!sceneData) return;
    const currentList = getParsedMapList(sceneData.map_list);
    const missingMapIds = [...new Set(
      currentList
        .map((m: any) => m.map_id)
        .filter((mapId: string) => !mapsList.find(m => m.id === mapId && m.map_data))
    )];
    if (missingMapIds.length === 0) return;

    (async () => {
      try {
        const fullMaps = await Promise.all(
          missingMapIds.map(async (mapId: string) => {
            const res = await fetch(`/api/map?id=${mapId}`);
            if (res.ok) return res.json();
            return null;
          })
        );
        const validMaps = fullMaps.filter(Boolean);
        if (validMaps.length > 0) {
          setMapsList(prev => {
            const merged = [...prev];
            for (const fullMap of validMaps) {
              const idx = merged.findIndex(m => m.id === fullMap.id);
              if (idx !== -1) {
                merged[idx] = fullMap;
              } else {
                merged.push(fullMap);
              }
            }
            return merged;
          });
        }
      } catch (err) {
        console.error('[RpgSceneEditor] Error fetching missing map data:', err);
      }
    })();
  }, [sceneData?.map_list]);

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
                })
                .then(res => res.json())
                .then(data => {
                  if (data.success && data.scene && data.scene.id) {
                    loadScenes(data.scene.id);
                  } else {
                    loadScenes();
                  }
                });
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
            onClick={async () => {
              if (!sceneData) return;
              try {
                // Fetch maps used in the scene
                const maps = [];
                const currentList = getParsedMapList(sceneData.map_list);
                const usedMapIds = [...new Set(currentList.map((m: any) => m.map_id))];
                for (const mapId of usedMapIds) {
                  const res = await fetch(`/api/map?id=${mapId}`);
                  if (res.ok) {
                    const mapData = await res.json();
                    maps.push(mapData);
                  }
                }

                // Note: game_obj_templates can be handled similarly if needed

                const res = await fetch('/api/save_local', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    scene: sceneData,
                    maps: maps,
                    game_obj_templates: []
                  })
                });

                const result = await res.json();
                if (result.success) {
                  alert(`Successfully saved to local assets!\nMaps saved: ${result.data.saved_maps}`);
                } else {
                  alert(`Failed to save: ${result.error}`);
                }
              } catch (e: any) {
                alert(`Error saving to local assets: ${e.message}`);
              }
            }}
            className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors flex items-center justify-center group relative"
            title="Save to Local Asset"
          >
            <HardDrive className="w-5 h-5" />
          </button>

          <button

            onClick={() => setShowTemplateCreator(true)}

            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors flex items-center justify-center group relative"

            title="Create Template via AI"

          >

            <Bot className="w-5 h-5" />

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
            <div
              className="p-4 border-b border-slate-700 font-bold flex items-center gap-2 cursor-pointer hover:bg-slate-700 transition-colors"
              onClick={() => setIsScenesExpanded(!isScenesExpanded)}
            >
              {isScenesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span>Scenes</span>
            </div>
            {isScenesExpanded && (
              <div className="p-2 border-b border-slate-700">
                {scenes.map(s => (
                  <div key={s.id} className="flex gap-1 mb-1">
                    <button
                      className={`flex-1 text-left px-2 py-1 rounded text-sm flex justify-between items-center ${s.id === currentSceneId ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
                      onClick={() => setCurrentSceneId(s.id)}
                    >
                      <span>{s.name}</span>
                      {s.source_type && (
                        <span className="text-[10px] text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded opacity-80">
                          {s.source_type}
                        </span>
                      )}
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
            )}

            <div className="p-4 border-b border-slate-700 font-bold flex justify-between items-center">
              <div
                className="flex items-center gap-2 cursor-pointer hover:text-slate-300 flex-1"
                onClick={() => setIsLayersExpanded(!isLayersExpanded)}
              >
                {isLayersExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span>Layers</span>
              </div>
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
            {isLayersExpanded && (
              <div className="p-2 border-b border-slate-700">
                {(sceneData?.layers || []).map((layer: any, index: number) => (
                  <div
                    key={layer.id}
                    className="mb-2 border border-transparent hover:border-slate-600 rounded bg-slate-800/50 p-1"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('layer_id', layer.id);
                    setDraggedLayerId(layer.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!draggedLayerId || draggedLayerId === layer.id || !sceneData) return;

                    const newLayers = [...sceneData.layers];
                    const draggedIdx = newLayers.findIndex((l: any) => l.id === draggedLayerId);
                    const targetIdx = index;

                    if (draggedIdx !== -1 && targetIdx !== -1) {
                      const [draggedItem] = newLayers.splice(draggedIdx, 1);
                      newLayers.splice(targetIdx, 0, draggedItem);
                      setSceneData({ ...sceneData, layers: newLayers });
                    }
                    setDraggedLayerId(null);
                  }}
                >
                  <div className="flex gap-1 mb-1 items-center">
                    <button
                      className={`flex-1 text-left px-2 py-1 rounded text-sm ${layer.id === activeLayerId ? 'bg-indigo-600' : 'hover:bg-slate-700'} cursor-grab`}
                      onClick={() => setActiveLayerId(layer.id)}
                    >
                      {layer.name}
                    </button>
                    <button
                      className="p-1 text-emerald-400 hover:bg-slate-700 rounded"
                      title="Add Map"
                      onClick={() => setShowAddMapModal(layer.id)}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      className="p-1 text-red-400 hover:bg-slate-700 rounded"
                      title="Delete Layer"
                      onClick={() => {
                        if (confirm('Delete layer and all its maps?')) {
                          console.log(`[RpgSceneEditor] Deleted layer: ${layer.name} (ID: ${layer.id})`);
                          const newLayers = sceneData.layers.filter((l: any) => l.id !== layer.id);
                          const newMapList = getParsedMapList(sceneData.map_list).filter((m: any) => m.layer_id !== layer.id);
                          setSceneData({ ...sceneData, layers: newLayers, map_list: newMapList });
                          if (activeLayerId === layer.id) {
                            setActiveLayerId(newLayers.length > 0 ? newLayers[0].id : null);
                          }
                        } else {
                          console.log(`[RpgSceneEditor] Delete layer cancelled.`);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Render maps in this layer */}
                  <div className="pl-4 space-y-1">
                    {getParsedMapList(sceneData.map_list)
                      .filter((m: any) => m.layer_id === layer.id)
                      .map((m: any, mIdx: number) => (
                        <div key={`${m.map_id}-${mIdx}`} className="flex gap-1 items-center group">
                          <button
                            className="flex-1 text-left px-2 py-1 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-700 truncate"
                            onClick={() => setSelectedItem({ type: 'map', ...m })}
                          >
                            {m.map_id}
                          </button>
                          <button
                            className="p-1 text-red-400/50 hover:text-red-400 hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete Map"
                            onClick={() => {
                              if (confirm(`Remove map ${m.map_id}?`)) {
                                const newMapList = getParsedMapList(sceneData.map_list).filter((item: any) => item !== m);
                                setSceneData({ ...sceneData, map_list: newMapList });
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
                ))}
              </div>
            )}

            <div
              className="p-4 border-b border-slate-700 font-bold flex items-center gap-2 cursor-pointer hover:bg-slate-700 transition-colors"
              onClick={() => setIsPaletteExpanded(!isPaletteExpanded)}
            >
              {isPaletteExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span>Palette</span>
            </div>
            {isPaletteExpanded && (
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
                      <div>{m.name}</div>
                      {m.source_type && (
                        <div className="text-[9px] text-slate-300 bg-slate-800 px-1 rounded mt-1 opacity-80 inline-block">
                          {m.source_type}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                </div>
                <div>
                  <h3 className="text-sm text-slate-400 mb-2 mt-4">Game Objects</h3>
                <div className="grid grid-cols-2 gap-2">
                  {gameObjectTemplates.map(t => (
                    <div
                      key={t.id}
                      className="bg-slate-800 p-2 rounded cursor-grab active:cursor-grabbing text-xs text-center border border-slate-600 hover:border-orange-400 text-orange-200"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ 
                          type: 'game_object', 
                          template_id: t.id, 
                          container_width: t.container_width || 32, 
                          container_height: t.container_height || 32 
                        }));
                      }}
                    >
                      {t.name}
                    </div>
                  ))}
                </div>
                </div>
              </div>
            )}
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
                  instance_id: 'inst-' + Math.random().toString(36).substring(2, 9),
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
              } else if (data.type === 'game_object' && sceneData) {
                const phaserScene = (window as any).__PHASER_SCENE_EDITOR__;
                let worldX = 0, worldY = 0;
                if (phaserScene && phaserScene.cameras && phaserScene.cameras.main) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const worldPoint = phaserScene.cameras.main.getWorldPoint(x, y);
                  worldX = Math.round(worldPoint.x / 32);
                  worldY = Math.round(worldPoint.y / 32);
                }

                if (!activeLayerId) {
                  alert("Please select a layer first!");
                  return;
                }

                const newObjEntry = {
                  id: 'inst-' + Math.random().toString(36).substring(2, 9),
                  template_id: data.template_id,
                  layer_id: activeLayerId,
                  position: { x: worldX, y: worldY },
                  zoom: 1.0,
                  container_override: { width: data.container_width, height: data.container_height },
                  default_state_override: null,
                  properties: {}
                };

                const currentEntities = sceneData.scene_entities || { npcs: [], items: [], events: [], layers: [] };
                const currentObjects = currentEntities.game_objects || [];

                setSceneData({
                  ...sceneData,
                  scene_entities: {
                    ...currentEntities,
                    game_objects: [...currentObjects, newObjEntry]
                  }
                });
              }
            } catch (err) {
              console.error(err);
            }
          }}
        >
          <PhaserGameComponent
            sceneData={sceneData}
            mapsList={mapsList}
            gameObjectTemplates={gameObjectTemplates}
            onSelect={(item) => setSelectedItem(item)}
            onUpdateMapOffset={(instanceId, newX, newY) => {
              if (sceneData) {
                const currentList = getParsedMapList(sceneData.map_list);
                const newMapList = currentList.map((m: any) =>
                  (m.instance_id === instanceId)
                    ? { ...m, offset_position: { x: newX, y: newY } }
                    : m
                );
                setSceneData({ ...sceneData, map_list: newMapList });

                if (selectedItem && selectedItem.instance_id === instanceId) {
                  setSelectedItem({ ...selectedItem, offset_position: { x: newX, y: newY } });
                }
              }
            }}
            onUpdateGameObjectOffset={(instanceId, newX, newY) => {
              if (sceneData && sceneData.scene_entities && sceneData.scene_entities.game_objects) {
                const newObjList = sceneData.scene_entities.game_objects.map((obj: any) =>
                  (obj.id === instanceId)
                    ? { ...obj, position: { x: newX, y: newY } }
                    : obj
                );
                
                setSceneData({
                  ...sceneData,
                  scene_entities: {
                    ...sceneData.scene_entities,
                    game_objects: newObjList
                  }
                });

                if (selectedItem && selectedItem.id === instanceId) {
                  setSelectedItem({ ...selectedItem, position: { x: newX, y: newY } });
                }
              }
            }}
          />
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
                        console.log(`[RpgSceneEditor] Changed map instance ${selectedItem.instance_id} to layer ID: ${newLayerId}`);
                        setSelectedItem({ ...selectedItem, layer_id: newLayerId });
                        if (sceneData) {
                          const currentList = getParsedMapList(sceneData.map_list);
                          const newMapList = currentList.map((m: any) => m.instance_id === selectedItem.instance_id ? { ...m, layer_id: newLayerId } : m);
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
                    <label className="block text-slate-400 text-xs mb-1">Map Size</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-slate-500 text-xs mb-0.5">W</label>
                        <input type="number" readOnly value={mapsList.find(m => m.id === selectedItem.map_id)?.map_data?.width || selectedItem.map_size?.width || 20} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-300" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-slate-500 text-xs mb-0.5">H</label>
                        <input type="number" readOnly value={mapsList.find(m => m.id === selectedItem.map_id)?.map_data?.height || selectedItem.map_size?.height || 20} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-300" />
                      </div>
                    </div>
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
                          const newMapList = currentList.map((m: any) => m.instance_id === selectedItem.instance_id ? { ...m, offset_position: { ...m.offset_position, x: newX } } : m);
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
                          const newMapList = currentList.map((m: any) => m.instance_id === selectedItem.instance_id ? { ...m, offset_position: { ...m.offset_position, y: newY } } : m);
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
                        const newMapList = currentList.filter((m: any) => m.instance_id !== selectedItem.instance_id);
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
              {selectedItem && selectedItem.type === 'game_object' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Layer</label>
                    <select
                      value={selectedItem.layer_id || ''}
                      onChange={(e) => {
                        const newLayerId = e.target.value;
                        setSelectedItem({ ...selectedItem, layer_id: newLayerId });
                        if (sceneData && sceneData.scene_entities && sceneData.scene_entities.game_objects) {
                          const newObjList = sceneData.scene_entities.game_objects.map((obj: any) =>
                            obj.id === selectedItem.id ? { ...obj, layer_id: newLayerId } : obj
                          );
                          setSceneData({ ...sceneData, scene_entities: { ...sceneData.scene_entities, game_objects: newObjList } });
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
                    <label className="block text-slate-400 text-xs mb-1">Template ID</label>
                    <input type="text" readOnly value={selectedItem.template_id} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1" />
                  </div>
                  <div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-slate-500 text-xs mb-0.5">X</label>
                        <input
                          type="number"
                          value={selectedItem.position?.x || 0}
                          onChange={(e) => {
                            const newX = Number(e.target.value);
                            setSelectedItem({ ...selectedItem, position: { ...selectedItem.position, x: newX } });
                            if (sceneData && sceneData.scene_entities?.game_objects) {
                              const newObjList = sceneData.scene_entities.game_objects.map((obj: any) => obj.id === selectedItem.id ? { ...obj, position: { ...obj.position, x: newX } } : obj);
                              setSceneData({ ...sceneData, scene_entities: { ...sceneData.scene_entities, game_objects: newObjList } });
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-slate-500 text-xs mb-0.5">Y</label>
                        <input
                          type="number"
                          value={selectedItem.position?.y || 0}
                          onChange={(e) => {
                            const newY = Number(e.target.value);
                            setSelectedItem({ ...selectedItem, position: { ...selectedItem.position, y: newY } });
                            if (sceneData && sceneData.scene_entities?.game_objects) {
                              const newObjList = sceneData.scene_entities.game_objects.map((obj: any) => obj.id === selectedItem.id ? { ...obj, position: { ...obj.position, y: newY } } : obj);
                              setSceneData({ ...sceneData, scene_entities: { ...sceneData.scene_entities, game_objects: newObjList } });
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-slate-500 text-xs mb-0.5">Override Width</label>
                        <input
                          type="number"
                          placeholder="Default"
                          value={selectedItem.container_override?.width || ''}
                          onChange={(e) => {
                            const newW = e.target.value ? Number(e.target.value) : undefined;
                            const currentOverride = selectedItem.container_override || {};
                            const newOverride = { ...currentOverride, width: newW };
                            if (newW === undefined) delete newOverride.width;
                            setSelectedItem({ ...selectedItem, container_override: Object.keys(newOverride).length > 0 ? newOverride : undefined });
                            if (sceneData && sceneData.scene_entities?.game_objects) {
                              const newObjList = sceneData.scene_entities.game_objects.map((obj: any) => obj.id === selectedItem.id ? { ...obj, container_override: Object.keys(newOverride).length > 0 ? newOverride : undefined } : obj);
                              setSceneData({ ...sceneData, scene_entities: { ...sceneData.scene_entities, game_objects: newObjList } });
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-slate-500 text-xs mb-0.5">Override Height</label>
                        <input
                          type="number"
                          placeholder="Default"
                          value={selectedItem.container_override?.height || ''}
                          onChange={(e) => {
                            const newH = e.target.value ? Number(e.target.value) : undefined;
                            const currentOverride = selectedItem.container_override || {};
                            const newOverride = { ...currentOverride, height: newH };
                            if (newH === undefined) delete newOverride.height;
                            setSelectedItem({ ...selectedItem, container_override: Object.keys(newOverride).length > 0 ? newOverride : undefined });
                            if (sceneData && sceneData.scene_entities?.game_objects) {
                              const newObjList = sceneData.scene_entities.game_objects.map((obj: any) => obj.id === selectedItem.id ? { ...obj, container_override: Object.keys(newOverride).length > 0 ? newOverride : undefined } : obj);
                              setSceneData({ ...sceneData, scene_entities: { ...sceneData.scene_entities, game_objects: newObjList } });
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">State Override</label>
                    <input
                      type="text"
                      placeholder="e.g. battle_idle"
                      value={selectedItem.default_state_override || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedItem({ ...selectedItem, default_state_override: val });
                        if (sceneData && sceneData.scene_entities?.game_objects) {
                          const newObjList = sceneData.scene_entities.game_objects.map((obj: any) => obj.id === selectedItem.id ? { ...obj, default_state_override: val } : obj);
                          setSceneData({ ...sceneData, scene_entities: { ...sceneData.scene_entities, game_objects: newObjList } });
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"
                    />
                  </div>
                  <div className="bg-slate-800 p-2 rounded border border-slate-600">
                    <label className="block text-orange-300 text-xs mb-2 font-bold uppercase">Controller Properties</label>
                    {(() => {
                      const tpl = gameObjectTemplates.find((t: any) => t.id === selectedItem.template_id);
                      const controller = selectedItem.properties?.controller || tpl?.default_controller;

                      const updateProperty = (key: string, val: any) => {
                         const currentProps = selectedItem.properties || {};
                         const newProps = { ...currentProps, [key]: val };
                         setSelectedItem({ ...selectedItem, properties: newProps });
                         if (sceneData && sceneData.scene_entities?.game_objects) {
                           const newObjList = sceneData.scene_entities.game_objects.map((obj: any) => obj.id === selectedItem.id ? { ...obj, properties: newProps } : obj);
                           setSceneData({ ...sceneData, scene_entities: { ...sceneData.scene_entities, game_objects: newObjList } });
                         }
                      };

                      if (controller === 'EncounterMonsterController') {
                         return (
                           <div className="space-y-2">
                             <div>
                                <label className="block text-slate-400 text-xs mb-1">Battle Scene ID</label>
                                <input type="text" value={selectedItem.properties?.battle_scene_id || ''} onChange={(e) => updateProperty('battle_scene_id', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
                             </div>
                             <div>
                                <label className="block text-slate-400 text-xs mb-1">Enemy Formation ID</label>
                                <input type="text" value={selectedItem.properties?.enemy_formation_id || ''} onChange={(e) => updateProperty('enemy_formation_id', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
                             </div>
                           </div>
                         );
                      } else if (controller === 'TeleportController') {
                         return (
                           <div className="space-y-2">
                             <div>
                                <label className="block text-slate-400 text-xs mb-1">Target Scene ID</label>
                                <input type="text" value={selectedItem.properties?.target_scene_id || ''} onChange={(e) => updateProperty('target_scene_id', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
                             </div>
                             <div className="flex gap-2">
                               <div className="flex-1">
                                 <label className="block text-slate-400 text-xs mb-1">Target X</label>
                                 <input type="number" value={selectedItem.properties?.target_x || ''} onChange={(e) => updateProperty('target_x', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
                               </div>
                               <div className="flex-1">
                                 <label className="block text-slate-400 text-xs mb-1">Target Y</label>
                                 <input type="number" value={selectedItem.properties?.target_y || ''} onChange={(e) => updateProperty('target_y', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
                               </div>
                             </div>
                           </div>
                         );
                      } else if (controller === 'StaticNpcController') {
                         return (
                           <div className="space-y-2">
                             <div>
                                <label className="block text-slate-400 text-xs mb-1">Dialog ID</label>
                                <input type="text" value={selectedItem.properties?.dialog_id || ''} onChange={(e) => updateProperty('dialog_id', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
                             </div>
                           </div>
                         );
                      } else if (controller === 'ChestController') {
                         return (
                           <div className="space-y-2">
                             <div>
                                <label className="block text-slate-400 text-xs mb-1">Drop Item ID</label>
                                <input type="text" value={selectedItem.properties?.drop_item || ''} onChange={(e) => updateProperty('drop_item', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
                             </div>
                           </div>
                         );
                      } else {
                         return (
                            <div className="text-xs text-slate-500 mb-2">Unknown or generic controller ({controller || 'None'}). Use raw JSON.</div>
                         );
                      }
                    })()}
                    <div className="mt-4">
                      <label className="block text-slate-400 text-xs mb-1">Raw Properties (JSON)</label>
                      <textarea
                        rows={3}
                        value={JSON.stringify(selectedItem.properties || {}, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setSelectedItem({ ...selectedItem, properties: parsed });
                            if (sceneData && sceneData.scene_entities?.game_objects) {
                              const newObjList = sceneData.scene_entities.game_objects.map((obj: any) => obj.id === selectedItem.id ? { ...obj, properties: parsed } : obj);
                              setSceneData({ ...sceneData, scene_entities: { ...sceneData.scene_entities, game_objects: newObjList } });
                            }
                          } catch (err) {
                            // Allow typing invalid json momentarily
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (sceneData && sceneData.scene_entities?.game_objects) {
                        const newObjList = sceneData.scene_entities.game_objects.filter((obj: any) => obj.id !== selectedItem.id);
                        setSceneData({ ...sceneData, scene_entities: { ...sceneData.scene_entities, game_objects: newObjList } });
                        setSelectedItem(null);
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-500 text-white rounded px-2 py-1 font-bold mt-4"
                  >
                    Remove Object
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showTemplateCreator && (

        <GameObjectTemplateCreator

          onBack={() => setShowTemplateCreator(false)}

          onSave={async (template) => {

            try {

               const res = await fetch("/api/save_local", {

                 method: "POST",

                 headers: { "Content-Type": "application/json" },

                 body: JSON.stringify({

                   scene: null,

                   maps: [],

                   game_obj_templates: [template]

                 })

               });

               const result = await res.json();

               if (result.success) {

                 setGameObjectTemplates([...gameObjectTemplates, template]);

                 setShowTemplateCreator(false);

               } else {

                 alert("Failed to save template: " + result.error);

               }

            } catch (err: any) {

               alert("Error saving template: " + err.message);

            }

          }}

        />

      )}

      {showAddMapModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-xl w-[500px] max-w-[90vw]">
            <h3 className="text-xl font-bold mb-4">Select Map to Add</h3>
            <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto mb-4">
              {mapsList.map(m => (
                <button
                  key={m.id}
                  className="bg-slate-700 hover:bg-indigo-600 p-3 rounded text-left flex flex-col gap-1 transition-colors relative"
                  onClick={() => {
                    if (sceneData) {
                      const newMapEntry = {
                        instance_id: 'inst-' + Math.random().toString(36).substring(2, 9),
                        map_id: m.id,
                        map_size: { width: m.map_data?.width || 20, height: m.map_data?.height || 20 },
                        offset_position: { x: 0, y: 0 },
                        layer_id: showAddMapModal
                      };
                      const currentList = getParsedMapList(sceneData.map_list);
                      setSceneData({
                        ...sceneData,
                        map_list: [...currentList, newMapEntry]
                      });
                    }
                    setShowAddMapModal(null);
                  }}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="font-bold">{m.name}</span>
                    {m.source_type && (
                      <span className="text-[10px] text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded opacity-80">
                        {m.source_type}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{m.id}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded font-bold"
                onClick={() => setShowAddMapModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
