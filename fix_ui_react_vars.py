import re

with open("src/components/RpgMode.tsx", "r") as f:
    content = f.read()

# I see what happened. The variables (mapsList, currentMapId, currentMapName) and handlers were added
# but then removed or lost in my later sed operations when I fixed the `</div>`!
# Let's add them back to the RpgMode function body securely.

target = """  const [isFullscreenSupported, setIsFullscreenSupported] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);"""

replacement = """  const [isFullscreenSupported, setIsFullscreenSupported] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [mapsList, setMapsList] = useState<{id: string, name: string}[]>([]);
  const [currentMapId, setCurrentMapId] = useState<string>('main_200');
  const [currentMapName, setCurrentMapName] = useState<string>('World Map');

  useEffect(() => {
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
  }, [mode]);

  const handleMapChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setCurrentMapId(newId);
    const mapObj = mapsList.find(m => m.id === newId);
    if (mapObj) setCurrentMapName(mapObj.name);
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (scene && scene.loadNewMap) {
      scene.loadNewMap(newId);
    }
  };

  const handleMapRename = async () => {
    const newName = prompt('Enter new map name:', currentMapName);
    if (!newName || newName.trim() === '') return;

    try {
      const scene = (window as any).__PHASER_MAIN_SCENE__;
      const mapData = scene?.mapData;
      if (!mapData) return;

      const res = await fetch('/api/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentMapId, name: newName, map_data: mapData })
      });
      if (res.ok) {
        setCurrentMapName(newName);
        setMapsList(prev => prev.map(m => m.id === currentMapId ? { ...m, name: newName } : m));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateMap = async () => {
    try {
      const res = await fetch('/api/map/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Generated Map', width: 200, height: 200 })
      });
      if (res.ok) {
        const data = await res.json();
        setMapsList(prev => [...prev, { id: data.id, name: data.name }]);
        setCurrentMapId(data.id);
        setCurrentMapName(data.name);
        const scene = (window as any).__PHASER_MAIN_SCENE__;
        if (scene && scene.loadNewMap) {
          scene.loadNewMap(data.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };
"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/RpgMode.tsx", "w") as f:
        f.write(content)
else:
    print("Target not found. Let's try searching for chatEndRef.")
