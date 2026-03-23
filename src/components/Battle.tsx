import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, PlayerState, SkillBase, TeamConfig } from '../shared/types';
import { MONSTERS, SKILLS } from '../shared/gameData';
import { checkSkillConditions } from '../shared/gameLogic';
import { motion, AnimatePresence } from 'framer-motion';

interface BattleProps {
  team: TeamConfig;
  mode: 'PVP' | 'PVE' | 'PRIVATE' | 'BOSS';
  roomCode?: string;
  bossTeam?: TeamConfig;
  onExit: () => void;
}

export default function Battle({ team, mode, roomCode, bossTeam, onExit }: BattleProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<'CONNECTING' | 'MATCHMAKING' | 'PLAYING' | 'FINISHED'>('CONNECTING');
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [damageNumbers, setDamageNumbers] = useState<{ id: number, value: number | string, x: number, y: number, color: string }[]>([]);
  const prevHpRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      if (mode === 'PVP') {
        setStatus('MATCHMAKING');
        newSocket.emit('joinMatchmaking', team);
      } else if (mode === 'PRIVATE' && roomCode) {
        setStatus('MATCHMAKING');
        newSocket.emit('joinPrivateRoom', { team, roomCode });
      } else if (mode === 'BOSS' && bossTeam) {
        setStatus('PLAYING');
        newSocket.emit('startBossBattle', { team, bossTeam });
      } else {
        setStatus('PLAYING');
        newSocket.emit('startPvE', team);
      }
    });

    newSocket.on('gameStart', (state: GameState) => {
      setGameState(state);
      setStatus('PLAYING');
    });

    newSocket.on('gameStateUpdate', (state: GameState) => {
      // Check for HP changes to show damage numbers
      Object.entries(state.players).forEach(([pid, player]) => {
        const prevHp = prevHpRef.current[pid];
        if (prevHp !== undefined && player.monster.hp < prevHp) {
          const diff = prevHp - player.monster.hp;
          const isMe = pid === newSocket.id;

          setDamageNumbers(prev => [...prev, {
            id: Date.now() + Math.random(),
            value: Math.round(diff * 10) / 10,
            x: isMe ? 25 : 75, // percentage
            y: isMe ? 70 : 30, // percentage
            color: 'text-red-500'
          }]);
        }
        prevHpRef.current[pid] = player.monster.hp;
      });

      setGameState(state);
      if (state.status === 'FINISHED') {
        setStatus('FINISHED');
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [team, mode]);

  if (status === 'CONNECTING') return (
    <div className="p-8 text-center text-xl flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
      <div className="mb-4">連線中...</div>
      <button onClick={onExit} className="px-6 py-2 bg-slate-700 rounded hover:bg-slate-600">取消</button>
    </div>
  );
  if (status === 'MATCHMAKING') return (
    <div className="p-8 text-center text-xl flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
      <div className="mb-4">尋找對手中...</div>
      <button onClick={onExit} className="px-6 py-2 bg-slate-700 rounded hover:bg-slate-600">取消</button>
    </div>
  );
  if (!gameState || !socket) return null;

  const myId = socket.id;
  const opponentId = Object.keys(gameState.players).find(id => id !== myId)!;
  const me = gameState.players[myId];
  const opponent = gameState.players[opponentId];

  const myMonsterBase = MONSTERS[me.monster.baseId];
  const oppMonsterBase = MONSTERS[opponent.monster.baseId];

  const satisfiedSkills = myMonsterBase.skills
    .map(sId => SKILLS[sId])
    .filter(s => checkSkillConditions(s, me.rolledDices));

  const oppSatisfiedSkills = oppMonsterBase.skills
    .map(sId => SKILLS[sId])
    .filter(s => checkSkillConditions(s, opponent.rolledDices));

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white p-2 md:p-4 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-2 md:mb-4 shrink-0">
        <h1 className="text-xl md:text-2xl font-bold text-amber-500">怪獸對戰</h1>
        <button 
          onClick={() => {
            if (status === 'FINISHED') {
              onExit();
            } else {
              setShowExitConfirm(true);
            }
          }} 
          className="px-3 py-1 md:px-4 md:py-2 bg-red-600 rounded hover:bg-red-500 text-sm md:text-base font-bold"
        >
          離開
        </button>
      </div>

      {/* Battle Arena */}
      <div className="flex-1 flex flex-col justify-between relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl min-h-0">
        {/* Arena Background - Refined Gradient and Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,#4ade80_0%,#064e3b_100%)]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: [0, 1, 0], y: -100, x: Math.random() * 200 - 100 }}
                transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 5 }}
                className="absolute left-1/2 top-1/2 w-1 h-1 bg-green-400 rounded-full"
              />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-900 to-transparent"></div>
          <div className="absolute inset-0 border-[12px] border-slate-900/40 rounded-[50%] scale-x-[2.5] scale-y-[0.6] translate-y-1/4 shadow-[0_0_50px_rgba(74,222,128,0.2)]"></div>
        </div>

        {/* Floating Damage Numbers */}
        <AnimatePresence>
          {damageNumbers.map(num => (
            <motion.div
              key={num.id}
              initial={{ opacity: 1, y: `${num.y}%`, x: `${num.x}%` }}
              animate={{ opacity: 0, y: `${num.y - 15}%` }}
              exit={{ opacity: 0 }}
              onAnimationComplete={() => setDamageNumbers(prev => prev.filter(n => n.id !== num.id))}
              className={`absolute z-40 font-black text-2xl md:text-4xl pointer-events-none drop-shadow-md ${num.color}`}
              style={{ left: `${num.x}%`, top: `${num.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              -{num.value}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Opponent */}
        <div className="flex flex-col items-end w-full p-3 md:p-6 z-10">
          <div className="flex justify-between items-center w-full">
            <div className="flex gap-0.5 md:gap-1">
              {opponent.team.monsters.map((mId, idx) => {
                const isDead = idx < opponent.currentMonsterIndex;
                const isActive = idx === opponent.currentMonsterIndex;
                return (
                  <div key={idx} className={`text-[8px] md:text-[10px] px-1 md:px-1.5 py-0.5 rounded ${isDead ? 'bg-red-900/50 text-gray-500 line-through' : isActive ? 'bg-red-600 text-white font-bold' : 'bg-slate-700 text-gray-300'}`}>
                    {MONSTERS[mId].name}
                  </div>
                );
              })}
            </div>
            <div className="text-sm md:text-lg font-bold text-red-400">{opponent.name}</div>
          </div>
          <div className="flex items-center gap-2 md:gap-4 mt-1 md:mt-2">
            <div className="w-40 md:w-64 bg-slate-900/80 p-2 md:p-3 rounded-lg border border-slate-700 backdrop-blur-sm">
              <div className="flex justify-between text-[10px] md:text-sm font-bold text-white">
                <span className="truncate">{oppMonsterBase.name} ({oppMonsterBase.type})</span>
                <span className="whitespace-nowrap">{opponent.monster.hp} / {opponent.monster.maxHp}</span>
              </div>
              <div className="h-2 md:h-4 bg-gray-800 rounded-full overflow-hidden mt-1 md:mt-2 border border-slate-700">
                <div 
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300" 
                  style={{ width: `${Math.max(0, (opponent.monster.hp / opponent.monster.maxHp) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[8px] md:text-xs mt-1 md:mt-2 text-amber-200 font-bold">
                <span>AP</span>
                <span>{Math.floor(opponent.ap)} / 100</span>
              </div>
              <div className="h-1.5 md:h-2 bg-gray-800 rounded-full overflow-hidden border border-slate-700">
                <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-100" style={{ width: `${opponent.ap}%` }} />
              </div>
              <div className="text-[8px] md:text-xs text-gray-400 mt-1 md:mt-2 font-mono">
                {Math.round(opponent.monster.atk)} | {Math.round(opponent.monster.def)} | {Math.round(opponent.monster.spd)}
                {opponent.monster.dodgeBonus > 0 && <span className="ml-1 text-green-400">+{opponent.monster.dodgeBonus}</span>}
              </div>
            </div>
            <motion.div
              animate={opponent.monster.hp < (prevHpRef.current[opponentId] || opponent.monster.hp) ? { x: [0, -10, 10, -10, 10, 0] } : {}}
              className="w-16 h-16 md:w-32 md:h-32 flex items-center justify-center relative"
            >
              {oppMonsterBase.svgPath ? (
                <img src={oppMonsterBase.svgPath} alt={oppMonsterBase.name} className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
              ) : (
                <div className="w-12 h-12 md:w-24 md:h-24 bg-red-900/50 rounded-lg flex items-center justify-center text-2xl md:text-4xl border-2 border-red-500">😈</div>
              )}
            </motion.div>
          </div>

          <div className="flex gap-1 md:gap-2 mt-2 md:mt-3 items-center bg-slate-900/80 p-1 md:p-2 rounded-lg border border-slate-700 backdrop-blur-sm">
            <div className="px-1 md:px-2 py-1 text-[8px] md:text-xs text-gray-400">骰子:</div>
            {opponent.rolledDices.map((d, i) => (
              <div key={i} className="w-4 h-4 md:w-6 md:h-6 bg-slate-800 border border-slate-600 rounded flex items-center justify-center font-bold text-amber-400 text-[8px] md:text-xs shadow-inner">
                {d}
              </div>
            ))}
          </div>

          <div className="hidden md:flex gap-2 mt-3">
            {oppMonsterBase.skills.map(sId => {
              const skill = SKILLS[sId];
              const isSatisfied = oppSatisfiedSkills.some(s => s.id === sId);
              const canAfford = opponent.ap >= skill.apCost;
              
              let badgeClass = 'px-3 py-1.5 rounded text-xs border transition-all font-bold flex items-center gap-2 ';
              if (!isSatisfied) {
                badgeClass += 'border-gray-700 bg-gray-800/80 text-gray-500';
              } else if (isSatisfied && !canAfford) {
                badgeClass += 'border-amber-700 bg-amber-900/60 text-amber-500';
              } else if (isSatisfied && canAfford) {
                badgeClass += 'border-red-500 bg-red-900/80 text-red-100 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.6)]';
              }
              
              return (
                <div key={sId} className={badgeClass} title={skill.description}>
                  {skill.svgPath && <img src={skill.svgPath} className="w-4 h-4 opacity-70" alt="" />}
                  {skill.name} ({skill.apCost} AP)
                </div>
              );
            })}
          </div>
        </div>

        {/* Logs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] md:w-[500px] h-24 md:h-48 bg-slate-900/60 rounded-xl p-2 md:p-4 overflow-y-auto border border-slate-600 flex flex-col-reverse shadow-2xl z-20 backdrop-blur-sm pointer-events-none">
          {gameState.logs.slice().reverse().map((log, i) => (
            <div key={i} className={`text-[10px] md:text-sm mb-1 md:mb-1.5 pb-1 md:pb-1.5 border-b border-slate-800/50 ${i === 0 ? 'text-white font-bold' : 'text-gray-400'}`}>{log}</div>
          ))}
        </div>

        {/* Me */}
        <div className="flex flex-col items-start w-full p-3 md:p-6 z-10">
          <div className="flex items-center gap-2 md:gap-4 mb-1 md:mb-2">
            <motion.div
              animate={me.monster.hp < (prevHpRef.current[myId] || me.monster.hp) ? { x: [0, -10, 10, -10, 10, 0] } : {}}
              className="w-16 h-16 md:w-32 md:h-32 flex items-center justify-center relative"
            >
              {myMonsterBase.svgPath ? (
                <img src={myMonsterBase.svgPath} alt={myMonsterBase.name} className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-x-[-1]" />
              ) : (
                <div className="w-12 h-12 md:w-24 md:h-24 bg-blue-900/50 rounded-lg flex items-center justify-center text-2xl md:text-4xl border-2 border-blue-500">😎</div>
              )}
            </motion.div>
            <div className="w-40 md:w-64 bg-slate-900/80 p-2 md:p-3 rounded-lg border border-slate-700 backdrop-blur-sm">
              <div className="flex justify-between text-[10px] md:text-sm font-bold text-white">
                <span className="truncate">{myMonsterBase.name} ({myMonsterBase.type})</span>
                <span className="whitespace-nowrap">{me.monster.hp} / {me.monster.maxHp}</span>
              </div>
              <div className="h-2 md:h-4 bg-gray-800 rounded-full overflow-hidden mt-1 md:mt-2 border border-slate-700">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300" 
                  style={{ width: `${Math.max(0, (me.monster.hp / me.monster.maxHp) * 100)}%` }}
                />
              </div>
              <div className="text-[8px] md:text-xs text-gray-400 mt-1 md:mt-2 font-mono">
                {Math.round(me.monster.atk)} | {Math.round(me.monster.def)} | {Math.round(me.monster.spd)}
                {me.monster.dodgeBonus > 0 && <span className="ml-1 text-green-400">+{me.monster.dodgeBonus}</span>}
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center w-full mt-1 md:mt-2">
            <div className="text-sm md:text-lg font-bold text-blue-400">{me.name}</div>
            <div className="flex gap-0.5 md:gap-1">
              {me.team.monsters.map((mId, idx) => {
                const isDead = idx < me.currentMonsterIndex;
                const isActive = idx === me.currentMonsterIndex;
                return (
                  <div key={idx} className={`text-[8px] md:text-[10px] px-1 md:px-1.5 py-0.5 rounded ${isDead ? 'bg-red-900/50 text-gray-500 line-through' : isActive ? 'bg-blue-600 text-white font-bold' : 'bg-slate-700 text-gray-300'}`}>
                    {MONSTERS[mId].name}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="h-48 md:h-64 bg-slate-800 rounded-t-2xl p-2 md:p-4 mt-2 md:mt-4 border-t-4 border-slate-700 shrink-0">
        <div className="flex flex-col md:flex-row justify-between mb-2 md:mb-4 gap-2">
          <div className="flex gap-2 items-center">
            <div className="px-2 md:px-3 py-1 bg-slate-700 rounded text-[10px] md:text-sm">骰子:</div>
            <div className="flex gap-1">
              {me.rolledDices.map((d, i) => (
                <div key={i} className="w-6 h-6 md:w-8 md:h-8 bg-slate-600 rounded flex items-center justify-center font-bold text-amber-400 text-xs md:text-base">
                  {d}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4 justify-between md:justify-end">
            <div className="flex-1 md:w-48">
              <div className="flex justify-between text-[10px] md:text-xs mb-0.5 md:mb-1">
                <span>AP</span>
                <span>{Math.floor(me.ap)} / 100</span>
              </div>
              <div className="h-2 md:h-3 bg-gray-900 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${me.ap}%` }} />
              </div>
            </div>
            <div className="flex gap-1 md:gap-2">
              <button
                onClick={() => socket.emit('toggleAuto')}
                className={`px-2 py-1 md:px-4 md:py-2 rounded font-bold text-[10px] md:text-sm ${me.isAuto ? 'bg-green-600' : 'bg-gray-600'}`}
              >
                自動
              </button>
              <button
                onClick={() => socket.emit('giveUp')}
                disabled={me.ap < 30 || status === 'FINISHED' || me.isAuto}
                className="px-2 py-1 md:px-4 md:py-2 bg-red-600 rounded font-bold text-[10px] md:text-sm disabled:opacity-50"
              >
                放棄
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 md:gap-4 overflow-y-auto max-h-[100px] md:max-h-none">
          {myMonsterBase.skills.map(sId => {
            const skill = SKILLS[sId];
            const isSatisfied = satisfiedSkills.some(s => s.id === sId);
            const canAfford = me.ap >= skill.apCost;
            
            let buttonClass = 'p-3 rounded-lg border-2 text-left transition-all duration-300 ';
            if (!isSatisfied) {
              buttonClass += 'border-gray-600 bg-gray-800 opacity-50';
            } else if (isSatisfied && !canAfford) {
              buttonClass += 'border-amber-500 bg-amber-900/40 opacity-100 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
            } else if (isSatisfied && canAfford) {
              buttonClass += 'border-blue-400 bg-blue-600/40 shadow-[0_0_20px_rgba(59,130,246,0.6)] opacity-100 hover:bg-blue-500/60 hover:scale-[1.02]';
            }
            
            return (
              <motion.button
                key={sId}
                animate={isSatisfied && canAfford ? { scale: [1, 1.05, 1], borderColor: ['#60a5fa', '#3b82f6', '#60a5fa'] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
                onClick={() => socket.emit('executeSkill', sId)}
                disabled={!isSatisfied || !canAfford || status === 'FINISHED' || me.isAuto}
                className={buttonClass}
              >
                <div className="flex justify-between font-bold text-[10px] md:text-lg mb-0.5 md:mb-1">
                  <span className={`${isSatisfied && canAfford ? 'text-white' : ''} truncate`}>{skill.name}</span>
                  <span className={`${canAfford ? 'text-amber-400' : 'text-red-400'} shrink-0 ml-1`}>{skill.apCost}A</span>
                </div>
                <div className="hidden md:block text-xs text-gray-400 mb-2">
                  條件: {Object.entries(skill.conditions).map(([f, c]) => `${f}x${c}`).join(', ')}
                </div>
                <div className={`text-[8px] md:text-sm leading-tight line-clamp-2 md:line-clamp-none ${isSatisfied && canAfford ? 'text-blue-100' : 'text-blue-200'}`}>
                  {skill.description}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
      
      {status === 'FINISHED' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-4 md:mb-8 text-amber-500">
              {gameState.winnerId === myId ? '勝利！' : '敗北...'}
            </h2>
            <button onClick={onExit} className="px-6 py-3 md:px-8 md:py-4 bg-blue-600 text-lg md:text-xl rounded-xl hover:bg-blue-500 font-bold">
              返回主選單
            </button>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 md:p-8 rounded-xl border border-slate-700 max-w-sm w-[90%] md:w-full text-center">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4">確定要離開嗎？</h2>
            <p className="text-sm md:text-base text-gray-300 mb-6 md:mb-8">戰鬥尚未結束，現在離開將會被判定為敗北。</p>
            <div className="flex gap-2 md:gap-4 justify-center">
              <button 
                onClick={() => setShowExitConfirm(false)} 
                className="flex-1 px-4 py-2 bg-slate-600 rounded hover:bg-slate-500 font-bold text-sm md:text-base"
              >
                取消
              </button>
              <button 
                onClick={onExit} 
                className="flex-1 px-4 py-2 bg-red-600 rounded hover:bg-red-500 font-bold text-sm md:text-base"
              >
                確定離開
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
