import { ElementType, DiceFace, MonsterBase, SkillBase, GameSettings } from './types.js';

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

export const SETTINGS: GameSettings = {
  "accuracyFormula": "(attackerSpd * 1.2) / (attackerSpd + defenderSpd * (1 + defenderDodgeBonus))",
  "damageFormula": "Math.floor((attackPower * attribBonus) - defenderDef)",
  "gameTick": 40,
  "engineeringMode": false
};

export const MONSTERS: Record<string, MonsterBase> = {
  "m1": {
    "id": "m1",
    "name": "鑽地鼠",
    "type": "地",
    "hp": 110,
    "str": 28,
    "con": 32,
    "dex": 18,
    "skills": [
      "s1",
      "s2",
      "s3"
    ],
    "svgPath": "/assets/monsters/m1.svg"
  },
  "m2": {
    "id": "m2",
    "name": "風狼",
    "type": "風",
    "hp": 85,
    "str": 22,
    "con": 18,
    "dex": 38,
    "skills": [
      "s4",
      "s5",
      "s6"
    ],
    "svgPath": "/assets/monsters/m2.svg"
  },
  "m3": {
    "id": "m3",
    "name": "火鳥",
    "type": "火",
    "hp": 75,
    "str": 40,
    "con": 15,
    "dex": 32,
    "skills": [
      "s7",
      "s8",
      "s9"
    ],
    "svgPath": "/assets/monsters/m3.svg"
  },
  "m4": {
    "id": "m4",
    "name": "水龜",
    "type": "水",
    "hp": 100,
    "str": 25,
    "con": 40,
    "dex": 22,
    "skills": [
      "s10",
      "s11",
      "s12"
    ],
    "svgPath": "/assets/monsters/m4.svg"
  }
} as any;

export const SKILLS: Record<string, SkillBase> = {
  "s1": {
    "id": "s1",
    "name": "咬",
    "apCost": 40,
    "conditions": {
      "攻": 2
    },
    "description": "ATK=STR",
    "svgPath": "/assets/skills/s1.svg"
  },
  "s2": {
    "id": "s2",
    "name": "鑽地閃",
    "apCost": 50,
    "conditions": {
      "閃": 2
    },
    "description": "ATK=0*STR, DEF*=1.1, SPD*=1.2, dodge-bonus+=1",
    "svgPath": "/assets/skills/s2.svg"
  },
  "s3": {
    "id": "s3",
    "name": "瘋狂撕咬",
    "apCost": 90,
    "conditions": {
      "攻": 3
    },
    "description": "ATK=2*STR, DEF*=0.6, SPD=DEX, dodge-bonus=0",
    "svgPath": "/assets/skills/s3.svg"
  },
  "s4": {
    "id": "s4",
    "name": "飛爪",
    "apCost": 40,
    "conditions": {
      "攻": 1,
      "閃": 1
    },
    "description": "ATK=STR, SPD*=1.1",
    "svgPath": "/assets/skills/s4.svg"
  },
  "s5": {
    "id": "s5",
    "name": "閃躲",
    "apCost": 40,
    "conditions": {
      "閃": 1,
      "風": 1
    },
    "description": "ATK=0*STR, SPD*=1.5, dodge-bonus+=1",
    "svgPath": "/assets/skills/s5.svg"
  },
  "s6": {
    "id": "s6",
    "name": "雙倍奉還",
    "apCost": 90,
    "conditions": {
      "攻": 2,
      "閃": 1,
      "風": 1
    },
    "description": "ATK=2*STR, SPD=DEX, DEF*=0.6, dodge-bonus=0",
    "svgPath": "/assets/skills/s6.svg"
  },
  "s7": {
    "id": "s7",
    "name": "火球",
    "apCost": 40,
    "conditions": {
      "攻": 1,
      "火": 1
    },
    "description": "ATK=STR",
    "svgPath": "/assets/skills/s7.svg"
  },
  "s8": {
    "id": "s8",
    "name": "火牆",
    "apCost": 50,
    "conditions": {
      "防": 1,
      "火": 1
    },
    "description": "ATK=0*STR, DEF*=1.1",
    "svgPath": "/assets/skills/s8.svg"
  },
  "s9": {
    "id": "s9",
    "name": "火柱",
    "apCost": 90,
    "conditions": {
      "攻": 1,
      "火": 1,
      "風": 1
    },
    "description": "ATK=2*STR, SPD=DEX, DEF*=0.6, dodge-bonus=0",
    "svgPath": "/assets/skills/s9.svg"
  },
  "s10": {
    "id": "s10",
    "name": "龜縮",
    "apCost": 40,
    "conditions": {
      "防": 2
    },
    "description": "ATK=0*STR, DEF*=1.3, dodge-bonus+=1",
    "svgPath": "/assets/skills/s10.svg"
  },
  "s11": {
    "id": "s11",
    "name": "水槍",
    "apCost": 50,
    "conditions": {
      "攻": 2,
      "水": 1
    },
    "description": "ATK=STR",
    "svgPath": "/assets/skills/s11.svg"
  },
  "s12": {
    "id": "s12",
    "name": "水柱",
    "apCost": 90,
    "conditions": {
      "攻": 2,
      "水": 2
    },
    "description": "ATK=2*STR, dodge-bonus=0",
    "svgPath": "/assets/skills/s12.svg"
  }
} as any;
