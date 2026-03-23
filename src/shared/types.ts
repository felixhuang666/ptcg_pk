export enum ElementType {
  EARTH = '地',
  WIND = '風',
  FIRE = '火',
  WATER = '水',
  NONE = '無'
}

export enum DiceFace {
  ATTACK = '攻',
  DEFENSE = '防',
  DODGE = '閃',
  EARTH = '地',
  WATER = '水',
  FIRE = '火',
  WIND = '風',
  EARTH_FIRE = '地/火',
  WATER_WIND = '水/風',
  EMPTY = '空'
}

export interface MonsterBase {
  id: string;
  name: string;
  type: ElementType;
  hp: number;
  str: number;
  con: number;
  dex: number;
  skills: string[];
  svgPath?: string;
}

export interface SkillBase {
  id: string;
  name: string;
  apCost: number;
  conditions: Partial<Record<DiceFace, number>>;
  description: string;
  svgPath?: string;
}

export interface GameSettings {
  accuracyFormula: string;
  damageFormula: string;
  gameTick: number;
  engineeringMode: boolean;
}

export interface DiceConfig {
  faces: DiceFace[];
}

export interface TeamConfig {
  id: string;
  name: string;
  dices: DiceConfig[];
  monsters: string[];
}

export interface BattleMonsterState {
  id: string;
  baseId: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  dodgeBonus: number;
}

export interface PlayerState {
  id: string;
  name: string;
  team: TeamConfig;
  currentMonsterIndex: number;
  monster: BattleMonsterState;
  ap: number;
  rolledDices: DiceFace[];
  isAuto: boolean;
  connected: boolean;
}

export interface GameState {
  roomId: string;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  players: Record<string, PlayerState>;
  logs: string[];
  winnerId: string | null;
}
