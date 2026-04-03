import React, { useState, useRef, useEffect } from 'react';

interface SpriteSheetEditorProps {
  onBack: () => void;
}

export default function SpriteSheetEditor({ onBack }: SpriteSheetEditorProps) {
  const [activeTab, setActiveTab] = useState<'RAW' | 'WORKING' | 'OUTPUT' | 'JSON'>('RAW');
  const [tileSize, setTileSize] = useState('32x32');
  const [customTileW, setCustomTileW] = useState(32);
  const [customTileH, setCustomTileH] = useState(32);
  const [outputName, setOutputName] = useState('new_tileset');
  const [rawImages, setRawImages] = useState<{ name: string, history: string[], currentIndex: number }[]>([]);
  const [selectedRawImageIndex, setSelectedRawImageIndex] = useState<number>(-1);
  const [scaleInputW, setScaleInputW] = useState<number>(0);
  const [scaleInputH, setScaleInputH] = useState<number>(0);
  const [workingQueue, setWorkingQueue] = useState<{ id: string, dataUrl: string }[]>([]);
  const [outputQueue, setOutputQueue] = useState<{ id: string, dataUrl: string }[]>([]);
  const [availableTilesets, setAvailableTilesets] = useState<any[]>([]);

  // Advanced feature states
  const [manualCrop, setManualCrop] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [gapX, setGapX] = useState(0);
  const [gapY, setGapY] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [transparentColor, setTransparentColor] = useState('#ff00ff');
  const [isColorPicking, setIsColorPicking] = useState(false);

  // Cropping logic
  const imgRef = useRef<HTMLImageElement>(null);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Panning logic
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const tileW = tileSize === 'customized' ? customTileW : parseInt(tileSize.split('x')[0]);
  const tileH = tileSize === 'customized' ? customTileH : parseInt(tileSize.split('x')[1]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Color picking logic
    if (isColorPicking && e.button === 0) {
      const canvas = document.createElement('canvas');
      canvas.width = imgRef.current.naturalWidth;
      canvas.height = imgRef.current.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imgRef.current, 0, 0);
        const pixelData = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
        const hex = "#" + ("000000" + ((pixelData[0] << 16) | (pixelData[1] << 8) | pixelData[2]).toString(16)).slice(-6);
        setTransparentColor(hex);
      }
      setIsColorPicking(false);
      return;
    }

    // Right click for panning
    if (e.button === 2) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Left click for cropping
    if (e.button !== 0) return;

    if (manualCrop) {
      setCropPos({ x, y });
    } else {
      // Snap to tile grid considering offset and gap
      const stepX = tileW + gapX;
      const stepY = tileH + gapY;

      let col = Math.floor((x - offsetX) / stepX);
      let row = Math.floor((y - offsetY) / stepY);

      if (col < 0) col = 0;
      if (row < 0) row = 0;

      const snappedX = offsetX + col * stepX;
      const snappedY = offsetY + row * stepY;

      setCropPos({ x: snappedX, y: snappedY });
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (!isDragging || !imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    let x = (e.clientX - rect.left) / zoom;
    let y = (e.clientY - rect.top) / zoom;

    if (!manualCrop) {
      const stepX = tileW + gapX;
      const stepY = tileH + gapY;

      let col = Math.floor((x - offsetX) / stepX);
      let row = Math.floor((y - offsetY) / stepY);

      if (col < 0) col = 0;
      if (row < 0) row = 0;

      x = offsetX + col * stepX;
      y = offsetY + row * stepY;
    }

    // Bounds check
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x + tileW > imgRef.current.naturalWidth) x = imgRef.current.naturalWidth - tileW;
    if (y + tileH > imgRef.current.naturalHeight) y = imgRef.current.naturalHeight - tileH;

    setCropPos({ x, y });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 2) setIsPanning(false);
    if (e.button === 0) setIsDragging(false);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    setIsDragging(false);
    setIsPanning(false);
  };

  const handleScaleRawImage = React.useCallback(() => {
    if (selectedRawImageIndex < 0 || scaleInputW <= 0 || scaleInputH <= 0 || !imgRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = scaleInputW;
    canvas.height = scaleInputH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false; // keep it pixelated
    ctx.drawImage(imgRef.current, 0, 0, imgRef.current.naturalWidth, imgRef.current.naturalHeight, 0, 0, scaleInputW, scaleInputH);

    const newUrl = canvas.toDataURL('image/png');

    setRawImages(prev => {
      const newImages = [...prev];
      const img = newImages[selectedRawImageIndex];
      // discard future history if we are not at the end
      const newHistory = img.history.slice(0, img.currentIndex + 1);
      newHistory.push(newUrl);
      newImages[selectedRawImageIndex] = { ...img, history: newHistory, currentIndex: newHistory.length - 1 };
      return newImages;
    });

    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [selectedRawImageIndex, scaleInputW, scaleInputH]);

  // Hex to RGB helper
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const handleMakeTransparent = React.useCallback(() => {
    if (selectedRawImageIndex < 0 || !imgRef.current) return;

    const rgb = hexToRgb(transparentColor);
    if (!rgb) return;

    const canvas = document.createElement('canvas');
    canvas.width = imgRef.current.naturalWidth;
    canvas.height = imgRef.current.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(imgRef.current, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Tolerance for color matching
    const tolerance = 5;

    for (let i = 0; i < data.length; i += 4) {
      if (
        Math.abs(data[i] - rgb.r) <= tolerance &&
        Math.abs(data[i + 1] - rgb.g) <= tolerance &&
        Math.abs(data[i + 2] - rgb.b) <= tolerance
      ) {
        // Set alpha to 0
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    const newUrl = canvas.toDataURL('image/png');

    setRawImages(prev => {
      const newImages = [...prev];
      const img = newImages[selectedRawImageIndex];
      const newHistory = img.history.slice(0, img.currentIndex + 1);
      newHistory.push(newUrl);
      newImages[selectedRawImageIndex] = { ...img, history: newHistory, currentIndex: newHistory.length - 1 };
      return newImages;
    });
  }, [selectedRawImageIndex, transparentColor]);

  const cropTileCallback = React.useCallback(() => {
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
    setActiveTab('WORKING');
  }, [cropPos.x, cropPos.y, tileW, tileH, selectedRawImageIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (e.key === 'd') {
        setIsColorPicking(prev => !prev);
        return;
      }

      if (e.key === 't') {
        handleMakeTransparent();
        return;
      }

      if (e.key === 'c') {
        cropTileCallback();
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();

        const stepX = manualCrop ? 1 : tileW + gapX;
        const stepY = manualCrop ? 1 : tileH + gapY;

        setCropPos(prev => {
          let newX = prev.x;
          let newY = prev.y;

          if (e.key === 'ArrowUp') newY -= stepY;
          if (e.key === 'ArrowDown') newY += stepY;
          if (e.key === 'ArrowLeft') newX -= stepX;
          if (e.key === 'ArrowRight') newX += stepX;

          if (imgRef.current) {
            if (newX < 0) newX = 0;
            if (newY < 0) newY = 0;
            if (newX + tileW > imgRef.current.naturalWidth) newX = imgRef.current.naturalWidth - tileW;
            if (newY + tileH > imgRef.current.naturalHeight) newY = imgRef.current.naturalHeight - tileH;
          }
          return { x: newX, y: newY };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manualCrop, gapX, gapY, tileW, tileH, cropPos, isColorPicking, handleMakeTransparent, cropTileCallback]);

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

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200">
      {/* Toolbar - Two Rows */}
      <div className="border-b border-slate-700 bg-slate-800 flex flex-col shrink-0">

        {/* Top Row */}
        <div className="flex items-center px-4 h-14 justify-between border-b border-slate-700/50">
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
                <option value="customized">customized</option>
              </select>
              {tileSize === 'customized' && (
                <div className="flex items-center gap-1">
                  <input type="number" value={customTileW} onChange={e => setCustomTileW(parseInt(e.target.value) || 1)} className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-sm" title="Custom Width" />
                  <span className="text-slate-500">x</span>
                  <input type="number" value={customTileH} onChange={e => setCustomTileH(parseInt(e.target.value) || 1)} className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-sm" title="Custom Height" />
                </div>
              )}
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

            <div className="h-6 w-px bg-slate-600 mx-2"></div>

            {/* Advanced Toolbar Controls (Top Row part) */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualCrop}
                  onChange={(e) => setManualCrop(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900"
                />
                Manual Crop
              </label>

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1 rounded ${showGrid ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'}`}
                title="Toggle Grid Overlay"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </button>

              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>Offset:</span>
                <input type="number" value={offsetX} onChange={e => setOffsetX(parseInt(e.target.value) || 0)} className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-1" title="Offset X" />
                <input type="number" value={offsetY} onChange={e => setOffsetY(parseInt(e.target.value) || 0)} className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-1" title="Offset Y" />
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>Gap:</span>
                <input type="number" value={gapX} onChange={e => setGapX(parseInt(e.target.value) || 0)} className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-1" title="Gap X" />
                <input type="number" value={gapY} onChange={e => setGapY(parseInt(e.target.value) || 0)} className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-1" title="Gap Y" />
              </div>
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

        {/* Bottom Row */}
        <div className="flex items-center px-4 h-12 bg-slate-800 gap-4">
          <button
            onClick={cropTileCallback}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-bold shadow transition-colors"
            title="Hotkey: C"
          >
            Crop Selection & Add to Queue
          </button>

          <div className="h-6 w-px bg-slate-600"></div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Scale Raw:</span>
            <input type="number" value={scaleInputW} onChange={e => setScaleInputW(parseInt(e.target.value) || 0)} className="w-16 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-sm" />
            <span className="text-xs text-slate-400">x</span>
            <input type="number" value={scaleInputH} onChange={e => setScaleInputH(parseInt(e.target.value) || 0)} className="w-16 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-sm" />
            <button onClick={handleScaleRawImage} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-xs rounded transition-colors border border-slate-600">Apply</button>
            <button
              onClick={() => {
                setRawImages(prev => {
                  const newImages = [...prev];
                  const img = newImages[selectedRawImageIndex];
                  if (img.currentIndex > 0) {
                    newImages[selectedRawImageIndex] = { ...img, currentIndex: img.currentIndex - 1 };
                    // update inputs
                    const tempImg = new Image();
                    tempImg.onload = () => { setScaleInputW(tempImg.naturalWidth); setScaleInputH(tempImg.naturalHeight); };
                    tempImg.src = img.history[img.currentIndex - 1];
                  }
                  return newImages;
                });
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              disabled={selectedRawImageIndex < 0 || rawImages[selectedRawImageIndex]?.currentIndex <= 0}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-xs rounded transition-colors"
              title="Undo Scale"
            >
              Undo
            </button>
            <button
              onClick={() => {
                setRawImages(prev => {
                  const newImages = [...prev];
                  const img = newImages[selectedRawImageIndex];
                  if (img.currentIndex < img.history.length - 1) {
                    newImages[selectedRawImageIndex] = { ...img, currentIndex: img.currentIndex + 1 };
                    // update inputs
                    const tempImg = new Image();
                    tempImg.onload = () => { setScaleInputW(tempImg.naturalWidth); setScaleInputH(tempImg.naturalHeight); };
                    tempImg.src = img.history[img.currentIndex + 1];
                  }
                  return newImages;
                });
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              disabled={selectedRawImageIndex < 0 || rawImages[selectedRawImageIndex]?.currentIndex >= (rawImages[selectedRawImageIndex]?.history.length || 0) - 1}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-xs rounded transition-colors"
              title="Redo Scale"
            >
              Redo
            </button>
          </div>

          <div className="h-6 w-px bg-slate-600"></div>

          <div className="h-6 w-px bg-slate-600"></div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsColorPicking(!isColorPicking)}
              className={`p-1.5 rounded transition-colors ${isColorPicking ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-600'}`}
              title="Pick Transparent Color (Hotkey: d)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <input
              type="color"
              value={transparentColor}
              onChange={(e) => setTransparentColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 p-0"
              title="Transparent Color"
            />
            <button
              onClick={handleMakeTransparent}
              className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded transition-colors"
              title="Apply Transparency (Hotkey: t)"
            >
              Set Transparent
            </button>
          </div>

          <div className="h-6 w-px bg-slate-600"></div>

          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>Zoom: {Math.round(zoom * 100)}%</span>
          </div>
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
                            setRawImages(prev => [...prev, {
                              name: file.name,
                              history: [event.target!.result as string],
                              currentIndex: 0
                            }]);
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
                      onClick={() => {
                         setSelectedRawImageIndex(idx);
                         const imgEl = new Image();
                         imgEl.onload = () => {
                           setScaleInputW(imgEl.naturalWidth);
                           setScaleInputH(imgEl.naturalHeight);
                         };
                         imgEl.src = img.history[img.currentIndex];
                         setZoom(1);
                         setPan({ x: 0, y: 0 });
                      }}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer ${selectedRawImageIndex === idx ? 'bg-blue-600/30 border border-blue-500' : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'}`}
                    >
                      <img src={img.history[img.currentIndex]} alt={img.name} className="w-10 h-10 object-contain bg-slate-800 rounded" />
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
                    <div
                      key={tile.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', idx.toString());
                        e.currentTarget.style.opacity = '0.5';
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                        if (isNaN(fromIdx) || fromIdx === idx) return;

                        setOutputQueue(prev => {
                          const newQueue = [...prev];
                          const [movedItem] = newQueue.splice(fromIdx, 1);
                          newQueue.splice(idx, 0, movedItem);
                          return newQueue;
                        });
                      }}
                      className="relative group border border-slate-700 bg-slate-800 rounded p-1 flex flex-col items-center justify-center cursor-move"
                    >
                      <span className="absolute top-0 left-1 text-[10px] text-slate-500">{idx + 1}</span>
                      <img src={tile.dataUrl} alt="tile" className="max-w-full max-h-full mt-2 pointer-events-none" style={{ imageRendering: 'pixelated' }} />
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
          className="flex-1 bg-slate-900 relative overflow-hidden p-8 flex flex-col items-center justify-center select-none"
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
          onContextMenu={(e) => e.preventDefault()}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey || !manualCrop) {
              e.preventDefault();
              setZoom(prev => {
                const newZoom = prev - e.deltaY * 0.001;
                return Math.max(0.1, Math.min(newZoom, 5));
              });
            }
          }}
        >
          {selectedRawImageIndex >= 0 && rawImages[selectedRawImageIndex] ? (
            <div className="flex flex-col items-center gap-4 absolute"
                 style={{
                   transform: `translate(${pan.x}px, ${pan.y}px)`,
                   transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                 }}
            >
              <div
                className="relative inline-block border border-slate-700 shadow-2xl bg-black transform-origin-top-left"
                style={{ transform: `scale(${zoom})` }}
              >
                 <img
                   ref={imgRef}
                   src={rawImages[selectedRawImageIndex].history[rawImages[selectedRawImageIndex].currentIndex]}
                   alt="Selected Raw"
                   draggable={false}
                   onMouseDown={handleMouseDown}
                   onLoad={(e) => {
                     // Initial set of scale inputs if they are 0
                     if (scaleInputW === 0 && scaleInputH === 0) {
                       setScaleInputW((e.target as HTMLImageElement).naturalWidth);
                       setScaleInputH((e.target as HTMLImageElement).naturalHeight);
                     }
                   }}
                   style={{ imageRendering: 'pixelated', cursor: isColorPicking ? 'crosshair' : 'crosshair', display: 'block' }}
                 />

                 {/* Optional Grid Overlay */}
                 {showGrid && imgRef.current && (
                   <div
                     className="absolute inset-0 pointer-events-none"
                     style={{
                       backgroundSize: `${tileW + gapX}px ${tileH + gapY}px`,
                       backgroundImage: `
                         linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px),
                         linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)
                       `,
                       backgroundPosition: `${offsetX}px ${offsetY}px`,
                       width: imgRef.current.naturalWidth,
                       height: imgRef.current.naturalHeight
                     }}
                   />
                 )}

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
