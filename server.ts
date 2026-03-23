import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GameState, PlayerState, DiceFace, TeamConfig, BattleMonsterState } from './src/shared/types.js';
import { MONSTERS, SKILLS } from './src/shared/gameData.js';
import { checkSkillConditions, applySkillEffect } from './src/shared/gameLogic.js';

const app = express();
const PORT = 3000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// In-memory state
const rooms: Record<string, GameState> = {};
const waitingPlayers: Socket[] = [];
const privateRooms: Record<string, Socket> = {};

interface TeamRecord {
  team: TeamConfig;
  wins: number;
  losses: number;
  winRate: number;
  playerName: string;
}
const teamRecords: Record<string, TeamRecord> = {
  'boss-1': {
    team: {
      id: 'boss-1',
      name: '烈火狂潮',
      dices: [
        { faces: [DiceFace.ATTACK, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE] },
        { faces: [DiceFace.ATTACK, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE] },
        { faces: [DiceFace.ATTACK, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE] },
        { faces: [DiceFace.ATTACK, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE] }
      ],
      monsters: ['m3', 'm3', 'm3']
    },
    wins: 150,
    losses: 10,
    winRate: 0.9375,
    playerName: '火之惡魔'
  },
  'boss-2': {
    team: {
      id: 'boss-2',
      name: '絕對防禦',
      dices: [
        { faces: [DiceFace.DEFENSE, DiceFace.DEFENSE, DiceFace.DEFENSE, DiceFace.DEFENSE, DiceFace.DEFENSE, DiceFace.DEFENSE] },
        { faces: [DiceFace.DEFENSE, DiceFace.DEFENSE, DiceFace.DEFENSE, DiceFace.DEFENSE, DiceFace.DEFENSE, DiceFace.DEFENSE] },
        { faces: [DiceFace.WATER, DiceFace.WATER, DiceFace.WATER, DiceFace.WATER, DiceFace.WATER, DiceFace.WATER] },
        { faces: [DiceFace.ATTACK, DiceFace.WATER, DiceFace.WATER, DiceFace.WATER, DiceFace.WATER, DiceFace.WATER] }
      ],
      monsters: ['m4', 'm4', 'm4']
    },
    wins: 120,
    losses: 15,
    winRate: 0.888,
    playerName: '水之守護者'
  },
  'boss-3': {
    team: {
      id: 'boss-3',
      name: '疾風連擊',
      dices: [
        { faces: [DiceFace.ATTACK, DiceFace.DODGE, DiceFace.DODGE, DiceFace.WIND, DiceFace.WIND, DiceFace.WIND] },
        { faces: [DiceFace.ATTACK, DiceFace.DODGE, DiceFace.DODGE, DiceFace.WIND, DiceFace.WIND, DiceFace.WIND] },
        { faces: [DiceFace.ATTACK, DiceFace.DODGE, DiceFace.DODGE, DiceFace.WIND, DiceFace.WIND, DiceFace.WIND] },
        { faces: [DiceFace.ATTACK, DiceFace.DODGE, DiceFace.DODGE, DiceFace.WIND, DiceFace.WIND, DiceFace.WIND] }
      ],
      monsters: ['m2', 'm2', 'm2']
    },
    wins: 100,
    losses: 20,
    winRate: 0.833,
    playerName: '風之刺客'
  }
};

function updateTeamRecord(team: TeamConfig, isWinner: boolean, playerName: string) {
  const key = team.id;
  if (!teamRecords[key]) {
    teamRecords[key] = { team, wins: 0, losses: 0, winRate: 0, playerName };
  }
  if (isWinner) teamRecords[key].wins++;
  else teamRecords[key].losses++;
  
  const total = teamRecords[key].wins + teamRecords[key].losses;
  teamRecords[key].winRate = teamRecords[key].wins / total;
}

function createBattleMonster(baseId: string): BattleMonsterState {
  const base = MONSTERS[baseId];
  return {
    id: Math.random().toString(36).substring(7),
    baseId,
    hp: base.hp,
    maxHp: base.hp,
    atk: base.str,
    def: base.con,
    spd: Math.min(50, base.dex),
    dodgeBonus: 0
  };
}

function rollDices(team: TeamConfig): DiceFace[] {
  return team.dices.map(dice => dice.faces[Math.floor(Math.random() * dice.faces.length)]);
}

