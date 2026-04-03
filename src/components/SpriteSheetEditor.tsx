import React, { useState, useRef, useEffect } from 'react';

interface SpriteSheetEditorProps {
  onBack: () => void;
}

export default function SpriteSheetEditor({ onBack }: SpriteSheetEditorProps) {
  const [activeTab, setActiveTab] = useState<'RAW' | 'WORKING' | 'OUTPUT' | 'JSON'>('RAW');
  const [tileSize, setTileSize] = useState('32x32');
  const [outputName, setOutputName] = useState('new_tileset');
  const [rawImages, setRawImages] = useState<{ name: string, dataUrl: string }[]>([]);
  const [selectedRawImageIndex, setSelectedRawImageIndex] = useState<number>(-1);
  const [workingQueue, setWorkingQueue] = useState<{ id: string, dataUrl: string }[]>([]);
  const [outputQueue, setOutputQueue] = useState<{ id: string, dataUrl: string }[]>([]);
  const [availableTilesets, setAvailableTilesets] = useState<any[]>([]);

  // Cropping logic
  const imgRef = useRef<HTMLImageElement>(null);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const tileW = parseInt(tileSize.split('x')[0]);
  const tileH = parseInt(tileSize.split('x')[1]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Snap to tile grid for initial click
    const snappedX = Math.floor(x / tileW) * tileW;
    const snappedY = Math.floor(y / tileH) * tileH;

    setCropPos({ x: snappedX, y: snappedY });
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    // Optional: snap during drag
    x = Math.floor(x / tileW) * tileW;
    y = Math.floor(y / tileH) * tileH;

    // Bounds check
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x + tileW > imgRef.current.naturalWidth) x = imgRef.current.naturalWidth - tileW;
    if (y + tileH > imgRef.current.naturalHeight) y = imgRef.current.naturalHeight - tileH;

    setCropPos({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const generateSpriteSheet = async () => {
    if (outputQueue.length === 0) return null;

    // Calculate sprite sheet dimensions (let's do a max of 10 columns)
    const cols = Math.min(outputQueue.length, 10);
    const rows = Math.ceil(outputQueue.length / cols);
    const canvasWidth = cols * tileW;
    const canvasHeight = rows * tileH;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const loadImage = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = url;
      });
    };

    const metadataTiles: any[] = [];

    for (let i = 0; i < outputQueue.length; i++) {
      const tile = outputQueue[i];
      const img = await loadImage(tile.dataUrl);

      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * tileW;
      const y = row * tileH;

      ctx.drawImage(img, x, y, tileW, tileH);

      // Tile IDs usually start at 1
      metadataTiles.push({
        id: i + 1,
        properties: []
      });
    }

    const metadata = {
      columns: cols,
      image_source: `${outputName}.png`,
      name: outputName,
      tileheight: tileH,
      tiles: metadataTiles,
      tilewidth: tileW,
      total_tiles: outputQueue.length
    };

    return {
      dataUrl: canvas.toDataURL('image/png'),
      metadata
    };
  };

  const handleSave = async () => {
    if (outputQueue.length === 0) {
      alert("Output queue is empty!");
      return;
    }
    if (!outputName) {
      alert("Please provide an output name!");
      return;
    }

    const result = await generateSpriteSheet();
    if (!result) return;

    try {
      const res = await fetch('/api/map/tileset/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: outputName,
          metadata: result.metadata,
          image_base64: result.dataUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Tileset saved successfully!");
      } else {
        alert("Failed to save tileset: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving tileset");
    }
  };

  const handleLoadTilesetsList = async () => {
    try {
      const res = await fetch('/api/map/tilesets');
      const data = await res.json();
      setAvailableTilesets(data);
    } catch (err) {
      console.error("Failed to load tilesets", err);
    }
  };

  const loadExistingTileset = async (tilesetMeta: any) => {
    // We need to load the image and split it back into the output queue
    const imgUrl = `/assets/map_tileset/${tilesetMeta.image_source}`;

    setTileSize(`${tilesetMeta.tilewidth}x${tilesetMeta.tileheight}`);
    setOutputName(tilesetMeta.name);
    setOutputQueue([]);

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const tw = tilesetMeta.tilewidth;
      const th = tilesetMeta.tileheight;
      const cols = tilesetMeta.columns;
      const newQueue = [];

      for (let i = 0; i < tilesetMeta.total_tiles; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);

        const canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        ctx.drawImage(
          img,
          col * tw, row * th, tw, th,
          0, 0, tw, th
        );

        newQueue.push({
          id: `loaded_${Date.now()}_${i}`,
          dataUrl: canvas.toDataURL('image/png')
        });
      }

      setOutputQueue(newQueue);
      setActiveTab('OUTPUT');
    };
    img.src = imgUrl;
  };

  useEffect(() => {
    handleLoadTilesetsList();
  }, []);

  const cropTile = () => {
    if (!imgRef.current || selectedRawImageIndex < 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = tileW;
    canvas.height = tileH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      imgRef.current,
      cropPos.x, cropPos.y, tileW, tileH,
      0, 0, tileW, tileH
    );

    const dataUrl = canvas.toDataURL('image/png');
    const newId = `tile_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    setWorkingQueue(prev => [...prev, { id: newId, dataUrl }]);
    setActiveTab('WORKING'); // Auto switch to working tab
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200">
      {/* Toolbar */}
      <div className="h-14 border-b border-slate-700 bg-slate-800 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition-colors"
          >
            返回
          </button>
          <h2 className="text-lg font-bold text-white">Sprite Sheet Editor</h2>

          <div className="h-6 w-px bg-slate-600 mx-2"></div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Tile Size:</span>
            <select
              value={tileSize}
              onChange={(e) => setTileSize(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="32x32">32x32</option>
              <option value="64x64">64x64</option>
              <option value="32x64">32x64</option>
              <option value="64x32">64x32</option>
            </select>
          </div>

          <div className="h-6 w-px bg-slate-600 mx-2"></div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Output Name:</span>
            <input
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm w-40 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <button
              className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors"
              title="Load existing tileset"
              onClick={handleLoadTilesetsList}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Load
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-600 rounded shadow-xl hidden group-hover:block z-50 overflow-hidden">
              {availableTilesets.length === 0 ? (
                <div className="p-2 text-sm text-slate-400">No tilesets found</div>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  {availableTilesets.map((ts: any) => (
                    <div
                      key={ts.name}
                      className="px-3 py-2 text-sm text-slate-200 hover:bg-blue-600 cursor-pointer"
                      onClick={() => loadExistingTileset(ts)}
                    >
                      {ts.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors"
            title="Save output to public/assets/map_tileset"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            Save
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Sidebar */}
        <div className="w-80 border-r border-slate-700 bg-slate-800 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            {['RAW', 'WORKING', 'OUTPUT', 'JSON'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-2 text-xs font-semibold tracking-wider ${activeTab === tab ? 'bg-slate-700 text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'RAW' && (
              <div className="space-y-4">
                <div className="border border-dashed border-slate-600 rounded p-4 text-center hover:bg-slate-700/50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []) as File[];
                      files.forEach(file => {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setRawImages(prev => [...prev, { name: file.name, dataUrl: event.target!.result as string }]);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                    }}
                  />
                  <span className="text-sm text-slate-400">Click or Drag to Upload Images</span>
                </div>

                <div className="space-y-2">
                  {rawImages.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedRawImageIndex(idx)}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer ${selectedRawImageIndex === idx ? 'bg-blue-600/30 border border-blue-500' : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'}`}
                    >
                      <img src={img.dataUrl} alt={img.name} className="w-10 h-10 object-contain bg-slate-800 rounded" />
                      <span className="text-sm truncate text-slate-300">{img.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'WORKING' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-300">Working Queue ({workingQueue.length})</span>
                  <button
                    onClick={() => {
                      setOutputQueue(prev => [...prev, ...workingQueue]);
                      setWorkingQueue([]);
                      setActiveTab('OUTPUT');
                    }}
                    disabled={workingQueue.length === 0}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-xs rounded transition-colors"
                  >
                    Move All to Output
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {workingQueue.map((tile) => (
                    <div key={tile.id} className="relative group border border-slate-700 bg-slate-800 rounded p-1 flex items-center justify-center">
                      <img src={tile.dataUrl} alt="tile" className="max-w-full max-h-full" style={{ imageRendering: 'pixelated' }} />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                        <button
                          onClick={() => {
                            setOutputQueue(prev => [...prev, tile]);
                            setWorkingQueue(prev => prev.filter(t => t.id !== tile.id));
                          }}
                          className="p-1 bg-blue-500 hover:bg-blue-400 rounded text-white"
                          title="Move to Output"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </button>
                        <button
                          onClick={() => setWorkingQueue(prev => prev.filter(t => t.id !== tile.id))}
                          className="p-1 bg-red-500 hover:bg-red-400 rounded text-white"
                          title="Delete"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {workingQueue.length === 0 && (
                    <div className="col-span-4 text-center text-xs text-slate-500 py-4">No tiles in working queue</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'OUTPUT' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-300">Output Queue ({outputQueue.length})</span>
                  <button
                    onClick={() => {
                      setOutputQueue([]);
                    }}
                    disabled={outputQueue.length === 0}
                    className="px-2 py-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-xs rounded transition-colors"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {outputQueue.map((tile, idx) => (
                    <div key={tile.id} className="relative group border border-slate-700 bg-slate-800 rounded p-1 flex flex-col items-center justify-center">
                      <span className="absolute top-0 left-1 text-[10px] text-slate-500">{idx + 1}</span>
                      <img src={tile.dataUrl} alt="tile" className="max-w-full max-h-full mt-2" style={{ imageRendering: 'pixelated' }} />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                        <button
                          onClick={() => setOutputQueue(prev => prev.filter(t => t.id !== tile.id))}
                          className="p-1 bg-red-500 hover:bg-red-400 rounded text-white"
                          title="Remove"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {outputQueue.length === 0 && (
                    <div className="col-span-4 text-center text-xs text-slate-500 py-4">No tiles in output queue</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'JSON' && (
              <div className="space-y-4">
                <span className="text-sm font-medium text-slate-300">JSON Metadata Preview</span>
                <pre className="text-xs text-emerald-400 bg-slate-950 p-4 rounded overflow-auto border border-slate-700">
                  {JSON.stringify({
                    columns: Math.min(outputQueue.length, 10),
                    image_source: `${outputName}.png`,
                    name: outputName,
                    tileheight: tileH,
                    tiles: Array.from({ length: outputQueue.length }).map((_, i) => ({ id: i + 1, properties: [] })),
                    tilewidth: tileW,
                    total_tiles: outputQueue.length
                  }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right Main Area (Cropping/Preview) */}
        <div
          className="flex-1 bg-slate-900 relative overflow-auto p-8 flex flex-col items-center justify-center select-none"
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          {selectedRawImageIndex >= 0 && rawImages[selectedRawImageIndex] ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-2">
                <button
                  onClick={cropTile}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-bold shadow transition-colors"
                >
                  Crop Selection & Add to Queue
                </button>
              </div>
              <div className="relative inline-block border border-slate-700 shadow-2xl bg-black">
                 <img
                   ref={imgRef}
                   src={rawImages[selectedRawImageIndex].dataUrl}
                   alt="Selected Raw"
                   draggable={false}
                   onMouseDown={handleMouseDown}
                   style={{ imageRendering: 'pixelated', cursor: 'crosshair', display: 'block' }}
                 />

                 {/* Cropping Rectangle Overlay */}
                 <div
                   className="absolute border-2 border-red-500 pointer-events-none bg-red-500/20"
                   style={{
                     left: `${cropPos.x}px`,
                     top: `${cropPos.y}px`,
                     width: `${tileW}px`,
                     height: `${tileH}px`,
                     boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                   }}
                 />
              </div>
            </div>
          ) : (
            <div className="text-slate-500 border-2 border-dashed border-slate-700 rounded-xl p-12 text-center">
              <p className="mb-2">Select a Raw Image from the left sidebar to start cropping.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
