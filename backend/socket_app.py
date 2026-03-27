import asyncio
import socketio
import random
import uuid
import os
import json
from typing import Dict, List, Optional, Any

from .game.types import GameState, PlayerState, DiceFace, TeamConfig, BattleMonsterState, ElementType
from .game.data import MONSTERS, SKILLS, SETTINGS
from .game.logic import check_skill_conditions, apply_skill_effect, roll_dices

# Create a python-socketio Server instance
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# In-memory state
rooms: Dict[str, GameState] = {}
waiting_players: List[str] = []
private_rooms: Dict[str, str] = {}  # roomCode -> sid
socket_teams: Dict[str, TeamConfig] = {}

# RPG Mode players
rpg_players: Dict[str, dict] = {}
rpg_npcs: Dict[str, dict] = {}

# Load NPCs cache from db (this could be done async in lifespan too, but simple dict is fine)

class TeamRecord:
    def __init__(self, team: TeamConfig, wins: int, losses: int, winRate: float, playerName: str):
        self.team = team
        self.wins = wins
        self.losses = losses
        self.winRate = winRate
        self.playerName = playerName

    def to_dict(self):
        return {
            "team": self.team.to_dict(),
            "wins": self.wins,
            "losses": self.losses,
            "winRate": self.winRate,
            "playerName": self.playerName
        }

team_records: Dict[str, TeamRecord] = {
    'boss-1': TeamRecord(
        team=TeamConfig(
            id='boss-1',
            name='烈火狂潮',
            dices=[
                {'faces': [DiceFace.ATTACK, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE]},
                {'faces': [DiceFace.ATTACK, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE]},
                {'faces': [DiceFace.ATTACK, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE]},
                {'faces': [DiceFace.ATTACK, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE, DiceFace.FIRE]}
            ],
            monsters=['m3', 'm3', 'm3']
        ),
        wins=150,
        losses=10,
        winRate=0.9375,
        playerName='火之惡魔'
    ),
    'boss-2': TeamRecord(
        team=TeamConfig(
            id='boss-2',
            name='絕對防禦',
            dices=[
                {'faces': [DiceFace.DEFENSE, DiceFace.DEFENSE, DiceFace.DEFENSE, DiceFace.DEFENSE, DiceFace.DEFENSE, DiceFace.DEFENSE]},
                {'faces': [DiceFace.DEFENSE, DiceFace.DEFENSE, DiceFace.DEFENSE, DiceFace.DEFENSE, DiceFace.DEFENSE, DiceFace.DEFENSE]},
                {'faces': [DiceFace.WATER, DiceFace.WATER, DiceFace.WATER, DiceFace.WATER, DiceFace.WATER, DiceFace.WATER]},
                {'faces': [DiceFace.ATTACK, DiceFace.WATER, DiceFace.WATER, DiceFace.WATER, DiceFace.WATER, DiceFace.WATER]}
            ],
            monsters=['m4', 'm4', 'm4']
        ),
        wins=120,
        losses=15,
        winRate=0.888,
        playerName='水之守護者'
    ),
    'boss-3': TeamRecord(
        team=TeamConfig(
            id='boss-3',
            name='疾風連擊',
            dices=[
                {'faces': [DiceFace.ATTACK, DiceFace.DODGE, DiceFace.DODGE, DiceFace.WIND, DiceFace.WIND, DiceFace.WIND]},
                {'faces': [DiceFace.ATTACK, DiceFace.DODGE, DiceFace.DODGE, DiceFace.WIND, DiceFace.WIND, DiceFace.WIND]},
                {'faces': [DiceFace.ATTACK, DiceFace.DODGE, DiceFace.DODGE, DiceFace.WIND, DiceFace.WIND, DiceFace.WIND]},
                {'faces': [DiceFace.ATTACK, DiceFace.DODGE, DiceFace.DODGE, DiceFace.WIND, DiceFace.WIND, DiceFace.WIND]}
            ],
            monsters=['m2', 'm2', 'm2']
        ),
        wins=100,
        losses=20,
        winRate=0.833,
        playerName='風之刺客'
    )
}

