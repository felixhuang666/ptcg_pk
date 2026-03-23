import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, PlayerState, SkillBase, TeamConfig, ElementType } from '../shared/types';
import { MONSTERS, SKILLS } from '../shared/gameData';
import { checkSkillConditions } from '../shared/gameLogic';

const MonsterIcon = ({ type, className }: { type: ElementType, className?: string }) => {
  switch (type) {
    case ElementType.FIRE:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.434-4.5 0-6 0 0-1 1-1 2.5 0 .644.105 1.233.232 1.796A5 5 0 1 1 8.5 14.5z" />
          <path d="M12 18.5c.348-.12.695-.316 1.042-.587A5 5 0 0 0 16 13c0-1.38-.5-2-1-3-1.072-2.143-.434-4.5 0-6 0 0-1 1-1 2.5 0 .644.105 1.233.232 1.796A5 5 0 0 1 12 18.5z" />
        </svg>
      );
    case ElementType.WATER:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      );
    case ElementType.WIND:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
          <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
          <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
        </svg>
      );
    case ElementType.EARTH:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 10h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2z" />
          <path d="M15.5 14h.5a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-.5" />
          <path d="M8.5 14h-.5a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-.5" />
          <path d="M10 6h4l.5 4h-5z" />
        </svg>
      );
    default:
      return <div className={className}>❓</div>;
  }
};

interface DamageNumberProps {
  value: number;
  isCritical: boolean;
}

