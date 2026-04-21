/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Battle from './components/Battle';
import TeamEditor from './components/TeamEditor';
import BossSelect from './components/BossSelect';
import Admin from './components/Admin';
import RpgMode from './components/RpgMode';
import RoleSetting from './components/RoleSetting';
import RpgSceneEditor from './components/RpgSceneEditor';
import RpgMapEditor from './components/RpgMapEditor';
import GameObjectTemplateCreator from './components/GameObjectTemplateCreator';
import QuestEditor from './components/QuestEditor';
import SpriteSheetEditor from './components/SpriteSheetEditor';
import { useAppStore } from './store/appStore';
import { DICE_COSTS, MONSTERS, SKILLS } from './shared/gameData';
import { TeamConfig } from './shared/types';
import { io } from 'socket.io-client';

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [view, setView] = useState<'MENU' | 'BATTLE_PVP' | 'BATTLE_PVE' | 'BATTLE_PRIVATE' | 'EDITOR' | 'BOSS_SELECT' | 'BATTLE_BOSS' | 'ADMIN' | 'RPG_MODE' | 'ROLE_SETTING' | 'RPG_SCENE_EDITOR' | 'RPG_MAP_EDITOR' | 'SPRITE_SHEET_EDITOR' | 'GAME_OBJECT_EDITOR' | 'QUEST_EDITOR'>(() => {
    // Check URL parameters first
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlView = searchParams.get('view');
      if (urlView === 'RPG_SCENE_EDITOR') return 'RPG_SCENE_EDITOR';
      if (urlView === 'RPG_MAP_EDITOR') return 'RPG_MAP_EDITOR';
      if (urlView === 'RPG_MODE') return 'RPG_MODE';
      if (urlView === 'QUEST_EDITOR') return 'QUEST_EDITOR';
      if (urlView === 'SPRITE_SHEET_EDITOR') return 'SPRITE_SHEET_EDITOR';
      if (urlView === 'GAME_OBJECT_EDITOR') return 'GAME_OBJECT_EDITOR';
    }

    // Fallback to cookie
    const match = document.cookie.match(/(?:^|;\s*)last_view=([^;]*)/);
    return match && match[1] === 'RPG_MODE' ? 'RPG_MODE' : 'MENU';
  });
  const [roomCode, setRoomCode] = useState('');
  const [showRoomInput, setShowRoomInput] = useState(false);
  const [selectedBossTeam, setSelectedBossTeam] = useState<TeamConfig | null>(null);
  const { teams, currentTeamId } = useAppStore();
  
  const [gameDataVersion, setGameDataVersion] = useState(0);

  useEffect(() => {
    if (view === 'RPG_MODE') {
      document.cookie = "last_view=RPG_MODE; path=/; max-age=31536000";
    } else {
      document.cookie = "last_view=; path=/; max-age=0";
    }
  }, [view]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setUser(data.user);
        }
        setAuthChecked(true);
      })
      .catch(err => {
        console.error('Error checking auth', err);
        setAuthChecked(true);
      });

    // Also fetch roles globally on app start
    fetch('/api/roles')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          useAppStore.getState().setRoles(data);
          if (data.length > 0) {
            const currentSelected = useAppStore.getState().selectedRoleId;
            const isValid = data.find((r: any) => r.id === currentSelected);
            if (!currentSelected || !isValid) {
              useAppStore.getState().setSelectedRoleId(data[0].id);
            }
          }
        }
      })
      .catch(err => console.error('Failed to fetch global roles:', err));
  }, []);

  useEffect(() => {
    if (!user) return;
    const socket = io(window.location.origin);
    socket.emit('getGameData', (data: { MONSTERS: any, SKILLS: any }) => {
      Object.keys(MONSTERS).forEach(k => delete MONSTERS[k]);
      Object.assign(MONSTERS, data.MONSTERS);
      Object.keys(SKILLS).forEach(k => delete SKILLS[k]);
      Object.assign(SKILLS, data.SKILLS);
      setGameDataVersion(v => v + 1);
    });

    socket.on('gameDataUpdated', (data: { MONSTERS: any, SKILLS: any }) => {
      Object.keys(MONSTERS).forEach(k => delete MONSTERS[k]);
      Object.assign(MONSTERS, data.MONSTERS);
      Object.keys(SKILLS).forEach(k => delete SKILLS[k]);
      Object.assign(SKILLS, data.SKILLS);
      setGameDataVersion(v => v + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => {
      setUser(null);
    });
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-2xl animate-pulse">載入中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-10 shadow-2xl border border-slate-700 text-center">
          <h1 className="text-5xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600 tracking-tight">
            怪獸對戰
          </h1>
          <p className="text-slate-400 mb-12 font-medium tracking-wide">請先登入以繼續遊玩</p>
          <a
            href="/auth/login"
            className="block w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold text-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Google 登入
          </a>

        {import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true' && (
          <a
            href="/auth/dev_login"
            className="block w-full py-4 mt-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Login as tester
          </a>
        )}
        </div>
      </div>
    );
  }
  
  const currentTeam = teams.find(t => t.id === currentTeamId);

  const validateTeam = (team: TeamConfig) => {
    for (const dice of team.dices) {
      const totalCost = dice.faces.reduce((sum, face) => sum + DICE_COSTS[face], 0);
      if (totalCost > 10) {
        return false;
      }
    }
    return true;
  };

  const handleStartBattle = (mode: 'BATTLE_PVP' | 'BATTLE_PVE' | 'BATTLE_PRIVATE' | 'BOSS_SELECT') => {
    if (!currentTeam) return;
    if (!validateTeam(currentTeam)) {
      alert('您的隊伍骰子配置不符合規則 (每顆上限 10 點)，請先編輯隊伍！');
      setView('EDITOR');
      return;
    }
    setView(mode);
  };

  const handleStartBossBattle = (bossTeam: TeamConfig) => {
    if (!currentTeam) return;
    if (!validateTeam(currentTeam)) {
      alert('您的隊伍骰子配置不符合規則 (每顆上限 10 點)，請先編輯隊伍！');
      setView('EDITOR');
      return;
    }
    setSelectedBossTeam(bossTeam);
    setView('BATTLE_BOSS');
  };

  if (view === 'BATTLE_PVP' && currentTeam) {
    return <Battle team={currentTeam} mode="PVP" onExit={() => setView('MENU')} />;
  }

  if (view === 'BATTLE_PRIVATE' && currentTeam) {
    return <Battle team={currentTeam} mode="PRIVATE" roomCode={roomCode} onExit={() => setView('MENU')} />;
  }

  if (view === 'BATTLE_PVE' && currentTeam) {
    return <Battle team={currentTeam} mode="PVE" onExit={() => setView('MENU')} />;
  }

  if (view === 'BATTLE_BOSS' && currentTeam && selectedBossTeam) {
    return <Battle team={currentTeam} mode="BOSS" bossTeam={selectedBossTeam} onExit={() => setView('MENU')} />;
  }

  if (view === 'BOSS_SELECT') {
    return <BossSelect onBack={() => setView('MENU')} onStartBattle={handleStartBossBattle} />;
  }

  if (view === 'EDITOR') {
    return <TeamEditor onBack={() => setView('MENU')} />;
  }

  if (view === 'ADMIN') {
    return <Admin onBack={() => setView('MENU')} />;
  }

  if (view === 'RPG_MODE') {
    return <RpgMode onBack={() => setView('MENU')} />;
  }

  if (view === 'ROLE_SETTING') {
    return <RoleSetting onBack={() => setView('MENU')} />;
  }

  if (view === 'RPG_SCENE_EDITOR') {
    return <RpgSceneEditor onBack={() => setView('MENU')} />;
  }

  if (view === 'QUEST_EDITOR') {
    return <QuestEditor onBack={() => setView('MENU')} />;
  }

  if (view === 'RPG_MAP_EDITOR') {
    return <RpgMapEditor onBack={() => setView('MENU')} />;
  }

  if (view === 'GAME_OBJECT_EDITOR') {
    return <GameObjectTemplateCreator onBack={() => setView('MENU')} onSave={() => {}} />;
  }

  if (view === 'SPRITE_SHEET_EDITOR') {
    return <SpriteSheetEditor onBack={() => setView('MENU')} />;
  }

  const handleJoinPrivate = () => {
    if (roomCode.trim()) {
      handleStartBattle('BATTLE_PRIVATE');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8 relative">
      <div className="absolute top-4 right-4 flex items-center gap-4 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
        <button
          onClick={() => setView('SPRITE_SHEET_EDITOR')}
          className="text-sm text-emerald-400 hover:text-emerald-300 font-bold mr-2 border border-emerald-400 px-2 py-1 rounded"
          title="Sprite Sheet Editor"
        >
          切圖工具
        </button>
        <button
          onClick={() => setView('RPG_MAP_EDITOR')}
          className="text-sm text-blue-400 hover:text-blue-300 font-bold mr-2 border border-blue-400 px-2 py-1 rounded"
          title="RPG 地圖編輯器"
        >
          地圖編輯器
        </button>
        <button
          onClick={() => setView('RPG_SCENE_EDITOR')}
          className="text-sm text-purple-400 hover:text-purple-300 font-bold mr-2 border border-purple-400 px-2 py-1 rounded"
          title="RPG 場景編輯器"
        >
          場景編輯器
        </button>
        <button
          onClick={() => setView('QUEST_EDITOR')}
          className="text-sm text-amber-400 hover:text-amber-300 font-bold mr-4 border border-amber-400 px-2 py-1 rounded"
          title="RPG 副本編輯器"
        >
          副本編輯器
        </button>
        <img src={user.picture} alt="Avatar" className="w-8 h-8 rounded-full" />
        <span className="text-sm font-medium">{user.name}</span>
        <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300 font-bold ml-2">登出</button>
      </div>

      <div className="max-w-md w-full bg-slate-800 rounded-3xl p-10 shadow-2xl border border-slate-700 text-center mt-12">
        <h1 className="text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600 tracking-tight">
          怪獸對戰
        </h1>
        <p className="text-slate-400 mb-12 font-medium tracking-wide">Active Time Battle</p>
        
        <div className="space-y-4">
          <button 
            onClick={() => handleStartBattle('BATTLE_PVE')}
            disabled={!currentTeam}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-bold text-xl shadow-lg shadow-green-900/50 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            人機對戰
          </button>

          <button 
            onClick={() => handleStartBattle('BATTLE_PVP')}
            disabled={!currentTeam}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold text-xl shadow-lg shadow-blue-900/50 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            線上對戰 (隨機)
          </button>

          <button 
            onClick={() => handleStartBattle('BOSS_SELECT')}
            disabled={!currentTeam}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 rounded-xl font-bold text-xl shadow-lg shadow-red-900/50 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            挑戰 BOSS (前十名玩家)
          </button>

          {!showRoomInput ? (
            <button 
              onClick={() => setShowRoomInput(true)}
              disabled={!currentTeam}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 rounded-xl font-bold text-xl shadow-lg shadow-purple-900/50 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              私人對戰 (房號)
            </button>
          ) : (
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="輸入房號..." 
                value={roomCode}
                onChange={e => setRoomCode(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl focus:outline-none focus:border-purple-500 text-lg"
              />
              <button 
                onClick={handleJoinPrivate}
                disabled={!roomCode.trim()}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-lg disabled:opacity-50"
              >
                加入
              </button>
              <button 
                onClick={() => setShowRoomInput(false)}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-lg"
              >
                ✕
              </button>
            </div>
          )}
          
          <button 
            onClick={() => setView('EDITOR')}
            className="w-full py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-xl transition-all border border-slate-600 hover:border-slate-500"
          >
            編輯隊伍
          </button>

          <button
            onClick={() => setView('RPG_MODE')}
            className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 rounded-xl font-bold text-xl shadow-lg shadow-orange-900/50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            RPG 模式
          </button>

          <button
            onClick={() => setView('ROLE_SETTING')}
            className="w-full py-4 bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 rounded-xl font-bold text-xl shadow-lg shadow-pink-900/50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            角色設定
          </button>

          <button 
            onClick={() => setView('ADMIN')}
            className="w-full py-2 mt-4 bg-slate-800 hover:bg-slate-700 text-gray-400 rounded-xl font-bold text-sm shadow-lg transition-all border border-slate-700"
          >
            管理者介面
          </button>
        </div>

        {currentTeam && (
          <div className="mt-12 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
            <div className="text-sm text-slate-400 mb-2">目前出戰隊伍</div>
            <div className="font-bold text-amber-500">{currentTeam.name}</div>
          </div>
        )}
      </div>
    </div>
  );
}

