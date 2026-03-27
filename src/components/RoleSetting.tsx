import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';

interface RoleSettingProps {
  onBack: () => void;
}

export default function RoleSetting({ onBack }: RoleSettingProps) {
  const { roles, setRoles, selectedRoleId, setSelectedRoleId } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/roles')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRoles(data);
          // Set default if none selected or if current selection is invalid
          if (data.length > 0) {
            const isValid = data.find(r => r.id === selectedRoleId);
            if (!selectedRoleId || !isValid) {
              setSelectedRoleId(data[0].id);
            }
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch roles:', err);
        setLoading(false);
      });
  }, []);

  const handleSelectRole = (id: string) => {
    setSelectedRoleId(id);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8">
      <div className="max-w-2xl w-full bg-slate-800 rounded-3xl p-10 shadow-2xl border border-slate-700">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            角色設定
          </h1>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-colors"
          >
            返回
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 animate-pulse text-slate-400">載入中...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roles.length === 0 ? (
              <div className="col-span-2 text-center text-slate-400 py-10">
                目前沒有可用的角色。
              </div>
            ) : (
              roles.map(role => (
                <div
                  key={role.id}
                  onClick={() => handleSelectRole(role.id)}
                  className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all transform hover:scale-[1.02] ${
                    selectedRoleId === role.id
                      ? 'border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/20'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
                  }`}
                >
                  {selectedRoleId === role.id && (
                    <div className="absolute top-4 right-4 text-pink-500 font-bold bg-pink-500/20 px-3 py-1 rounded-full text-sm">
                      已選擇
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-4">{role.name}</h3>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-slate-400 mb-2">走路圖</span>
                      <img
                        src={`/assets/players/${role.role_walk_sprite}`}
                        alt="Walk Sprite"
                        className="w-16 h-16 object-contain bg-slate-900 rounded-lg p-2"
                        onError={(e) => {
                           (e.target as HTMLImageElement).src = '/assets/players/character.png';
                        }}
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-slate-400 mb-2">攻擊圖</span>
                      <img
                        src={`/assets/players/${role.role_atk_sprite}`}
                        alt="Attack Sprite"
                        className="w-16 h-16 object-contain bg-slate-900 rounded-lg p-2"
                        onError={(e) => {
                           (e.target as HTMLImageElement).src = '/assets/players/character_atk.png';
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
