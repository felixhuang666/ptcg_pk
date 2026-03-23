import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { GameState, PlayerState, DiceFace, TeamConfig, BattleMonsterState } from './src/shared/types.js';
import { MONSTERS, SKILLS, SETTINGS } from './src/shared/gameData.js';
import { checkSkillConditions, applySkillEffect } from './src/shared/gameLogic.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPERBASE_API_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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

async function updateTeamRecord(team: TeamConfig, isWinner: boolean, playerName: string) {
  try {
    const key = team.id;
    // Local cache update
    if (!teamRecords[key]) {
      teamRecords[key] = { team, wins: 0, losses: 0, winRate: 0, playerName };
    }
    if (isWinner) teamRecords[key].wins++;
    else teamRecords[key].losses++;

    const total = teamRecords[key].wins + teamRecords[key].losses;
    teamRecords[key].winRate = teamRecords[key].wins / total;

    // Supabase update
    if (supabase) {
      const { data: existing, error: fetchErr } = await supabase
        .from('team_records')
        .select('*')
        .eq('id', key)
        .single();

      if (fetchErr && fetchErr.code !== 'PGRST116') { // PGRST116 is not found
        console.error('Error fetching team_record:', fetchErr);
      }

      let wins = existing ? existing.wins : 0;
      let losses = existing ? existing.losses : 0;

      if (isWinner) wins++;
      else losses++;

      const newTotal = wins + losses;
      const winRate = newTotal > 0 ? wins / newTotal : 0;

      const { error: upsertErr } = await supabase
        .from('team_records')
        .upsert({
          id: key,
          team: team,
          wins,
          losses,
          win_rate: winRate,
          player_name: playerName
        });

      if (upsertErr) {
        console.error('Error upserting team_record:', upsertErr);
      }
    }
  } catch (err) {
    console.error('Failed to update team record:', err);
  }
}

