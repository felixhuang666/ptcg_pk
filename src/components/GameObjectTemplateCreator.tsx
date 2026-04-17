import React, { useState, useEffect } from 'react';
import { X, Save, Wand2, Plus, Trash2 } from 'lucide-react';

interface SpriteSheet {
  state: string;
  sprite_sheet_name: string;
  frame_width: number;
  frame_height: number;
  frame_rate: number;
}

interface TemplateData {
  id: string;
  name: string;
  category: string;
  container_width: number;
  container_height: number;
  sprite_sheets: SpriteSheet[];
  collision: {
    enabled: boolean;
    width: number;
    height: number;
    shape: string;
  };
  interaction?: {
    type: string;
    dialog_id?: string;
  };
  default_controller: string;
  properties?: any;
}

const DEFAULT_TEMPLATE: TemplateData = {
  id: 'new_npc',
  name: 'New NPC',
  category: 'npc',
  container_width: 32,
  container_height: 32,
  sprite_sheets: [
    { state: 'idle', sprite_sheet_name: 'npc_idle', frame_width: 32, frame_height: 32, frame_rate: 8 }
  ],
  collision: { enabled: true, width: 32, height: 32, shape: 'rectangle' },
  interaction: { type: 'talk', dialog_id: '' },
  default_controller: 'StaticNpcController'
};

interface Props {
  onClose: () => void;
  onSave: (template: TemplateData) => void;
}