const DamageNumber: React.FC<DamageNumberProps> = ({ value, isCritical }) => (
  <motion.div
    initial={{ opacity: 0, y: 0, scale: 0.5 }}
    animate={{ opacity: 1, y: -50, scale: isCritical ? 1.5 : 1 }}
    exit={{ opacity: 0 }}
    className={`absolute font-black text-2xl z-50 ${isCritical ? 'text-yellow-400 text-3xl' : 'text-red-500'}`}
    style={{ textShadow: '2px 2px 0 #000' }}
  >
    -{value}{isCritical && '!'}
  </motion.div>
);

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

  const [damagePopup, setDamagePopup] = useState<{ id: number, value: number, isCritical: boolean, target: 'me' | 'opponent' } | null>(null);
  const [isShaking, setIsShaking] = useState<'me' | 'opponent' | null>(null);
  const [attackerAnimating, setAttackerAnimating] = useState<'me' | 'opponent' | null>(null);

  const prevHpRef = useRef<{ me: number, opponent: number }>({ me: 0, opponent: 0 });

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
      const myId = newSocket.id;
      const opponentId = Object.keys(state.players).find(id => id !== myId)!;
      const me = state.players[myId];
      const opponent = state.players[opponentId];

      if (me && opponent) {
        // Detect Damage
        if (prevHpRef.current.me > me.monster.hp) {
          const diff = prevHpRef.current.me - me.monster.hp;
          setDamagePopup({ id: Date.now(), value: diff, isCritical: diff > 50, target: 'me' });
          setIsShaking('me');
          setTimeout(() => setIsShaking(null), 500);
        }
        if (prevHpRef.current.opponent > opponent.monster.hp) {
          const diff = prevHpRef.current.opponent - opponent.monster.hp;
          setDamagePopup({ id: Date.now(), value: diff, isCritical: diff > 50, target: 'opponent' });
          setIsShaking('opponent');
          setTimeout(() => setIsShaking(null), 500);
        }

        // Detect Attack Animation (if active player changed or log updated)
        if (state.phase === 'RESOLUTION' || (gameState && state.logs.length > gameState.logs.length)) {
          const lastLog = state.logs[state.logs.length - 1];
          if (lastLog.includes('使用了')) {
             const attackerName = lastLog.split(' ')[0];
             if (attackerName === me.name) {
               setAttackerAnimating('me');
               setTimeout(() => setAttackerAnimating(null), 600);
             } else {
               setAttackerAnimating('opponent');
               setTimeout(() => setAttackerAnimating(null), 600);
             }
          }
        }

        prevHpRef.current = { me: me.monster.hp, opponent: opponent.monster.hp };
      }

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
  const isMyTurn = gameState.activePlayerId === myId;

  const myMonsterBase = MONSTERS[me.monster.baseId];
  const oppMonsterBase = MONSTERS[opponent.monster.baseId];

  const satisfiedSkills = myMonsterBase.skills
    .map(sId => SKILLS[sId])
    .filter(s => checkSkillConditions(s, me.rolledDices));

  const oppSatisfiedSkills = oppMonsterBase.skills
    .map(sId => SKILLS[sId])
    .filter(s => checkSkillConditions(s, opponent.rolledDices));

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-500">怪獸對戰</h1>
        <button 
          onClick={() => {
            if (status === 'FINISHED') {
              onExit();
            } else {
              setShowExitConfirm(true);
            }
          }} 
          className="px-4 py-2 bg-red-600 rounded hover:bg-red-500"
        >
          離開
        </button>
      </div>

      {/* Battle Arena */}
      <div className="flex-1 flex flex-col justify-between relative">
        {/* Opponent */}
        <div className="flex flex-col items-end w-full">
          <div className="flex justify-between items-center w-full">
            <div className="flex gap-1">
              {opponent.team.monsters.map((mId, idx) => {
                const isDead = idx < opponent.currentMonsterIndex;
                const isActive = idx === opponent.currentMonsterIndex;
                return (
                  <div key={idx} className={`text-[10px] px-1.5 py-0.5 rounded ${isDead ? 'bg-red-900/50 text-gray-500 line-through' : isActive ? 'bg-red-600 text-white font-bold' : 'bg-slate-700 text-gray-300'}`}>
                    {MONSTERS[mId].name}
                  </div>
                );
              })}
            </div>
            <div className={`text-lg font-bold ${gameState.activePlayerId === opponentId ? 'text-red-400 ring-2 ring-red-500 px-2 rounded animate-pulse' : 'text-gray-400'}`}>
              {opponent.name} {gameState.activePlayerId === opponentId && '(行動中)'}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="w-64">
              <div className="flex justify-between text-sm">
                <span>{oppMonsterBase.name} ({oppMonsterBase.type})</span>
                <span>{opponent.monster.hp} / {opponent.monster.maxHp}</span>
              </div>
              <div className="h-4 bg-gray-700 rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-red-500 transition-all" 
                  style={{ width: `${Math.max(0, (opponent.monster.hp / opponent.monster.maxHp) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span>AP</span>
                <span>{Math.floor(opponent.ap)} / 100</span>
              </div>
              <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${opponent.ap}%` }} />
              </div>
              <div className="text-xs text-gray-400 mt-1">
                ATK: {opponent.monster.atk} | DEF: {Math.round(opponent.monster.def)} | SPD: {Math.round(opponent.monster.spd)}
                {opponent.monster.dodgeBonus > 0 && <span className="ml-2 text-green-400">閃避+{opponent.monster.dodgeBonus}</span>}
              </div>
            </div>
            <motion.div
              animate={{
                x: attackerAnimating === 'opponent' ? -100 : 0,
                scale: isShaking === 'opponent' ? [1, 1.2, 0.9, 1.1, 1] : 1,
                rotate: isShaking === 'opponent' ? [0, -10, 10, -10, 0] : 0
              }}
              transition={{ duration: 0.4 }}
              className={`w-24 h-24 bg-red-900/50 rounded-lg flex items-center justify-center border-2 ${gameState.activePlayerId === opponentId ? 'border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.6)]' : 'border-red-900'}`}
            >
              <MonsterIcon type={oppMonsterBase.type} className="w-16 h-16 text-red-400" />
              <AnimatePresence mode="wait">
                {damagePopup?.target === 'opponent' && (
                  <DamageNumber key={damagePopup.id} value={damagePopup.value} isCritical={damagePopup.isCritical} />
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="flex gap-2 mt-2 items-center">
            <div className="px-2 py-1 bg-slate-700 rounded text-xs">骰子:</div>
            {opponent.rolledDices.map((d, i) => (
              <div key={i} className="w-6 h-6 bg-slate-600 rounded flex items-center justify-center font-bold text-amber-400 text-xs">
                {d}
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-2">
            {oppMonsterBase.skills.map(sId => {
              const skill = SKILLS[sId];
              const isSatisfied = oppSatisfiedSkills.some(s => s.id === sId);
              const canAfford = opponent.ap >= skill.apCost;
              
              let badgeClass = 'px-2 py-1 rounded text-xs border transition-all ';
              if (!isSatisfied) {
                badgeClass += 'border-gray-600 bg-gray-800 text-gray-500';
              } else if (isSatisfied && !canAfford) {
                badgeClass += 'border-amber-500 bg-amber-900/40 text-amber-200';
              } else if (isSatisfied && canAfford) {
                badgeClass += 'border-red-400 bg-red-600/40 text-red-100 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]';
              }
              
              return (
                <div key={sId} className={badgeClass} title={skill.description}>
                  {skill.name} ({skill.apCost} AP)
                </div>
              );
            })}
          </div>
        </div>

        {/* Logs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-black/60 rounded-lg p-4 overflow-y-auto border border-gray-700 flex flex-col-reverse">
          {gameState.logs.slice().reverse().map((log, i) => (
            <div key={i} className="text-sm mb-1">{log}</div>
          ))}
        </div>

        {/* Me */}
        <div className="flex flex-col items-start w-full">
          <div className="flex items-center gap-4 mb-2">
            <motion.div
              animate={{
                x: attackerAnimating === 'me' ? 100 : 0,
                scale: isShaking === 'me' ? [1, 1.2, 0.9, 1.1, 1] : 1,
                rotate: isShaking === 'me' ? [0, 10, -10, 10, 0] : 0
              }}
              transition={{ duration: 0.4 }}
              className={`w-24 h-24 bg-blue-900/50 rounded-lg flex items-center justify-center border-2 ${isMyTurn ? 'border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.6)]' : 'border-blue-900'}`}
            >
              <MonsterIcon type={myMonsterBase.type} className="w-16 h-16 text-blue-400" />
              <AnimatePresence mode="wait">
                {damagePopup?.target === 'me' && (
                  <DamageNumber key={damagePopup.id} value={damagePopup.value} isCritical={damagePopup.isCritical} />
                )}
              </AnimatePresence>
            </motion.div>
            <div className="w-48">
              <div className="flex justify-between text-sm">
                <span>{myMonsterBase.name} ({myMonsterBase.type})</span>
                <span>{me.monster.hp} / {me.monster.maxHp}</span>
              </div>
              <div className="h-4 bg-gray-700 rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-blue-500 transition-all" 
                  style={{ width: `${Math.max(0, (me.monster.hp / me.monster.maxHp) * 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">
                ATK: {me.monster.atk} | DEF: {Math.round(me.monster.def)} | SPD: {Math.round(me.monster.spd)}
                {me.monster.dodgeBonus > 0 && <span className="ml-2 text-green-400">閃避+{me.monster.dodgeBonus}</span>}
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center w-full mt-2">
            <div className={`text-lg font-bold ${isMyTurn ? 'text-blue-400 ring-2 ring-blue-500 px-2 rounded animate-pulse' : 'text-gray-400'}`}>
              {me.name} {isMyTurn && '(你的回合)'}
            </div>
            <div className="flex gap-1">
              {me.team.monsters.map((mId, idx) => {
                const isDead = idx < me.currentMonsterIndex;
                const isActive = idx === me.currentMonsterIndex;
                return (
                  <div key={idx} className={`text-[10px] px-1.5 py-0.5 rounded ${isDead ? 'bg-red-900/50 text-gray-500 line-through' : isActive ? 'bg-blue-600 text-white font-bold' : 'bg-slate-700 text-gray-300'}`}>
                    {MONSTERS[mId].name}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="h-64 bg-slate-800 rounded-t-2xl p-4 mt-4 border-t-4 border-slate-700">
        <div className="flex justify-between mb-4">
          <div className="flex gap-2">
            <div className="px-3 py-1 bg-slate-700 rounded text-sm">骰子結果:</div>
            {me.rolledDices.map((d, i) => (
              <div key={i} className="w-8 h-8 bg-slate-600 rounded flex items-center justify-center font-bold text-amber-400">
                {d}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="w-48">
              <div className="flex justify-between text-xs mb-1">
                <span>AP</span>
                <span>{Math.floor(me.ap)} / 100</span>
              </div>
              <div className="h-3 bg-gray-900 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${me.ap}%` }} />
              </div>
            </div>
            <button 
              onClick={() => socket.emit('toggleAuto')}
              className={`px-4 py-2 rounded font-bold ${me.isAuto ? 'bg-green-600' : 'bg-gray-600'}`}
            >
              自動戰鬥
            </button>
            <button 
              onClick={() => socket.emit('giveUp')}
              disabled={!isMyTurn || status === 'FINISHED' || me.isAuto}
              className="px-4 py-2 bg-red-600 rounded font-bold disabled:opacity-50"
            >
              重新擲骰
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
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
              buttonClass += 'border-blue-400 bg-blue-600/40 animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.6)] opacity-100 hover:bg-blue-500/60 hover:scale-[1.02]';
            }
            
            return (
              <button
                key={sId}
                onClick={() => socket.emit('executeSkill', sId)}
                disabled={!isMyTurn || !isSatisfied || !canAfford || status === 'FINISHED' || me.isAuto}
                className={buttonClass}
              >
                <div className="flex justify-between font-bold text-lg mb-1">
                  <span className={isSatisfied && canAfford ? 'text-white' : ''}>{skill.name}</span>
                  <span className={canAfford ? 'text-amber-400' : 'text-red-400'}>{skill.apCost} AP</span>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  條件: {Object.entries(skill.conditions).map(([f, c]) => `${f}x${c}`).join(', ')}
                </div>
                <div className={`text-sm ${isSatisfied && canAfford ? 'text-blue-100' : 'text-blue-200'}`}>
                  {skill.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {status === 'FINISHED' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <h2 className="text-6xl font-bold mb-8 text-amber-500">
              {gameState.winnerId === myId ? '勝利！' : '敗北...'}
            </h2>
            <button onClick={onExit} className="px-8 py-4 bg-blue-600 text-xl rounded-xl hover:bg-blue-500 font-bold">
              返回主選單
            </button>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold text-white mb-4">確定要離開嗎？</h2>
            <p className="text-gray-300 mb-8">戰鬥尚未結束，現在離開將會被判定為敗北。</p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => setShowExitConfirm(false)} 
                className="px-6 py-2 bg-slate-600 rounded hover:bg-slate-500 font-bold"
              >
                取消
              </button>
              <button 
                onClick={onExit} 
                className="px-6 py-2 bg-red-600 rounded hover:bg-red-500 font-bold"
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