def update_team_record(team: TeamConfig, is_winner: bool, player_name: str):
    key = team.id
    if key not in team_records:
        team_records[key] = TeamRecord(team, 0, 0, 0, player_name)

    record = team_records[key]
    if is_winner:
        record.wins += 1
    else:
        record.losses += 1

    total = record.wins + record.losses
    record.winRate = record.wins / total

def create_battle_monster(base_id: str) -> BattleMonsterState:
    base = MONSTERS[base_id]
    return BattleMonsterState(
        id=uuid.uuid4().hex[:7],
        baseId=base_id,
        hp=float(base.hp),
        maxHp=float(base.hp),
        atk=float(base.str),
        def_val=min(100.0, float(base.con)),
        spd=min(50.0, float(base.dex)),
        dodgeBonus=0
    )

def get_team_dices(team: TeamConfig) -> List[List[DiceFace]]:
    return [[DiceFace(f) for f in d["faces"]] for d in team.dices]

def roll_dices_with_guarantee(team: TeamConfig, monster_base_id: str) -> List[DiceFace]:
    dices = roll_dices(get_team_dices(team))
    attempts = 0
    base = MONSTERS[monster_base_id]

    while attempts < 50:
        satisfied = False
        for s_id in base.skills:
            if check_skill_conditions(SKILLS[s_id], dices):
                satisfied = True
                break
        if satisfied:
            break
        dices = roll_dices(get_team_dices(team))
        attempts += 1
    return [d.value for d in dices]

async def start_match(p1_id: str, p2_id: str, team1: TeamConfig, team2: TeamConfig):
    room_id = f"room_{uuid.uuid4().hex[:7]}"

    state = GameState(
        roomId=room_id,
        status='PLAYING',
        isPaused=False,
        players={
            p1_id: PlayerState(
                id=p1_id,
                name='Player 1',
                team=team1,
                currentMonsterIndex=0,
                monster=create_battle_monster(team1.monsters[0]),
                ap=0.0,
                rolledDices=roll_dices_with_guarantee(team1, team1.monsters[0]),
                isAuto=True,
                connected=True
            ),
            p2_id: PlayerState(
                id=p2_id,
                name='Player 2',
                team=team2,
                currentMonsterIndex=0,
                monster=create_battle_monster(team2.monsters[0]),
                ap=0.0,
                rolledDices=roll_dices_with_guarantee(team2, team2.monsters[0]),
                isAuto=True,
                connected=True
            )
        },
        logs=['戰鬥開始！'],
        winnerId=None
    )

    rooms[room_id] = state
    await sio.enter_room(p1_id, room_id)
    if not p2_id.startswith('ai_') and not p2_id.startswith('boss_'):
        await sio.enter_room(p2_id, room_id)

    await sio.emit('gameStart', state.to_dict(), room=room_id)

async def execute_skill(state: GameState, attacker_id: str, skill_id: str):
    attacker = state.players[attacker_id]
    defender_id = next(id for id in state.players.keys() if id != attacker_id)
    defender = state.players[defender_id]

    attacker.ap = 0.0

    # Continuous effects
    attacker.monster.dodgeBonus = max(0, attacker.monster.dodgeBonus - 1)
    defender.monster.dodgeBonus = max(0, defender.monster.dodgeBonus - 1)

    apply_skill_effect(skill_id, attacker, defender, state.logs)

    if defender.monster.hp <= 0:
        base_def = MONSTERS[defender.monster.baseId]
        state.logs.append(f"{defender.name} 的 {base_def.name} 倒下了！")
        defender.currentMonsterIndex += 1
        if defender.currentMonsterIndex < len(defender.team.monsters):
            new_base_id = defender.team.monsters[defender.currentMonsterIndex]
            defender.monster = create_battle_monster(new_base_id)
            defender.ap = 0.0
            defender.rolledDices = roll_dices_with_guarantee(defender.team, defender.monster.baseId)
            state.logs.append(f"{defender.name} 派出了 {MONSTERS[new_base_id].name}！")
        else:
            state.status = 'FINISHED'
            state.winnerId = attacker_id
            state.logs.append(f"{attacker.name} 獲得了勝利！")
            update_team_record(attacker.team, True, attacker.name)
            update_team_record(defender.team, False, defender.name)

    if state.status == 'PLAYING':
        attacker.rolledDices = roll_dices_with_guarantee(attacker.team, attacker.monster.baseId)

