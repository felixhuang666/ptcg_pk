from enum import Enum
from typing import Dict, List, Optional, Union

class ElementType(str, Enum):
    EARTH = '地'
    WIND = '風'
    FIRE = '火'
    WATER = '水'
    NONE = '無'

class DiceFace(str, Enum):
    ATTACK = '攻'
    DEFENSE = '防'
    DODGE = '閃'
    EARTH = '地'
    WATER = '水'
    FIRE = '火'
    WIND = '風'
    EARTH_FIRE = '地/火'
    WATER_WIND = '水/風'
    EMPTY = '空'

class MonsterBase:
    def __init__(self, id: str, name: str, type: ElementType, hp: int, str: int, con: int, dex: int, skills: List[str], svgPath: Optional[str] = None):
        self.id = id
        self.name = name
        self.type = type
        self.hp = hp
        self.str = str
        self.con = con
        self.dex = dex
        self.skills = skills
        self.svgPath = svgPath

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type.value,
            "hp": self.hp,
            "str": self.str,
            "con": self.con,
            "dex": self.dex,
            "skills": self.skills,
            "svgPath": self.svgPath
        }

class SkillBase:
    def __init__(self, id: str, name: str, apCost: int, conditions: Dict[str, int], description: str, svgPath: Optional[str] = None):
        self.id = id
        self.name = name
        self.apCost = apCost
        self.conditions = conditions
        self.description = description
        self.svgPath = svgPath

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "apCost": self.apCost,
            "conditions": self.conditions,
            "description": self.description,
            "svgPath": self.svgPath
        }

class GameSettings:
    def __init__(self, accuracyFormula: str, damageFormula: str, gameTick: int, engineeringMode: bool):
        self.accuracyFormula = accuracyFormula
        self.damageFormula = damageFormula
        self.gameTick = gameTick
        self.engineeringMode = engineeringMode

    def to_dict(self):
        return {
            "accuracyFormula": self.accuracyFormula,
            "damageFormula": self.damageFormula,
            "gameTick": self.gameTick,
            "engineeringMode": self.engineeringMode
        }

class DiceConfig:
    def __init__(self, faces: List[str]):
        self.faces = faces

    def to_dict(self):
        return {
            "faces": self.faces
        }

class TeamConfig:
    def __init__(self, id: str, name: str, dices: List[Dict[str, List[str]]], monsters: List[str]):
        self.id = id
        self.name = name
        self.dices = [{"faces": d["faces"]} for d in dices] if dices else []
        self.monsters = monsters

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "dices": self.dices,
            "monsters": self.monsters
        }

class BattleMonsterState:
    def __init__(self, id: str, baseId: str, hp: float, maxHp: float, atk: float, def_val: float, spd: float, dodgeBonus: int):
        self.id = id
        self.baseId = baseId
        self.hp = hp
        self.maxHp = maxHp
        self.atk = atk
        self.def_val = def_val  # def is keyword in python
        self.spd = spd
        self.dodgeBonus = dodgeBonus

    def to_dict(self):
        return {
            "id": self.id,
            "baseId": self.baseId,
            "hp": self.hp,
            "maxHp": self.maxHp,
            "atk": self.atk,
            "def": self.def_val,
            "spd": self.spd,
            "dodgeBonus": self.dodgeBonus
        }

class PlayerState:
    def __init__(self, id: str, name: str, team: Union[TeamConfig, Dict], currentMonsterIndex: int, monster: Union[BattleMonsterState, Dict], ap: float, rolledDices: List[str], isAuto: bool, connected: bool):
        self.id = id
        self.name = name

        if isinstance(team, dict):
            self.team = TeamConfig(**team)
        else:
            self.team = team

        self.currentMonsterIndex = currentMonsterIndex

        if isinstance(monster, dict):
            # map 'def' to 'def_val' for instantiation
            if 'def' in monster:
                monster['def_val'] = monster.pop('def')
            self.monster = BattleMonsterState(**monster)
        else:
            self.monster = monster

        self.ap = ap
        self.rolledDices = rolledDices
        self.isAuto = isAuto
        self.connected = connected

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "team": self.team.to_dict() if hasattr(self.team, 'to_dict') else self.team,
            "currentMonsterIndex": self.currentMonsterIndex,
            "monster": self.monster.to_dict() if hasattr(self.monster, 'to_dict') else self.monster,
            "ap": self.ap,
            "rolledDices": self.rolledDices,
            "isAuto": self.isAuto,
            "connected": self.connected
        }

class GameState:
    def __init__(self, roomId: str, status: str, isPaused: bool, players: Dict[str, Union[PlayerState, Dict]], logs: List[str], winnerId: Optional[str] = None):
        self.roomId = roomId
        self.status = status
        self.isPaused = isPaused

        self.players = {}
        for k, v in players.items():
            if isinstance(v, dict):
                self.players[k] = PlayerState(**v)
            else:
                self.players[k] = v

        self.logs = logs
        self.winnerId = winnerId

    def to_dict(self):
        return {
            "roomId": self.roomId,
            "status": self.status,
            "isPaused": self.isPaused,
            "players": {k: v.to_dict() for k, v in self.players.items()},
            "logs": self.logs,
            "winnerId": self.winnerId
        }