function createBattleMonster(baseId: string): BattleMonsterState {
  const base = MONSTERS[baseId];
  return {
    id: Math.random().toString(36).substring(7),
    baseId,
    hp: base.hp,
    maxHp: base.hp,
    atk: base.str,
    def: Math.min(100, base.con),
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
  
  const state: GameState = {
    roomId,
    status: 'PLAYING',
    isPaused: false,
    players: {
      [p1.id]: {
        id: p1.id,
        name: 'Player 1',
        team: team1,
        currentMonsterIndex: 0,
        monster: createBattleMonster(team1.monsters[0]),
        ap: 0,
        rolledDices: rollDicesWithGuarantee(team1, team1.monsters[0]),
        isAuto: true,
        connected: true
      },
      [p2.id]: {
        id: p2.id,
        name: 'Player 2',
        team: team2,
        currentMonsterIndex: 0,
        monster: createBattleMonster(team2.monsters[0]),
        ap: 0,
        rolledDices: rollDicesWithGuarantee(team2, team2.monsters[0]),
        isAuto: true,
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
}

// Game Loop
let gameLoopInterval: NodeJS.Timeout | null = null;

function startGameLoop() {
  if (gameLoopInterval) clearInterval(gameLoopInterval);
  const tickMs = 10000 / SETTINGS.gameTick;
  
  gameLoopInterval = setInterval(() => {
    for (const roomId in rooms) {
      const state = rooms[roomId];
      if (state.status !== 'PLAYING' || state.isPaused) continue;

      let stateChanged = false;

      // Increase AP
      for (const playerId in state.players) {
        const p = state.players[playerId];
        if (p.ap < 100) {
          p.ap = Math.min(100, p.ap + p.monster.spd);
          stateChanged = true;
        }

        // Auto execution
        if (p.isAuto) {
          const base = MONSTERS[p.monster.baseId];
          const satisfiedSkills = base.skills
            .map(sId => SKILLS[sId])
            .filter(s => checkSkillConditions(s, p.rolledDices));
          
          if (satisfiedSkills.length > 0) {
            // Find highest AP skill
            const bestSkill = satisfiedSkills.reduce((prev, current) => (prev.apCost > current.apCost) ? prev : current);
            if (p.ap >= bestSkill.apCost) {
              executeSkill(state, playerId, bestSkill.id);
              stateChanged = true;
            }
          } else if (p.ap >= 30) {
            // Give up if no skills satisfied
            p.ap -= 30;
            p.rolledDices = rollDicesWithGuarantee(p.team, p.monster.baseId);
            state.logs.push(`${p.name} 放棄回合並重新擲骰！`);
            stateChanged = true;
          }
        }
      }

      if (stateChanged) {
        io.to(roomId).emit('gameStateUpdate', state);
      }
    }
  }, tickMs);
}

startGameLoop();

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
    attacker.rolledDices = rollDicesWithGuarantee(attacker.team, attacker.monster.baseId);
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
    
    const state: GameState = {
      roomId,
      status: 'PLAYING',
      isPaused: false,
      players: {
        [socket.id]: {
          id: socket.id,
          name: 'Player 1',
          team: team,
          currentMonsterIndex: 0,
          monster: createBattleMonster(team.monsters[0]),
          ap: 0,
          rolledDices: rollDicesWithGuarantee(team, team.monsters[0]),
          isAuto: true,
          connected: true
        },
        [aiId]: {
          id: aiId,
          name: '電腦',
          team: aiTeam,
          currentMonsterIndex: 0,
          monster: createBattleMonster(aiTeam.monsters[0]),
          ap: 0,
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
  });

  socket.on('getGameData', (callback: (data: any) => void) => {
    callback({ MONSTERS, SKILLS, SETTINGS });
  });

  socket.on('updateGameData', async (data: { MONSTERS: any, SKILLS: any, SETTINGS?: any }) => {
    // Modify the imported objects in place
    Object.keys(MONSTERS).forEach(k => delete MONSTERS[k]);
    Object.assign(MONSTERS, data.MONSTERS);
    
    Object.keys(SKILLS).forEach(k => delete SKILLS[k]);
    Object.assign(SKILLS, data.SKILLS);
    
    if (data.SETTINGS) {
      Object.assign(SETTINGS, data.SETTINGS);
      // Restart game loop with new tick rate if it changed
      startGameLoop();
    }
    
    if (supabase) {
      const { error } = await supabase.from('game_data').upsert({
        id: 'default',
        monsters: MONSTERS,
        skills: SKILLS,
        settings: SETTINGS
      });
      if (error) {
        console.error('Failed to save game data to Supabase:', error);
      } else {
        console.log('Successfully saved game data to Supabase');
      }
    }

    try {
      const gameDataPath = path.join(process.cwd(), 'src', 'shared', 'gameData.ts');
      const fileContent = `import { ElementType, DiceFace, MonsterBase, SkillBase, GameSettings } from './types.js';

export const DICE_COSTS: Record<DiceFace, number> = {
  [DiceFace.ATTACK]: 5,
  [DiceFace.DEFENSE]: 1,
  [DiceFace.DODGE]: 1,
  [DiceFace.EARTH]: 1,
  [DiceFace.WATER]: 1,
  [DiceFace.FIRE]: 1,
  [DiceFace.WIND]: 1,
  [DiceFace.EARTH_FIRE]: 2,
  [DiceFace.WATER_WIND]: 2,
  [DiceFace.EMPTY]: 0,
};

export const SETTINGS: GameSettings = ${JSON.stringify(SETTINGS, null, 2)};

export const MONSTERS: Record<string, MonsterBase> = ${JSON.stringify(MONSTERS, null, 2)} as any;

export const SKILLS: Record<string, SkillBase> = ${JSON.stringify(SKILLS, null, 2)} as any;
`;
      fs.writeFileSync(gameDataPath, fileContent, 'utf-8');
      console.log('Successfully saved game data to gameData.ts');
    } catch (err) {
      console.error('Failed to save game data locally:', err);
    }

    // Broadcast to all clients
    io.emit('gameDataUpdated', { MONSTERS, SKILLS, SETTINGS });
  });

  socket.on('getTopBosses', async (callback: (bosses: TeamRecord[]) => void) => {
    try {
      if (supabase) {
        // Fetch more rows to filter by matches >= 5 locally, since Supabase REST API doesn't support derived column filtering easily without a view
        const { data, error } = await supabase
          .from('team_records')
          .select('*')
          .order('win_rate', { ascending: false })
          .limit(100);

        if (!error && data && data.length > 0) {
          const qualifiedBosses = data.filter((row: any) => row.wins + row.losses >= 5);
          const topBosses = qualifiedBosses.slice(0, 10);

          if (topBosses.length > 0) {
            const mappedBosses = topBosses.map((row: any) => ({
              team: row.team,
              wins: row.wins,
              losses: row.losses,
              winRate: row.win_rate,
              playerName: row.player_name
            }));
            return callback(mappedBosses);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch bosses from Supabase:', err);
    }

    // Fallback to local cache if no Supabase data or error
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
    
    const state: GameState = {
      roomId,
      status: 'PLAYING',
      isPaused: false,
      players: {
        [socket.id]: {
          id: socket.id,
          name: 'Player 1',
          team: team,
          currentMonsterIndex: 0,
          monster: createBattleMonster(team.monsters[0]),
          ap: 0,
          rolledDices: rollDicesWithGuarantee(team, team.monsters[0]),
          isAuto: true,
          connected: true
        },
        [aiId]: {
          id: aiId,
          name: `BOSS: ${bossTeam.name}`,
          team: bossTeam,
          currentMonsterIndex: 0,
          monster: createBattleMonster(bossTeam.monsters[0]),
          ap: 0,
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
  });

  socket.on('executeSkill', (skillId: string) => {
    const roomId = Array.from(socket.rooms).find(r => r.startsWith('room_'));
    if (!roomId) return;
    const state = rooms[roomId];
    if (!state || state.status !== 'PLAYING') return;

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
    if (!state || state.status !== 'PLAYING') return;

    const player = state.players[socket.id];
    if (player && player.ap >= 30) {
      player.ap -= 30;
      player.rolledDices = rollDicesWithGuarantee(player.team, player.monster.baseId);
      state.logs.push(`${player.name} 放棄回合並重新擲骰！`);
      io.to(roomId).emit('gameStateUpdate', state);
    }
  });

  socket.on('toggleAuto', () => {
    const roomId = Array.from(socket.rooms).find(r => r.startsWith('room_'));
    if (!roomId) return;
    const state = rooms[roomId];
    if (!state || state.status !== 'PLAYING') return;

    const player = state.players[socket.id];
    if (player) {
      player.isAuto = !player.isAuto;
      io.to(roomId).emit('gameStateUpdate', state);
    }
  });

  socket.on('togglePause', () => {
    const roomId = Array.from(socket.rooms).find(r => r.startsWith('room_'));
    if (!roomId) return;
    const state = rooms[roomId];
    if (!state || state.status !== 'PLAYING' || !SETTINGS.engineeringMode) return;

    state.isPaused = !state.isPaused;
    const msg = `[工程模式] 遊戲已${state.isPaused ? '暫停' : '恢復'}！`;
    state.logs.push(msg);
    if (SETTINGS.engineeringMode) console.log(msg);
    io.to(roomId).emit('gameStateUpdate', state);
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
  if (supabase) {
    try {
      const { data, error } = await supabase.from('game_data').select('*').eq('id', 'default').single();
      if (!error && data) {
        if (data.monsters) {
          Object.keys(MONSTERS).forEach(k => delete MONSTERS[k]);
          Object.assign(MONSTERS, data.monsters);
        }
        if (data.skills) {
          Object.keys(SKILLS).forEach(k => delete SKILLS[k]);
          Object.assign(SKILLS, data.skills);
        }
        if (data.settings) {
          Object.assign(SETTINGS, data.settings);
          startGameLoop(); // restart loop with new tick
        }
        console.log('Successfully loaded game data from Supabase');
      }
    } catch (err) {
      console.error('Failed to load game data from Supabase:', err);
    }
  }

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