async def game_loop():
    while True:
        tick_ms = 10000 / SETTINGS.gameTick
        await asyncio.sleep(tick_ms / 1000.0)

        for room_id, state in list(rooms.items()):
            if state.status != 'PLAYING' or state.isPaused:
                continue

            state_changed = False

            for player_id, p in state.players.items():
                if p.ap < 100:
                    p.ap = min(100.0, p.ap + p.monster.spd)
                    state_changed = True

                if p.isAuto:
                    base = MONSTERS[p.monster.baseId]
                    enum_dices = [DiceFace(d) for d in p.rolledDices]
                    satisfied_skills = [SKILLS[s_id] for s_id in base.skills if check_skill_conditions(SKILLS[s_id], enum_dices)]

                    if satisfied_skills:
                        best_skill = max(satisfied_skills, key=lambda s: s.apCost)
                        if p.ap >= best_skill.apCost:
                            await execute_skill(state, player_id, best_skill.id)
                            state_changed = True
                    elif p.ap >= 30:
                        p.ap -= 30
                        p.rolledDices = roll_dices_with_guarantee(p.team, p.monster.baseId)
                        state.logs.append(f"{p.name} 放棄回合並重新擲骰！")
                        state_changed = True

            if state_changed:
                await sio.emit('gameStateUpdate', state.to_dict(), room=room_id)

# Socket.IO event handlers

@sio.event
async def connect(sid, environ):
    print('User connected:', sid)

@sio.event
async def disconnect(sid):
    print('User disconnected:', sid)
    if sid in waiting_players:
        waiting_players.remove(sid)

    for room_code, p_sid in list(private_rooms.items()):
        if p_sid == sid:
            del private_rooms[room_code]

    if sid in rpg_players:
        del rpg_players[sid]
        await sio.emit("player_left", sid)

    for room_id, state in rooms.items():
        if sid in state.players and state.status == 'PLAYING':
            state.players[sid].connected = False
            state.status = 'FINISHED'
            winner_id = next((id for id in state.players.keys() if id != sid), None)
            state.winnerId = winner_id
            state.logs.append(f"{state.players[sid].name} 斷線，遊戲結束。")

            if winner_id:
                winner = state.players[winner_id]
                loser = state.players[sid]
                update_team_record(winner.team, True, winner.name)
                update_team_record(loser.team, False, loser.name)

            await sio.emit('gameStateUpdate', state.to_dict(), room=room_id)

@sio.event
async def rpg_connect(sid, user_info: dict = None):
    print('Player joined RPG mode:', sid, user_info)
    name = "Player"
    role_walk_sprite = "character.png"
    role_atk_sprite = "character_atk.png"

    if user_info:
        name = user_info.get('name', 'Player')
        role_walk_sprite = user_info.get('roleWalkSprite', 'character.png')
        role_atk_sprite = user_info.get('roleAtkSprite', 'character_atk.png')

    rpg_players[sid] = {
        'x': 100,
        'y': 100,
        'id': sid,
        'frame': 1,
        'isRpg': True,
        'type': 'player',
        'name': name,
        'role_walk_sprite': role_walk_sprite,
        'role_atk_sprite': role_atk_sprite
    }
    await sio.emit("current_players", rpg_players, to=sid)
    await sio.emit("current_npcs", rpg_npcs, to=sid)
    await sio.emit("player_joined", rpg_players[sid], skip_sid=sid)

@sio.event
async def player_moved(sid, movement_data: dict):
    if sid in rpg_players:
        rpg_players[sid]['x'] = movement_data.get('x', rpg_players[sid]['x'])
        rpg_players[sid]['y'] = movement_data.get('y', rpg_players[sid]['y'])
        rpg_players[sid]['anim'] = movement_data.get('anim')
        rpg_players[sid]['frame'] = movement_data.get('frame')
        await sio.emit("player_moved", rpg_players[sid], skip_sid=sid)