function rollDicesWithGuarantee(team: TeamConfig, monsterBaseId: string): DiceFace[] {
  let dices = rollDices(team);
  let attempts = 0;
  const base = MONSTERS[monsterBaseId];
  
  while (attempts < 50) {
    const satisfied = base.skills.some(sId => checkSkillConditions(SKILLS[sId], dices));
    if (satisfied) break;
    dices = rollDices(team);
    attempts++;
  }
  return dices;
}

function startMatch(p1: Socket, p2: Socket, team1: TeamConfig, team2: TeamConfig) {
  const roomId = `room_${Math.random().toString(36).substring(7)}`;
  
  const p1Monster = createBattleMonster(team1.monsters[0]);
  const p2Monster = createBattleMonster(team2.monsters[0]);

  const state: GameState = {
    roomId,
    status: 'PLAYING',
    phase: 'WAITING_FOR_ACTION',
    activePlayerId: p1Monster.spd >= p2Monster.spd ? p1.id : p2.id,
    turnCount: 1,
    players: {
      [p1.id]: {
        id: p1.id,
        name: 'Player 1',
        team: team1,
        currentMonsterIndex: 0,
        monster: p1Monster,
        ap: 100, // In turn-based, we start with full AP or treat it as per-turn
        rolledDices: rollDicesWithGuarantee(team1, team1.monsters[0]),
        isAuto: false, // Default to manual for players
        connected: true
      },
      [p2.id]: {
        id: p2.id,
        name: 'Player 2',
        team: team2,
        currentMonsterIndex: 0,
        monster: p2Monster,
        ap: 100,
        rolledDices: rollDicesWithGuarantee(team2, team2.monsters[0]),
        isAuto: false,
        connected: true
      }
    },
    logs: ['戰鬥開始！'],
    winnerId: null
  };

  rooms[roomId] = state;
  p1.join(roomId);
  p2.join(roomId);
  
  io.to(roomId).emit('gameStart', state);

  // Initial check for auto
  processAutoTurn(state);
}

function processAutoTurn(state: GameState) {
  if (state.status !== 'PLAYING' || state.phase !== 'WAITING_FOR_ACTION') return;

  const activeId = state.activePlayerId;
  if (!activeId) return;

  const p = state.players[activeId];
  if (p.isAuto || activeId.startsWith('ai_') || activeId.startsWith('boss_')) {
    setTimeout(() => {
      const base = MONSTERS[p.monster.baseId];
      const satisfiedSkills = base.skills
        .map(sId => SKILLS[sId])
        .filter(s => checkSkillConditions(s, p.rolledDices));

      if (satisfiedSkills.length > 0) {
        const bestSkill = satisfiedSkills.reduce((prev, current) => (prev.apCost > current.apCost) ? prev : current);
        executeSkill(state, activeId, bestSkill.id);
      } else {
        // Force re-roll if no skills possible (though guarantee should prevent this)
        p.rolledDices = rollDicesWithGuarantee(p.team, p.monster.baseId);
        state.logs.push(`${p.name} 重新擲骰！`);
        nextTurn(state);
      }
      io.to(state.roomId).emit('gameStateUpdate', state);
    }, 1000);
  }
}

function nextTurn(state: GameState) {
  const playerIds = Object.keys(state.players);
  const currentIndex = playerIds.indexOf(state.activePlayerId!);
  const nextIndex = (currentIndex + 1) % playerIds.length;

  if (nextIndex === 0) {
    // Round ended
    state.turnCount++;
    state.phase = 'ROLLING';

    // New dices for everyone
    for (const id of playerIds) {
      const p = state.players[id];
      p.rolledDices = rollDicesWithGuarantee(p.team, p.monster.baseId);
      p.ap = 100; // Reset AP for turn-based
    }

    state.logs.push(`第 ${state.turnCount} 回合開始！`);

    // Determine who goes first based on current monster speed
    const p1 = state.players[playerIds[0]];
    const p2 = state.players[playerIds[1]];
    state.activePlayerId = p1.monster.spd >= p2.monster.spd ? p1.id : p2.id;
  } else {
    state.activePlayerId = playerIds[nextIndex];
  }

  state.phase = 'WAITING_FOR_ACTION';
  processAutoTurn(state);
}

