import React, { useState } from 'react';
import { Bot, Save, X } from 'lucide-react';

export default function GameObjectTemplateCreator({ onBack, onSave }: { onBack: () => void, onSave: (template: any) => void }) {
  const [prompt, setPrompt] = useState('');
  const [template, setTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/game_obj_templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
         setError(`HTTP Error: ${res.status} ${res.statusText}`);
         return;
      }

      const data = await res.json();
      if (data.success) {
        setTemplate(data.template);
      } else {
        setError(data.error || 'Failed to generate');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-white overflow-hidden p-6 z-50 absolute inset-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
           <Bot className="text-emerald-400 w-8 h-8"/> Game Object Template Creator (AI)
        </h2>
        <button
          onClick={onBack}
          className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors"
          title="Close"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex flex-col flex-1 bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-2xl">
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2 text-slate-300">Prompt:</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-32 bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-500 shadow-inner"
            placeholder="E.g. Create a merchant NPC template named 「商人」 with an idle (8fps) and talk (6fps) animation. Collision: rectangle 32x48. Interaction: dialog (merchant_dialog_01)..."
          />
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {isLoading ? 'Generating...' : 'Generate Template'}
            </button>
            {template && (
              <button
                onClick={() => onSave(template)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" /> Save & Use
              </button>
            )}
          </div>
          {error && <div className="text-red-400 text-sm mt-3 bg-red-900/20 p-2 rounded border border-red-800">{error}</div>}
        </div>

        <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
          <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-4 overflow-y-auto">
             <h3 className="text-sm font-bold mb-4 text-emerald-400 border-b border-slate-700 pb-2">Properties</h3>
             {template ? (
               <div className="space-y-4 text-sm">
                 <div className="flex bg-slate-800/50 p-2 rounded"><span className="text-slate-400 w-32 font-bold">ID:</span> <span className="text-white">{template.id}</span></div>
                 <div className="flex bg-slate-800/50 p-2 rounded"><span className="text-slate-400 w-32 font-bold">Name:</span> <span className="text-white">{template.name}</span></div>
                 <div className="flex bg-slate-800/50 p-2 rounded"><span className="text-slate-400 w-32 font-bold">Category:</span> <span className="text-orange-300 bg-orange-900/30 px-2 rounded">{template.category}</span></div>
                 <div className="flex bg-slate-800/50 p-2 rounded"><span className="text-slate-400 w-32 font-bold">Controller:</span> <span className="text-purple-300 bg-purple-900/30 px-2 rounded">{template.default_controller}</span></div>
                 <div className="flex bg-slate-800/50 p-2 rounded"><span className="text-slate-400 w-32 font-bold">Container Size:</span> <span className="text-white">{template.container_width}x{template.container_height}</span></div>

                 {template.collision && (
                    <div className="bg-slate-800/50 p-3 rounded">
                      <span className="text-slate-400 font-bold block mb-2">Collision:</span>
                      <div className="ml-4 grid grid-cols-2 gap-2 text-xs">
                         <div>Enabled: {template.collision.enabled ? 'Yes' : 'No'}</div>
                         <div>Shape: {template.collision.shape}</div>
                         <div>Size: {template.collision.width}x{template.collision.height}</div>
                      </div>
                    </div>
                 )}

                 {template.interaction && (
                    <div className="bg-slate-800/50 p-3 rounded">
                      <span className="text-slate-400 font-bold block mb-2">Interaction:</span>
                      <div className="ml-4 text-xs">
                         <div>Type: <span className="text-blue-300">{template.interaction.type}</span></div>
                         {template.interaction.dialog_id && <div>Dialog ID: {template.interaction.dialog_id}</div>}
                      </div>
                    </div>
                 )}

                 <div className="bg-slate-800/50 p-3 rounded">
                    <span className="text-slate-400 font-bold block mb-2">Sprite Sheets:</span>
                    <div className="space-y-2 ml-4">
                      {template.sprite_sheets?.map((s: any, i: number) => (
                        <div key={i} className="flex justify-between border-b border-slate-700/50 pb-1 text-xs">
                          <span className="text-green-300 font-bold">{s.state}</span>
                          <span className="text-slate-300">{s.sprite_sheet_name}</span>
                          <span className="text-slate-500">{s.frame_width}x{s.frame_height} @ {s.frame_rate}fps</span>
                        </div>
                      ))}
                    </div>
                 </div>
               </div>
             ) : (
               <div className="text-slate-600 text-sm flex items-center justify-center h-full">Properties will appear here...</div>
             )}
          </div>

          <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-4 overflow-y-auto">
            <h3 className="text-sm font-bold mb-4 text-slate-400 border-b border-slate-700 pb-2">JSON Preview</h3>
            {template ? (
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                {JSON.stringify(template, null, 2)}
              </pre>
            ) : (
              <div className="text-slate-600 text-sm flex items-center justify-center h-full">Template JSON will appear here...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