@sio.event
async def chat_message(sid, data: dict):
    if sid in rpg_players:
        name = rpg_players[sid].get('name', 'Player')
        message = data.get('message', '')
        await sio.emit("chat_message", {'id': sid, 'name': name, 'message': message})

@sio.event
async def joinMatchmaking(sid, team_data: dict):
    team = TeamConfig(**team_data)
    socket_teams[sid] = team
    waiting_players.append(sid)
    print('Player joined matchmaking:', sid)

    if len(waiting_players) >= 2:
        p1 = waiting_players.pop(0)
        p2 = waiting_players.pop(0)
        await start_match(p1, p2, socket_teams[p1], socket_teams[p2])

@sio.event
async def joinPrivateRoom(sid, data: dict):
    team = TeamConfig(**data['team'])
    room_code = data['roomCode']
    socket_teams[sid] = team
    print(f'Player {sid} joining private room: {room_code}')

    if room_code in private_rooms:
        p1 = private_rooms[room_code]
        p2 = sid
        del private_rooms[room_code]
        await start_match(p1, p2, socket_teams[p1], socket_teams[p2])
    else:
        private_rooms[room_code] = sid

@sio.event
async def startPvE(sid, team_data: dict):
    team = TeamConfig(**team_data)
    ai_id = f"ai_{uuid.uuid4().hex[:7]}"
    ai_team = TeamConfig(
        id='ai-team',
        name='電腦對手',
        dices=[
            {'faces': [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.EARTH, DiceFace.WATER, DiceFace.FIRE]},
            {'faces': [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.WIND, DiceFace.EARTH, DiceFace.WATER]},
            {'faces': [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.FIRE, DiceFace.WIND, DiceFace.EMPTY]},
            {'faces': [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.EARTH, DiceFace.WATER, DiceFace.FIRE]}
        ],
        monsters=['m1', 'm2', 'm3']
    )
    await start_match(sid, ai_id, team, ai_team)

@sio.event
async def getGameData(sid):
    # Just emit it directly or we can use callback
    return {
        "MONSTERS": {k: v.to_dict() for k, v in MONSTERS.items()},
        "SKILLS": {k: v.to_dict() for k, v in SKILLS.items()},
        "SETTINGS": SETTINGS.to_dict()
    }

@sio.event
async def updateGameData(sid, data: dict):
    # SECURITY MEASURE:
    # Only allow updates if engineering mode is explicitly turned on, or another
    # form of authentication validates the admin session to prevent unauthorized users
    # from injecting malicious data (like `asteval` execution vulnerabilities) via sockets.
    if not SETTINGS.engineeringMode:
        print(f"Warning: Unauthorized attempt to updateGameData from sid {sid}. Updates disabled.")
        return

    print("Received updateGameData event. Applying changes to local cache and saving to Supabase.")

    if 'MONSTERS' in data:
        MONSTERS.clear()
        for k, v in data['MONSTERS'].items():
            from .game.types import ElementType, MonsterBase
            m = MonsterBase(
                id=v.get('id', k),
                name=v.get('name', ''),
                type=ElementType(v.get('type', ElementType.NONE.value)),
                hp=v.get('hp', 1),
                str=v.get('str', 1),
                con=v.get('con', 1),
                dex=v.get('dex', 1),
                skills=v.get('skills', []),
                svgPath=v.get('svgPath')
            )
            MONSTERS[k] = m

    if 'SKILLS' in data:
        SKILLS.clear()
        for k, v in data['SKILLS'].items():
            from .game.types import SkillBase, DiceFace
            conditions = {}
            for ck, cv in v.get('conditions', {}).items():
                try:
                    conditions[DiceFace(ck)] = cv
                except ValueError:
                    pass
            s = SkillBase(
                id=v.get('id', k),
                name=v.get('name', ''),
                apCost=v.get('apCost', 0),
                conditions=conditions,
                description=v.get('description', ''),
                svgPath=v.get('svgPath')
            )
            SKILLS[k] = s

    if 'SETTINGS' in data:
        settings_data = data['SETTINGS']
        SETTINGS.accuracyFormula = settings_data.get('accuracyFormula', SETTINGS.accuracyFormula)
        SETTINGS.damageFormula = settings_data.get('damageFormula', SETTINGS.damageFormula)
        SETTINGS.gameTick = settings_data.get('gameTick', SETTINGS.gameTick)
        SETTINGS.engineeringMode = settings_data.get('engineeringMode', SETTINGS.engineeringMode)

    # Save to Supabase using update where id = 'default' (or limits 1 by matching id != 'none')
    try:
        from .game.supabase_client import get_supabase_client
        client = await get_supabase_client()
        if client:
            await client.table('game_data').update({
                'monsters': {k: v.to_dict() for k, v in MONSTERS.items()},
                'skills': {k: v.to_dict() for k, v in SKILLS.items()},
                'settings': SETTINGS.to_dict()
            }).neq('id', 'none').execute()
            print("Successfully saved game data to Supabase.")
        else:
            print("Supabase client not available, skipping save to Supabase.")
    except Exception as e:
        print(f"Error saving game data to Supabase: {e}")

    await sio.emit('gameDataUpdated', {
        "MONSTERS": {k: v.to_dict() for k, v in MONSTERS.items()},
        "SKILLS": {k: v.to_dict() for k, v in SKILLS.items()},
        "SETTINGS": SETTINGS.to_dict()
    })

