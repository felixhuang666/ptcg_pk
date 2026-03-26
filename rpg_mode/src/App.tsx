import { useState } from 'react';
import PhaserGame from './components/PhaserGame';
import { Map, Edit3, Settings } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<'play' | 'edit'>('play');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <header className="bg-zinc-900 border-b border-zinc-800 p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <Map className="w-6 h-6 text-emerald-500" />
          <h1 className="text-xl font-bold tracking-tight">Phaser RPG</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-zinc-800"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative w-full">
        {showSettings && (
          <div className="absolute top-4 right-4 bg-zinc-900 border border-zinc-700 p-6 rounded-xl shadow-2xl z-50 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4 text-white">Database Configuration</h2>
            <p className="text-sm text-zinc-400 mb-4">
              To persist maps, configure Supabase in your environment variables. Without it, maps are stored in memory and reset on server restart.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wider">Supabase URL</label>
                <input type="text" readOnly value="Set SUPABASE_URL in .env" className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-500 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wider">Supabase Service Key</label>
                <input type="password" readOnly value="Set SUPABASE_SERVICE_ROLE_KEY in .env" className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-500 font-mono" />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800">
              <h3 className="text-sm font-medium text-white mb-2">Supabase Schema Setup</h3>
              <p className="text-xs text-zinc-400 mb-2">Run this SQL in your Supabase SQL Editor:</p>
              <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 text-xs text-emerald-400 font-mono overflow-x-auto">
{`create table public.maps (
  id text primary key,
  map_data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);`}
              </pre>
            </div>
            <button 
              onClick={() => setShowSettings(false)}
              className="mt-6 w-full bg-zinc-100 text-zinc-900 font-medium py-2 rounded hover:bg-white transition-colors"
            >
              Close
            </button>
          </div>
        )}

        <div className="w-[90vw] h-[80vh] bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800 overflow-hidden relative">
          {/* Key key={mode} forces PhaserGame to unmount and remount when mode changes */}
          <PhaserGame key={mode} mode={mode} />
        </div>
        
        <div className="mt-4 text-center text-zinc-500 text-sm">
          {mode === 'play' ? (
            <p>Use <kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 font-mono text-xs mx-1">Arrow Keys</kbd> to move. Click <b>Mode: Walk</b> to switch to Attack mode, then hold <kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 font-mono text-xs mx-1">Spacebar</kbd> or the ATTACK button to attack continuously.</p>
          ) : (
            <p>Click to paint tiles. Use <kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 font-mono text-xs mx-1">1</kbd> <kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 font-mono text-xs mx-1">2</kbd> <kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 font-mono text-xs mx-1">3</kbd> to change tile type. Right-click drag or Arrow Keys to pan. Scroll to zoom.</p>
          )}
        </div>

        {/* Mode Toggle Button - Bottom Right */}
        <div className="fixed bottom-6 right-6 z-50 flex bg-zinc-800 rounded-lg p-1 shadow-xl border border-zinc-700">
          <button 
            onClick={() => setMode('play')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'play' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Play Mode
          </button>
          <button 
            onClick={() => setMode('edit')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${mode === 'edit' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Edit3 className="w-4 h-4" /> GM Editor
          </button>
        </div>
      </main>
    </div>
  );
}
