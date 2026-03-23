import { ElementType, DiceFace, MonsterBase, SkillBase } from './types.js';

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

export const MONSTERS: Record<string, MonsterBase> = {
  'm1': { id: 'm1', name: '鑽地鼠', type: ElementType.EARTH, hp: 500, str: 120, con: 200, dex: 30, skills: ['s1', 's2', 's3'] },
  'm2': { id: 'm2', name: '風狼', type: ElementType.WIND, hp: 300, str: 100, con: 100, dex: 60, skills: ['s4', 's5', 's6'] },
  'm3': { id: 'm3', name: '火鳥', type: ElementType.FIRE, hp: 250, str: 250, con: 150, dex: 25, skills: ['s7', 's8', 's9'] },
  'm4': { id: 'm4', name: '水龜', type: ElementType.WATER, hp: 400, str: 150, con: 150, dex: 30, skills: ['s10', 's11', 's12'] },
};

export const SKILLS: Record<string, SkillBase> = {
  's1': { id: 's1', name: '咬', apCost: 40, conditions: { [DiceFace.ATTACK]: 2 }, description: 'ATK=STR' },
  's2': { id: 's2', name: '鑽地閃', apCost: 50, conditions: { [DiceFace.DODGE]: 2 }, description: 'ATK=0*STR, DEF*=1.1, SPD*=1.2, dodge-bonus+=1' },
  's3': { id: 's3', name: '瘋狂撕咬', apCost: 90, conditions: { [DiceFace.ATTACK]: 3 }, description: 'ATK=2*STR, DEF*=0.6, SPD=DEX, dodge-bonus=0' },
  's4': { id: 's4', name: '飛爪', apCost: 40, conditions: { [DiceFace.ATTACK]: 1, [DiceFace.DODGE]: 1 }, description: 'ATK=STR, SPD*=1.1' },
  's5': { id: 's5', name: '閃躲', apCost: 40, conditions: { [DiceFace.DODGE]: 1, [DiceFace.WIND]: 1 }, description: 'ATK=0*STR, SPD*=1.5, dodge-bonus+=1' },
  's6': { id: 's6', name: '雙倍奉還', apCost: 90, conditions: { [DiceFace.ATTACK]: 2, [DiceFace.DODGE]: 1, [DiceFace.WIND]: 1 }, description: 'ATK=2*STR, SPD=DEX, DEF*=0.6, dodge-bonus=0' },
  's7': { id: 's7', name: '火球', apCost: 40, conditions: { [DiceFace.ATTACK]: 1, [DiceFace.FIRE]: 1 }, description: 'ATK=STR' },
  's8': { id: 's8', name: '火牆', apCost: 50, conditions: { [DiceFace.DEFENSE]: 1, [DiceFace.FIRE]: 1 }, description: 'ATK=0*STR, DEF*=1.1' },
  's9': { id: 's9', name: '火柱', apCost: 90, conditions: { [DiceFace.ATTACK]: 1, [DiceFace.FIRE]: 1, [DiceFace.WIND]: 1 }, description: 'ATK=2*STR, SPD=DEX, DEF*=0.6, dodge-bonus=0' },
  's10': { id: 's10', name: '龜縮', apCost: 40, conditions: { [DiceFace.DEFENSE]: 2 }, description: 'ATK=0*STR, DEF*=1.3, dodge-bonus+=1' },
  's11': { id: 's11', name: '水槍', apCost: 50, conditions: { [DiceFace.ATTACK]: 2, [DiceFace.WATER]: 1 }, description: 'ATK=STR' },
  's12': { id: 's12', name: '水柱', apCost: 90, conditions: { [DiceFace.ATTACK]: 2, [DiceFace.WATER]: 2 }, description: 'ATK=2*STR, dodge-bonus=0' },
};
