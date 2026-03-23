import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { DiceFace, TeamConfig } from '../shared/types';
import { DICE_COSTS, MONSTERS } from '../shared/gameData';

export default function TeamEditor({ onBack }: { onBack: () => void }) {
  const { teams, currentTeamId, addTeam, updateTeam, deleteTeam, setCurrentTeamId } = useAppStore();
  const [editingTeam, setEditingTeam] = useState<TeamConfig | null>(null);

  const handleEdit = (team: TeamConfig) => {
    setEditingTeam(JSON.parse(JSON.stringify(team)));
  };

  const handleSave = () => {
    if (editingTeam) {
      for (const dice of editingTeam.dices) {
        const totalCost = dice.faces.reduce((sum, face) => sum + DICE_COSTS[face], 0);
        if (totalCost > 10) {
          alert('有骰子超過 10 點上限，請修改後再儲存！');
          return;
        }
      }

      if (teams.find(t => t.id === editingTeam.id)) {
        updateTeam(editingTeam);
      } else {
        addTeam(editingTeam);
      }
      setEditingTeam(null);
    }
  };

  const handleCreate = () => {
    setEditingTeam({
      id: `team_${Math.random().toString(36).substring(7)}`,
      name: '新隊伍',
      dices: [
        { faces: [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.EARTH, DiceFace.WATER, DiceFace.FIRE] },
        { faces: [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.EARTH, DiceFace.WATER, DiceFace.FIRE] },
        { faces: [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.EARTH, DiceFace.WATER, DiceFace.FIRE] },
        { faces: [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.EARTH, DiceFace.WATER, DiceFace.FIRE] }
      ],
      monsters: ['m1', 'm2', 'm3']
    });
  };

  if (editingTeam) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto bg-slate-900 min-h-screen text-white">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-amber-500">編輯隊伍</h2>
          <div className="flex gap-2 md:gap-4">
            <button onClick={() => setEditingTeam(null)} className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-600 rounded hover:bg-gray-500 text-sm md:text-base">取消</button>
            <button onClick={handleSave} className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 rounded hover:bg-blue-500 font-bold text-sm md:text-base">儲存</button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-300">隊伍名稱</label>
          <input 
            type="text" 
            value={editingTeam.name}
            onChange={e => setEditingTeam({ ...editingTeam, name: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white focus:border-blue-500 outline-none"
          />
        </div>

        <div className="mb-8">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-blue-400 border-b border-slate-700 pb-2">召喚師骰子 (每顆上限 10 點)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {editingTeam.dices.map((dice, dIndex) => {
              const totalCost = dice.faces.reduce((sum, face) => sum + DICE_COSTS[face], 0);
              return (
                <div key={dIndex} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <div className="flex justify-between mb-4">
                    <span className="font-bold text-gray-300">骰子 {dIndex + 1}</span>
                    <span className={`font-bold ${totalCost > 10 ? 'text-red-500' : 'text-green-400'}`}>
                      {totalCost} / 10 點
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {dice.faces.map((face, fIndex) => (
                      <select
                        key={fIndex}
                        value={face}
                        onChange={(e) => {
                          const newDices = [...editingTeam.dices];
                          newDices[dIndex].faces[fIndex] = e.target.value as DiceFace;
                          setEditingTeam({ ...editingTeam, dices: newDices });
                        }}
                        className="bg-slate-700 border border-slate-600 rounded p-2 text-sm text-white outline-none"
                      >
                        {Object.entries(DICE_COSTS).map(([f, cost]) => (
                          <option key={f} value={f}>{f} ({cost})</option>
                        ))}
                      </select>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-lg md:text-xl font-bold mb-4 text-blue-400 border-b border-slate-700 pb-2">出戰怪獸 (3 隻)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            {editingTeam.monsters.map((mId, mIndex) => (
              <div key={mIndex} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <span className="block font-bold text-gray-300 mb-4">怪獸 {mIndex + 1}</span>
                <select
                  value={mId}
                  onChange={(e) => {
                    const newMonsters = [...editingTeam.monsters];
                    newMonsters[mIndex] = e.target.value;
                    setEditingTeam({ ...editingTeam, monsters: newMonsters });
                  }}
                  className="w-full bg-slate-700 border border-slate-600 rounded p-3 text-white outline-none mb-4"
                >
                  {Object.values(MONSTERS).map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
                  ))}
                </select>
                
                <div className="text-sm text-gray-400 space-y-1 bg-slate-900 p-3 rounded">
                  <div className="flex justify-between"><span>HP:</span> <span className="text-white">{MONSTERS[mId].hp}</span></div>
                  <div className="flex justify-between"><span>STR:</span> <span className="text-white">{MONSTERS[mId].str}</span></div>
                  <div className="flex justify-between"><span>CON:</span> <span className="text-white">{MONSTERS[mId].con}</span></div>
                  <div className="flex justify-between"><span>DEX:</span> <span className="text-white">{MONSTERS[mId].dex}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto bg-slate-900 min-h-screen text-white">
      <div className="flex justify-between items-center mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-amber-500">隊伍管理</h2>
        <div className="flex gap-2 md:gap-4">
          <button onClick={onBack} className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-600 rounded hover:bg-gray-500 text-sm md:text-base">返回</button>
          <button onClick={handleCreate} className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 rounded hover:bg-blue-500 font-bold text-sm md:text-base">新增</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {teams.map(team => (
          <div 
            key={team.id} 
            className={`bg-slate-800 p-4 md:p-6 rounded-2xl border-2 transition-colors ${
              currentTeamId === team.id ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl md:text-2xl font-bold text-blue-400">{team.name}</h3>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(team)} className="px-3 py-1 bg-slate-700 rounded text-sm hover:bg-slate-600">編輯</button>
                {teams.length > 1 && (
                  <button onClick={() => deleteTeam(team.id)} className="px-3 py-1 bg-red-900/50 text-red-400 rounded text-sm hover:bg-red-800/50">刪除</button>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">怪獸陣容</div>
              <div className="flex gap-2">
                {team.monsters.map((mId, i) => (
                  <div key={i} className="px-3 py-1 bg-slate-900 rounded-full text-sm border border-slate-700">
                    {MONSTERS[mId].name}
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setCurrentTeamId(team.id)}
              className={`w-full py-3 rounded-xl font-bold transition-colors ${
                currentTeamId === team.id ? 'bg-amber-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              {currentTeamId === team.id ? '目前使用中' : '設為出戰隊伍'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