@sio.event
async def getTopBosses(sid):
    top_bosses = [r for r in team_records.values() if (r.wins + r.losses) >= 5]
    top_bosses.sort(key=lambda r: r.winRate, reverse=True)
    top_bosses = top_bosses[:10]

    if not top_bosses:
        res = [r.to_dict() for r in list(team_records.values())[:10]]
    else:
        res = [r.to_dict() for r in top_bosses]
    return res

@sio.event
async def startBossBattle(sid, data: dict):
    team = TeamConfig(**data['team'])
    boss_team = TeamConfig(**data['bossTeam'])
    ai_id = f"boss_{uuid.uuid4().hex[:7]}"
    await start_match(sid, ai_id, team, boss_team)

def get_room_id(sid: str) -> str:
    for room_id, state in rooms.items():
        if sid in state.players:
            return room_id
    return None

@sio.event
async def executeSkill(sid, skill_id: str):
    room_id = get_room_id(sid)
    if not room_id: return
    state = rooms[room_id]
    if state.status != 'PLAYING': return

    player = state.players.get(sid)
    skill = SKILLS.get(skill_id)
    if player and skill and player.ap >= skill.apCost:
        enum_dices = [DiceFace(d) for d in player.rolledDices]
        if check_skill_conditions(skill, enum_dices):
            await execute_skill(state, sid, skill_id)
            await sio.emit('gameStateUpdate', state.to_dict(), room=room_id)

@sio.event
async def giveUp(sid):
    room_id = get_room_id(sid)
    if not room_id: return
    state = rooms[room_id]
    if state.status != 'PLAYING': return

    player = state.players.get(sid)
    if player and player.ap >= 30:
        player.ap -= 30
        player.rolledDices = roll_dices_with_guarantee(player.team, player.monster.baseId)
        state.logs.append(f"{player.name} 放棄回合並重新擲骰！")
        await sio.emit('gameStateUpdate', state.to_dict(), room=room_id)

@sio.event
async def toggleAuto(sid):
    room_id = get_room_id(sid)
    if not room_id: return
    state = rooms[room_id]
    if state.status != 'PLAYING': return

    player = state.players.get(sid)
    if player:
        player.isAuto = not player.isAuto
        await sio.emit('gameStateUpdate', state.to_dict(), room=room_id)

@sio.event
async def togglePause(sid):
    room_id = get_room_id(sid)
    if not room_id: return
    state = rooms[room_id]
    if state.status != 'PLAYING' or not SETTINGS.engineeringMode: return

    state.isPaused = not state.isPaused
    status_str = "暫停" if state.isPaused else "恢復"
    msg = f"[工程模式] 遊戲已{status_str}！"
    state.logs.append(msg)
    if SETTINGS.engineeringMode:
        print(msg)
    await sio.emit('gameStateUpdate', state.to_dict(), room=room_id)