import React, { useState, useEffect } from 'react';
import { X, Save, Wand2 } from 'lucide-react';

interface TemplateState {
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
  sprite_sheets: TemplateState[];
  collision: { enabled: boolean; width: number; height: number; shape: string };
  interaction: { type: string; dialog_id?: string; drop_item?: string };
  default_controller: string;
  default_image?: string;
}

export default function GameObjectTemplateCreator({ onBack, onSave }: { onBack: () => void, onSave: () => void }) {
  const [templateId, setTemplateId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get('templateId');
    }
    return null;
  });

  useEffect(() => {
    if (templateId) {
      fetch('/api/game_obj_templates')
        .then(res => res.json())
        .then(data => {
          const tpl = data.find((t: any) => t.id === templateId);
          if (tpl) {
            setTemplate(tpl);
          }
        })
        .catch(err => console.error(err));
    }
  }, [templateId]);

  const [prompt, setPrompt] = useState('建立一個 NPC 模板，名稱為「商人」，包含：\n- 精靈圖: merchant.png (frame: 64x64)\n- 動畫: idle (8帧), walk (12帧), talk (6帧)\n- 碰撞體: 矩形 32x48\n- 互動: 對話 (dialog_id)\n- 事件: 無');
  const [template, setTemplate] = useState<TemplateData | null>(null);

  const [availableImages, setAvailableImages] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/game_obj_img')
      .then(res => res.json())
      .then(data => setAvailableImages(data || ['object_default.jpg']))
      .catch(() => setAvailableImages(['object_default.jpg']));
  }, []);

  const generateTemplate = () => {
    // Very basic keyword parser
    const tpl: TemplateData = {
      id: 'merchant_' + Date.now(),
      name: '商人',
      category: 'npc',
      container_width: 64,
      container_height: 64,
      sprite_sheets: [
        { state: 'idle', sprite_sheet_name: 'merchant_idle', frame_width: 64, frame_height: 64, frame_rate: 8 },
        { state: 'walk', sprite_sheet_name: 'merchant_walk', frame_width: 64, frame_height: 64, frame_rate: 12 },
        { state: 'talk', sprite_sheet_name: 'merchant_talk', frame_width: 64, frame_height: 64, frame_rate: 6 }
      ],
      collision: { enabled: true, width: 32, height: 48, shape: 'rectangle' },
      interaction: { type: 'dialog', dialog_id: 'merchant_dialog_01' },
      default_controller: 'StaticNpcController',
      default_image: 'object_default.jpg'
    };

    if (prompt.includes('怪物') || prompt.includes('monster')) {
      tpl.category = 'monster';
      tpl.id = 'monster_' + Date.now();
      tpl.name = 'Monster';
      tpl.default_controller = 'EncounterMonsterController';
    } else if (prompt.includes('寶箱') || prompt.includes('chest')) {
      tpl.category = 'environment';
      tpl.id = 'chest_' + Date.now();
      tpl.name = 'Chest';
      tpl.default_controller = 'ChestController';
    }

    setTemplate(tpl);
  };

  const handleSave = async () => {
    if (!template) return;
    try {
      const res = await fetch('/api/save_local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_obj_templates: [template] })
      });
      const data = await res.json();
      if (data.success) {
        alert('Template saved successfully!');
        onSave();
        onBack();
      } else {
        alert('Failed to save template.');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving template.');
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col text-white">
      <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
        <h2 className="text-xl font-bold">{templateId ? "Game Object Template Editor" : "Game Object Template Creator"}</h2>
        <div className="flex gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded transition-colors text-slate-300 hover:text-white" title="Cancel">
            <X className="w-6 h-6" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Side: Prompt & JSON Preview */}
        <div className="w-1/2 flex flex-col gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex-1 flex flex-col">
            <h3 className="font-bold mb-2">Prompt</h3>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="w-full flex-1 bg-slate-900 border border-slate-600 rounded p-2 text-sm font-mono text-slate-300 focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Describe the template..."
            />
            <button
              onClick={generateTemplate}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-500 py-2 rounded font-bold flex justify-center items-center gap-2 transition-colors"
            >
              <Wand2 className="w-5 h-5" /> Generate
            </button>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex-1 flex flex-col">
            <h3 className="font-bold mb-2">JSON Preview</h3>
            <div className="w-full flex-1 bg-slate-900 border border-slate-600 rounded p-2 overflow-auto font-mono text-xs text-green-400">
              {template ? JSON.stringify(template, null, 2) : '// Generates JSON here'}
            </div>
          </div>
        </div>

        {/* Right Side: Visual Preview & Editor */}
        <div className="w-1/2 bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col">
           <h3 className="font-bold mb-4">Properties</h3>
           {template ? (
             <div className="flex-1 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">ID</label>
                    <input type="text" value={template.id} onChange={e => setTemplate({...template, id: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Name</label>
                    <input type="text" value={template.name} onChange={e => setTemplate({...template, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Category</label>
                    <select value={template.category} onChange={e => setTemplate({...template, category: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm">
                      <option value="npc">NPC</option>
                      <option value="monster">Monster</option>
                      <option value="environment">Environment</option>
                      <option value="item">Item</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Default Controller</label>
                    <input type="text" value={template.default_controller} onChange={e => setTemplate({...template, default_controller: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Default Image</label>
                    <select
                      value={template.default_image || ''}
                      onChange={e => setTemplate({...template, default_image: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                    >
                      <option value="">-- None --</option>
                      {availableImages.map(img => (
                        <option key={img} value={img}>{img}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border border-slate-700 rounded p-4">
                   <h4 className="font-bold text-sm mb-2 text-slate-300">Sprite Sheets (Animations)</h4>
                   {template.sprite_sheets.map((sheet, idx) => (
                     <div key={idx} className="flex gap-2 mb-2 items-center text-xs">
                        <input type="text" value={sheet.state} onChange={(e) => {
                          const n = [...template.sprite_sheets];
                          n[idx] = { ...n[idx], state: e.target.value };
                          setTemplate({...template, sprite_sheets: n});
                        }} className="flex-1 bg-slate-900 border border-slate-600 rounded px-1" title="State" />
                        <input type="text" value={sheet.sprite_sheet_name} onChange={(e) => {
                          const n = [...template.sprite_sheets];
                          n[idx] = { ...n[idx], sprite_sheet_name: e.target.value };
                          setTemplate({...template, sprite_sheets: n});
                        }} className="flex-1 bg-slate-900 border border-slate-600 rounded px-1" title="Sheet Name" />
                        <span className="text-slate-500">fps:</span>
                        <input type="number" value={sheet.frame_rate} onChange={(e) => {
                          const n = [...template.sprite_sheets];
                          n[idx] = { ...n[idx], frame_rate: Number(e.target.value) };
                          setTemplate({...template, sprite_sheets: n});
                        }} className="w-12 bg-slate-900 border border-slate-600 rounded px-1" />
                     </div>
                   ))}
                </div>

                <div className="border border-slate-700 rounded p-4">
                   <h4 className="font-bold text-sm mb-2 text-slate-300">Collision</h4>
                   <div className="flex gap-4 items-center text-sm">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={template.collision.enabled} onChange={e => setTemplate({...template, collision: {...template.collision, enabled: e.target.checked}})} />
                        Enabled
                      </label>
                      <div>
                        W: <input type="number" value={template.collision.width} onChange={e => setTemplate({...template, collision: {...template.collision, width: Number(e.target.value)}})} className="w-16 bg-slate-900 border border-slate-600 rounded px-1" />
                      </div>
                      <div>
                        H: <input type="number" value={template.collision.height} onChange={e => setTemplate({...template, collision: {...template.collision, height: Number(e.target.value)}})} className="w-16 bg-slate-900 border border-slate-600 rounded px-1" />
                      </div>
                   </div>
                </div>

                <div className="flex justify-end mt-4">
                   <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded font-bold flex items-center gap-2 transition-colors">
                     <Save className="w-5 h-5" /> Save Template
                   </button>
                </div>
             </div>
           ) : (
             <div className="flex-1 flex items-center justify-center text-slate-500">
                {templateId ? "Loading template..." : "Generate a template from a prompt to view properties."}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