export default function GameObjectTemplateCreator({ onClose, onSave }: Props) {
  const [prompt, setPrompt] = useState('');
  const [template, setTemplate] = useState<TemplateData>(DEFAULT_TEMPLATE);
  const [jsonText, setJsonText] = useState(JSON.stringify(DEFAULT_TEMPLATE, null, 2));

  // Sync JSON text when template changes visually (not vice-versa yet, to keep it simple)
  useEffect(() => {
    setJsonText(JSON.stringify(template, null, 2));
  }, [template]);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonText(e.target.value);
    try {
      const parsed = JSON.parse(e.target.value);
      setTemplate(parsed);
    } catch (err) {
      // ignore parse errors while typing
    }
  };

  const handleGenerate = () => {
    // Mock AI generation by parsing some keywords
    let newTemplate = { ...template };
    if (prompt.includes('商人')) {
      newTemplate = {
        id: 'merchant',
        name: '商人',
        category: 'npc',
        container_width: 64,
        container_height: 64,
        sprite_sheets: [
          { state: 'idle', sprite_sheet_name: 'merchant_idle', frame_width: 64, frame_height: 64, frame_rate: 8 },
          { state: 'walk', sprite_sheet_name: 'merchant_walk', frame_width: 64, frame_height: 64, frame_rate: 12 }
        ],
        collision: { enabled: true, width: 32, height: 48, shape: 'rectangle' },
        interaction: { type: 'talk', dialog_id: 'merchant_dialog_01' },
        default_controller: 'StaticNpcController'
      };
    } else if (prompt.includes('寶箱')) {
      newTemplate = {
        id: 'treasure_chest',
        name: '寶箱',
        category: 'environment',
        container_width: 32,
        container_height: 32,
        sprite_sheets: [
          { state: 'closed', sprite_sheet_name: 'chest_closed', frame_width: 32, frame_height: 32, frame_rate: 1 },
          { state: 'opened', sprite_sheet_name: 'chest_opened', frame_width: 32, frame_height: 32, frame_rate: 1 }
        ],
        collision: { enabled: true, width: 32, height: 32, shape: 'rectangle' },
        interaction: { type: 'open', dialog_id: '' },
        default_controller: 'ChestController',
        properties: { item_id: 'gold', amount: 100 }
      };
    }
    setTemplate(newTemplate);
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/game_obj_templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });
      if (res.ok) {
        onSave(template);
      } else {
        alert('Failed to save template');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving template');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-[900px] max-h-[90vh] flex flex-col border border-slate-600">
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-400" />
            Game Object Template Creator
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
          {/* Prompt Section */}
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
            <label className="block text-sm font-semibold mb-2 text-purple-300">AI Prompt (Mock)</label>
            <div className="flex gap-2">
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe the template (e.g. 建立一個 NPC 模板，名稱為「商人」...)"
                className="flex-1 bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white resize-none h-20"
              />
              <button
                onClick={handleGenerate}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded font-semibold flex items-center gap-2 h-20"
              >
                <Wand2 className="w-4 h-4" />
                Generate
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            {/* Visual Editor */}
            <div className="flex-1 bg-slate-900 p-4 rounded-lg border border-slate-700 flex flex-col gap-4">
              <h3 className="font-semibold text-slate-300 border-b border-slate-700 pb-2">Properties</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">ID</label>
                  <input
                    type="text"
                    value={template.id}
                    onChange={e => setTemplate({...template, id: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={template.name}
                    onChange={e => setTemplate({...template, name: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Category</label>
                  <select
                    value={template.category}
                    onChange={e => setTemplate({...template, category: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                  >
                    <option value="npc">NPC</option>
                    <option value="monster">Monster</option>
                    <option value="trigger">Trigger</option>
                    <option value="item">Item</option>
                    <option value="environment">Environment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Default Controller</label>
                  <select
                    value={template.default_controller}
                    onChange={e => setTemplate({...template, default_controller: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                  >
                    <option value="StaticNpcController">StaticNpcController</option>
                    <option value="EncounterMonsterController">EncounterMonsterController</option>
                    <option value="TeleportController">TeleportController</option>
                    <option value="ChestController">ChestController</option>
                    <option value="BattleActorController">BattleActorController</option>
                    <option value="ItemController">ItemController</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-2 rounded border border-slate-700">
                  <h4 className="text-xs font-semibold mb-2">Container Size</h4>
                  <div className="flex gap-2">
                    <input type="number" value={template.container_width} onChange={e => setTemplate({...template, container_width: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" placeholder="W" />
                    <input type="number" value={template.container_height} onChange={e => setTemplate({...template, container_height: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" placeholder="H" />
                  </div>
                </div>

                <div className="bg-slate-800 p-2 rounded border border-slate-700">
                  <h4 className="text-xs font-semibold mb-2">Collision</h4>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" checked={template.collision.enabled} onChange={e => setTemplate({...template, collision: {...template.collision, enabled: e.target.checked}})} />
                      Enabled
                    </label>
                    {template.collision.enabled && (
                      <div className="flex gap-2">
                        <input type="number" value={template.collision.width} onChange={e => setTemplate({...template, collision: {...template.collision, width: Number(e.target.value)}})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" placeholder="W" />
                        <input type="number" value={template.collision.height} onChange={e => setTemplate({...template, collision: {...template.collision, height: Number(e.target.value)}})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" placeholder="H" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 p-2 rounded border border-slate-700 flex-1 overflow-auto">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-semibold">Sprite Sheets</h4>
                  <button onClick={() => setTemplate({...template, sprite_sheets: [...template.sprite_sheets, { state: 'new_state', sprite_sheet_name: '', frame_width: 32, frame_height: 32, frame_rate: 8 }]})} className="text-xs text-blue-400 hover:text-blue-300 flex items-center">
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {template.sprite_sheets.map((ss, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-900 p-2 rounded">
                      <input type="text" value={ss.state} onChange={e => { const newSs = [...template.sprite_sheets]; newSs[idx].state = e.target.value; setTemplate({...template, sprite_sheets: newSs}); }} className="w-16 bg-slate-800 border border-slate-600 rounded px-1 py-1 text-xs" placeholder="state" />
                      <input type="text" value={ss.sprite_sheet_name} onChange={e => { const newSs = [...template.sprite_sheets]; newSs[idx].sprite_sheet_name = e.target.value; setTemplate({...template, sprite_sheets: newSs}); }} className="flex-1 bg-slate-800 border border-slate-600 rounded px-1 py-1 text-xs" placeholder="sheet_name" />
                      <input type="number" value={ss.frame_width} onChange={e => { const newSs = [...template.sprite_sheets]; newSs[idx].frame_width = Number(e.target.value); setTemplate({...template, sprite_sheets: newSs}); }} className="w-12 bg-slate-800 border border-slate-600 rounded px-1 py-1 text-xs" placeholder="W" />
                      <input type="number" value={ss.frame_height} onChange={e => { const newSs = [...template.sprite_sheets]; newSs[idx].frame_height = Number(e.target.value); setTemplate({...template, sprite_sheets: newSs}); }} className="w-12 bg-slate-800 border border-slate-600 rounded px-1 py-1 text-xs" placeholder="H" />
                      <input type="number" value={ss.frame_rate} onChange={e => { const newSs = [...template.sprite_sheets]; newSs[idx].frame_rate = Number(e.target.value); setTemplate({...template, sprite_sheets: newSs}); }} className="w-10 bg-slate-800 border border-slate-600 rounded px-1 py-1 text-xs" placeholder="fps" />
                      <button onClick={() => { const newSs = template.sprite_sheets.filter((_, i) => i !== idx); setTemplate({...template, sprite_sheets: newSs}); }} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* JSON Preview */}
            <div className="w-80 bg-slate-900 p-4 rounded-lg border border-slate-700 flex flex-col">
              <h3 className="font-semibold text-slate-300 border-b border-slate-700 pb-2 mb-2">JSON Preview</h3>
              <textarea
                value={jsonText}
                onChange={handleJsonChange}
                className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-green-400 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold flex items-center gap-2 transition-colors">
            <Save className="w-4 h-4" />
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}
