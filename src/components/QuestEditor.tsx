import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Settings, HardDrive, Download, Wand2 } from 'lucide-react';

interface QuestEditorProps {
  onBack: () => void;
}

export default function QuestEditor({ onBack }: QuestEditorProps) {
  const [quests, setQuests] = useState<any[]>([]);
  const [scenes, setScenes] = useState<any[]>([]);
  const [currentQuestId, setCurrentQuestId] = useState<string | null>(null);
  const [questData, setQuestData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [isSavingLocal, setIsSavingLocal] = useState(false);

  useEffect(() => {
    fetchQuests();
    fetchScenes();
  }, []);

  useEffect(() => {
    if (currentQuestId) {
      loadQuest(currentQuestId);
    } else {
      setQuestData(null);
    }
  }, [currentQuestId]);

  const fetchQuests = async () => {
    try {
      const res = await fetch('/api/quests');
      if (res.ok) {
        const data = await res.json();
        setQuests(data);
      }
    } catch (err) {
      console.error('Error fetching quests:', err);
    }
  };

  const fetchScenes = async () => {
    try {
      const res = await fetch('/api/scenes');
      if (res.ok) {
        const data = await res.json();
        setScenes(data);
      }
    } catch (err) {
      console.error('Error fetching scenes:', err);
    }
  };

  const loadQuest = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/quest/${id}`);
      if (res.ok) {
        const data = await res.json();
        setQuestData(data);
      } else {
        alert('Failed to load quest');
        setCurrentQuestId(null);
      }
    } catch (err) {
      console.error('Error loading quest:', err);
      alert('Error loading quest');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateQuest = async () => {
    const newQuest = {
      name: `New Quest ${quests.length + 1}`,
      scene_list: [],
      quest_entities: { default_scene_id: null }
    };

    setSavingStatus('Creating...');
    try {
      const res = await fetch('/api/quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuest)
      });
      if (res.ok) {
        const data = await res.json();
        await fetchQuests();
        setCurrentQuestId(data.quest.id.toString());
      } else {
        alert('Failed to create quest');
      }
    } catch (err) {
      console.error('Error creating quest:', err);
      alert('Error creating quest');
    } finally {
      setSavingStatus(null);
    }
  };

  const handleDeleteQuest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quest?')) return;
    try {
      const res = await fetch(`/api/quest/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (currentQuestId === id) setCurrentQuestId(null);
        await fetchQuests();
      } else {
        alert('Failed to delete quest');
      }
    } catch (err) {
      console.error('Error deleting quest:', err);
      alert('Error deleting quest');
    }
  };

  const handleSaveToDB = async () => {
    if (!questData) return;
    setSavingStatus('Saving to DB...');
    try {
      const res = await fetch(`/api/quest/${questData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questData)
      });
      if (res.ok) {
        await fetchQuests();
        setSavingStatus('Saved to DB');
        setTimeout(() => setSavingStatus(null), 2000);
      } else {
        alert('Failed to save to DB');
        setSavingStatus(null);
      }
    } catch (err) {
      console.error('Error saving to DB:', err);
      alert('Error saving to DB');
      setSavingStatus(null);
    }
  };

  const handleSaveLocal = async () => {
    if (!questData) return;
    setIsSavingLocal(true);
    try {
      const res = await fetch('/api/save_local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quest: questData })
      });
      if (res.ok) {
        alert('Quest saved to local assets successfully!');
      } else {
        alert('Failed to save quest to local assets.');
      }
    } catch (err) {
      console.error('Error saving to local assets:', err);
      alert('Error saving quest locally.');
    } finally {
      setIsSavingLocal(false);
    }
  };

  const addScene = () => {
    if (!questData) return;
    const newSceneId = scenes.length > 0 ? scenes[0].id.toString() : '';
    const newSceneList = [...(questData.scene_list || []), newSceneId];
    let newEntities = { ...questData.quest_entities };
    if (!newEntities.default_scene_id && newSceneId) {
      newEntities.default_scene_id = newSceneId;
    }
    setQuestData({ ...questData, scene_list: newSceneList, quest_entities: newEntities });
  };

  const updateSceneId = (index: number, val: string) => {
    if (!questData) return;
    const newList = [...questData.scene_list];
    newList[index] = val;
    setQuestData({ ...questData, scene_list: newList });
  };

  const removeScene = (index: number) => {
    if (!questData) return;
    const newList = [...questData.scene_list];
    const removedSceneId = newList[index];
    newList.splice(index, 1);

    let newEntities = { ...questData.quest_entities };
    if (newEntities.default_scene_id === removedSceneId) {
      newEntities.default_scene_id = newList.length > 0 ? newList[0] : null;
    }
    setQuestData({ ...questData, scene_list: newList, quest_entities: newEntities });
  };

  const updateDefaultScene = (val: string) => {
    if (!questData) return;
    const newEntities = { ...questData.quest_entities, default_scene_id: val };
    setQuestData({ ...questData, quest_entities: newEntities });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white font-sans overflow-hidden">
      {/* Top Header */}
      <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-lg transition-colors group">
            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white" />
          </button>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h1 className="font-bold text-lg">Quest Editor</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {questData && (
            <>
              <button
                onClick={handleSaveToDB}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                {savingStatus || 'Save to DB'}
              </button>
              <button
                onClick={handleSaveLocal}
                disabled={isSavingLocal}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                <HardDrive className="w-4 h-4" />
                {isSavingLocal ? 'Saving...' : 'Save Local'}
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Quest List */}
        <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
            <h2 className="font-semibold text-slate-200">Quests</h2>
            <button
              onClick={handleCreateQuest}
              className="p-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded transition-colors"
              title="Create New Quest"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {quests.map(q => (
              <div
                key={q.id}
                className={`flex items-center justify-between p-2 rounded cursor-pointer group transition-colors ${
                  currentQuestId === q.id.toString() ? 'bg-indigo-600/30 border border-indigo-500/50' : 'hover:bg-slate-700 border border-transparent'
                }`}
                onClick={() => setCurrentQuestId(q.id.toString())}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-slate-200 truncate">{q.name}</span>
                  <span className="text-xs text-slate-500">ID: {q.id} {q.source_type === 'local-asset' && '(Local)'}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteQuest(q.id.toString()); }}
                  className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete Quest"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {quests.length === 0 && (
              <div className="text-sm text-slate-500 text-center mt-4">No quests found.</div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900">
          {!currentQuestId ? (
            <div className="h-full flex items-center justify-center text-slate-500 flex-col gap-4">
              <Wand2 className="w-12 h-12 text-slate-700" />
              <p>Select a quest from the sidebar or create a new one</p>
            </div>
          ) : isLoading ? (
            <div className="h-full flex items-center justify-center text-slate-400">Loading...</div>
          ) : questData ? (
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Basic Info */}
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h2 className="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-700 pb-2">Quest Properties</h2>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Quest Name</label>
                    <input
                      type="text"
                      value={questData.name || ''}
                      onChange={(e) => setQuestData({ ...questData, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Default Scene (Spawn Point)</label>
                    <select
                      value={questData.quest_entities?.default_scene_id || ''}
                      onChange={(e) => updateDefaultScene(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Default Scene --</option>
                      {(questData.scene_list || []).map((sceneId: string, idx: number) => {
                         const s = scenes.find(sc => sc.id.toString() === sceneId.toString());
                         return (
                           <option key={`${sceneId}-${idx}`} value={sceneId}>
                             {s ? `${s.name} (ID: ${sceneId})` : `Scene ID: ${sceneId}`}
                           </option>
                         );
                      })}
                    </select>
                  </div>
                </div>
              </div>

              {/* Scene List Editor */}
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-2">
                  <h2 className="text-lg font-semibold text-slate-200">Included Scenes</h2>
                  <button
                    onClick={addScene}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-sm text-white rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Scene
                  </button>
                </div>

                <div className="space-y-2">
                  {(questData.scene_list || []).map((sceneId: string, index: number) => (
                    <div key={index} className="flex gap-2 items-center bg-slate-900 p-2 rounded border border-slate-700 group">
                      <span className="text-slate-500 font-mono text-xs w-6">{index + 1}.</span>
                      <select
                        value={sceneId}
                        onChange={(e) => updateSceneId(index, e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Select Scene --</option>
                        {scenes.map(s => (
                          <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>
                        ))}
                      </select>
                      {questData.quest_entities?.default_scene_id === sceneId && (
                         <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">Default</span>
                      )}
                      <button
                        onClick={() => removeScene(index)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                        title="Remove Scene"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(!questData.scene_list || questData.scene_list.length === 0) && (
                    <div className="text-center text-slate-500 py-4 border border-dashed border-slate-700 rounded">
                      No scenes added to this quest yet.
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