function executeSkill(state: GameState, attackerId: string, skillId: string) {
  const attacker = state.players[attackerId];
  const defenderId = Object.keys(state.players).find(id => id !== attackerId)!;
  const defender = state.players[defenderId];
  const skill = SKILLS[skillId];

  attacker.ap = 0;
  
  // Continuous effects
  attacker.monster.dodgeBonus = Math.max(0, attacker.monster.dodgeBonus - 1);
  defender.monster.dodgeBonus = Math.max(0, defender.monster.dodgeBonus - 1);

  applySkillEffect(skillId, attacker, defender, state.logs);

  if (defender.monster.hp <= 0) {
    state.logs.push(`${defender.name} 的 ${MONSTERS[defender.monster.baseId].name} 倒下了！`);
    defender.currentMonsterIndex++;
    if (defender.currentMonsterIndex < defender.team.monsters.length) {
      defender.monster = createBattleMonster(defender.team.monsters[defender.currentMonsterIndex]);
      defender.ap = 0;
      defender.rolledDices = rollDicesWithGuarantee(defender.team, defender.monster.baseId);
      state.logs.push(`${defender.name} 派出了 ${MONSTERS[defender.monster.baseId].name}！`);
    } else {
      state.status = 'FINISHED';
      state.winnerId = attackerId;
      state.logs.push(`${attacker.name} 獲得了勝利！`);
      
      // Update team records
      updateTeamRecord(attacker.team, true, attacker.name);
      updateTeamRecord(defender.team, false, defender.name);
    }
  }

  if (state.status === 'PLAYING') {
    nextTurn(state);
  }
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinMatchmaking', (team: TeamConfig) => {
    (socket as any).team = team;
    waitingPlayers.push(socket);
    console.log('Player joined matchmaking:', socket.id);

    if (waitingPlayers.length >= 2) {
      const p1 = waitingPlayers.shift()!;
      const p2 = waitingPlayers.shift()!;
      startMatch(p1, p2, (p1 as any).team, (p2 as any).team);
    }
  });

  socket.on('joinPrivateRoom', ({ team, roomCode }: { team: TeamConfig, roomCode: string }) => {
    (socket as any).team = team;
    console.log(`Player ${socket.id} joining private room: ${roomCode}`);

    if (privateRooms[roomCode]) {
      // Room exists, join and start match
      const p1 = privateRooms[roomCode];
      const p2 = socket;
      delete privateRooms[roomCode]; // Remove from waiting list
      startMatch(p1, p2, (p1 as any).team, (p2 as any).team);
    } else {
      // Room doesn't exist, create and wait
      privateRooms[roomCode] = socket;
    }
  });

  socket.on('startPvE', (team: TeamConfig) => {
    // Create a dummy socket for the AI
    const aiId = `ai_${Math.random().toString(36).substring(7)}`;
    const aiTeam = {
      id: 'ai-team',
      name: '電腦對手',
      dices: [
        { faces: [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.EARTH, DiceFace.WATER, DiceFace.FIRE] },
        { faces: [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.WIND, DiceFace.EARTH, DiceFace.WATER] },
        { faces: [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.FIRE, DiceFace.WIND, DiceFace.EMPTY] },
        { faces: [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.EARTH, DiceFace.WATER, DiceFace.FIRE] }
      ],
      monsters: ['m1', 'm2', 'm3']
    };

    const roomId = `room_${Math.random().toString(36).substring(7)}`;
    const p1Monster = createBattleMonster(team.monsters[0]);
    const aiMonster = createBattleMonster(aiTeam.monsters[0]);

    const state: GameState = {
      roomId,
      status: 'PLAYING',
      phase: 'WAITING_FOR_ACTION',
      activePlayerId: p1Monster.spd >= aiMonster.spd ? socket.id : aiId,
      turnCount: 1,
      players: {
        [socket.id]: {
          id: socket.id,
          name: 'Player 1',
          team: team,
          currentMonsterIndex: 0,
          monster: p1Monster,
          ap: 100,
          rolledDices: rollDicesWithGuarantee(team, team.monsters[0]),
          isAuto: false,
          connected: true
        },
        [aiId]: {
          id: aiId,
          name: '電腦',
          team: aiTeam,
          currentMonsterIndex: 0,
          monster: aiMonster,
          ap: 100,
          rolledDices: rollDicesWithGuarantee(aiTeam, aiTeam.monsters[0]),
          isAuto: true, // AI is always auto
          connected: true
        }
      },
      logs: ['戰鬥開始！'],
      winnerId: null
    };

    rooms[roomId] = state;
    socket.join(roomId);
    
    io.to(roomId).emit('gameStart', state);
    processAutoTurn(state);
  });

  socket.on('getTopBosses', (callback: (bosses: TeamRecord[]) => void) => {
    const topBosses = Object.values(teamRecords)
      .filter(record => record.wins + record.losses >= 5) // Minimum 5 matches to qualify
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 10);
    
    // If not enough qualified, just return the defaults
    if (topBosses.length === 0) {
      callback(Object.values(teamRecords).slice(0, 10));
    } else {
      callback(topBosses);
    }
  });

  socket.on('startBossBattle', ({ team, bossTeam }: { team: TeamConfig, bossTeam: TeamConfig }) => {
    const aiId = `boss_${Math.random().toString(36).substring(7)}`;
    const roomId = `room_${Math.random().toString(36).substring(7)}`;
    const p1Monster = createBattleMonster(team.monsters[0]);
    const bossMonster = createBattleMonster(bossTeam.monsters[0]);

    const state: GameState = {
      roomId,
      status: 'PLAYING',
      phase: 'WAITING_FOR_ACTION',
      activePlayerId: p1Monster.spd >= bossMonster.spd ? socket.id : aiId,
      turnCount: 1,
      players: {
        [socket.id]: {
          id: socket.id,
          name: 'Player 1',
          team: team,
          currentMonsterIndex: 0,
          monster: p1Monster,
          ap: 100,
          rolledDices: rollDicesWithGuarantee(team, team.monsters[0]),
          isAuto: false,
          connected: true
        },
        [aiId]: {
          id: aiId,
          name: `BOSS: ${bossTeam.name}`,
          team: bossTeam,
          currentMonsterIndex: 0,
          monster: bossMonster,
          ap: 100,
          rolledDices: rollDicesWithGuarantee(bossTeam, bossTeam.monsters[0]),
          isAuto: true,
          connected: true
        }
      },
      logs: ['挑戰 BOSS 戰鬥開始！'],
      winnerId: null
    };

    rooms[roomId] = state;
    socket.join(roomId);
    
    io.to(roomId).emit('gameStart', state);
    processAutoTurn(state);
  });

  socket.on('executeSkill', (skillId: string) => {
    const roomId = Array.from(socket.rooms).find(r => r.startsWith('room_'));
    if (!roomId) return;
    const state = rooms[roomId];
    if (!state || state.status !== 'PLAYING' || state.activePlayerId !== socket.id) return;

    const player = state.players[socket.id];
    const skill = SKILLS[skillId];
    if (player && skill && player.ap >= skill.apCost && checkSkillConditions(skill, player.rolledDices)) {
      executeSkill(state, socket.id, skillId);
      io.to(roomId).emit('gameStateUpdate', state);
    }
  });

  socket.on('giveUp', () => {
    const roomId = Array.from(socket.rooms).find(r => r.startsWith('room_'));
    if (!roomId) return;
    const state = rooms[roomId];
    if (!state || state.status !== 'PLAYING' || state.activePlayerId !== socket.id) return;

    const player = state.players[socket.id];
    player.rolledDices = rollDicesWithGuarantee(player.team, player.monster.baseId);
    state.logs.push(`${player.name} 放棄行動並重新擲骰！`);
    nextTurn(state);
    io.to(roomId).emit('gameStateUpdate', state);
  });

  socket.on('toggleAuto', () => {
    const roomId = Array.from(socket.rooms).find(r => r.startsWith('room_'));
    if (!roomId) return;
    const state = rooms[roomId];
    if (!state || state.status !== 'PLAYING') return;

    const player = state.players[socket.id];
    if (player) {
      player.isAuto = !player.isAuto;
      if (player.isAuto && state.activePlayerId === socket.id) {
        processAutoTurn(state);
      }
      io.to(roomId).emit('gameStateUpdate', state);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const index = waitingPlayers.findIndex(p => p.id === socket.id);
    if (index !== -1) {
      waitingPlayers.splice(index, 1);
    }

    // Remove from private rooms if waiting
    for (const roomCode in privateRooms) {
      if (privateRooms[roomCode].id === socket.id) {
        delete privateRooms[roomCode];
      }
    }
    
    // Handle disconnect during game
    for (const roomId in rooms) {
      const state = rooms[roomId];
      if (state.players[socket.id] && state.status === 'PLAYING') {
        state.players[socket.id].connected = false;
        state.status = 'FINISHED';
        const winnerId = Object.keys(state.players).find(id => id !== socket.id) || null;
        state.winnerId = winnerId;
        state.logs.push(`${state.players[socket.id].name} 斷線，遊戲結束。`);
        
        if (winnerId) {
          const winner = state.players[winnerId];
          const loser = state.players[socket.id];
          updateTeamRecord(winner.team, true, winner.name);
          updateTeamRecord(loser.team, false, loser.name);
        }
        
        io.to(roomId).emit('gameStateUpdate', state);
      }
    }
  });
});

async function startServer() {
  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
