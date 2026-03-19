import React, { useEffect, useState } from 'react';
import { TeamConfig } from '../shared/types';
import { MONSTERS, SKILLS } from '../shared/gameData';
import { io } from 'socket.io-client';

interface TeamRecord {
  team: TeamConfig;
  wins: number;
  losses: number;
  winRate: number;
  playerName: string;
}

export default function BossSelect({ onBack, onStartBattle }: { onBack: () => void, onStartBattle: (bossTeam: TeamConfig) => void }) {
  const [bosses, setBosses] = useState<TeamRecord[]>([]);
  const [selectedBoss, setSelectedBoss] = useState<TeamRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const socket = io();
    socket.emit('getTopBosses', (data: TeamRecord[]) => {
      setBosses(data);
      if (data.length > 0) setSelectedBoss(data[0]);
      setLoading(false);
      socket.disconnect();
    });
    return () => { socket.disconnect(); };
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">載入中...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto bg-slate-900 min-h-screen text-white">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-amber-500">挑戰 BOSS (前十名玩家隊伍)</h2>
        <button onClick={onBack} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500">返回主選單</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Boss List */}
        <div className="col-span-1 bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h3 className="text-xl font-bold mb-4 text-blue-400 border-b border-slate-700 pb-2">選擇 BOSS</h3>
          <div className="space-y-2">
            {bosses.map((boss, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedBoss(boss)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${selectedBoss === boss ? 'bg-blue-900/50 border-blue-500' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}
              >
                <div className="font-bold text-lg">{boss.team.name}</div>
                <div className="text-sm text-gray-400">玩家: {boss.playerName}</div>
                <div className="text-sm text-amber-400 mt-1">
                  勝率: {(boss.winRate * 100).toFixed(1)}% ({boss.wins}勝 {boss.losses}敗)
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Boss Details */}
        {selectedBoss && (
          <div className="col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-red-400">{selectedBoss.team.name}</h3>
                <p className="text-gray-400">玩家: {selectedBoss.playerName}</p>
              </div>
              <button 
                onClick={() => onStartBattle(selectedBoss.team)}
                className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl font-bold text-xl shadow-lg shadow-red-900/50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                開始挑戰
              </button>
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-bold mb-3 text-blue-300">出戰怪獸</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedBoss.team.monsters.map((mId, idx) => {
                  const monster = MONSTERS[mId];
                  return (
                    <div key={idx} className="bg-slate-700 p-3 rounded-lg border border-slate-600">
                      <div className="font-bold text-lg mb-1">{monster.name} ({monster.type})</div>
                      <div className="text-xs text-gray-400 mb-2">HP: {monster.hp} | ATK: {monster.str} | DEF: {monster.con} | SPD: {monster.dex}</div>
                      <div className="space-y-1">
                        {monster.skills.map(sId => {
                          const skill = SKILLS[sId];
                          return (
                            <div key={sId} className="text-xs bg-slate-800 p-1.5 rounded">
                              <span className="font-bold text-amber-400">{skill.name}</span> ({skill.apCost}AP)
                              <div className="text-gray-400 mt-0.5">{skill.description}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-3 text-blue-300">召喚師骰子</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {selectedBoss.team.dices.map((dice, idx) => (
                  <div key={idx} className="bg-slate-700 p-3 rounded-lg border border-slate-600 text-center">
                    <div className="font-bold text-sm mb-2 text-gray-300">骰子 {idx + 1}</div>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {dice.faces.map((face, fIdx) => (
                        <span key={fIdx} className="text-xs bg-slate-800 px-1.5 py-0.5 rounded border border-slate-600">
                          {face}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
