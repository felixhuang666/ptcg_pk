import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';

export default function Auth() {
  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-10 shadow-2xl border border-slate-700">
          <h1 className="text-3xl font-black mb-8 text-center text-red-400">系統未設定</h1>
          <p className="text-slate-300 text-center">
            請參考 <code className="bg-slate-700 px-2 py-1 rounded">docs/setup_oauth.md</code> 設定 Supabase 環境變數
            <br/><br/>
            <code>VITE_SUPABASE_URL</code><br/>
            <code>VITE_SUPABASE_ANON_KEY</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8">
      <div className="max-w-md w-full bg-slate-800 rounded-3xl p-10 shadow-2xl border border-slate-700">
        <h1 className="text-4xl font-black mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 tracking-tight">
          登入怪獸對戰
        </h1>
        <SupabaseAuth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#4f46e5',
                  brandAccent: '#4338ca',
                },
              },
            },
          }}
          providers={['google']}
          onlyThirdPartyProviders
        />
      </div>
    </div>
  );
}
