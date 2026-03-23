import { DiceFace, ElementType, MonsterBase, PlayerState, SkillBase } from './types.js';
import { MONSTERS, SKILLS } from './gameData.js';

export function rollDices(faces: DiceFace[][]): DiceFace[] {
  return faces.map(dice => dice[Math.floor(Math.random() * dice.length)]);
}

export function checkSkillConditions(skill: SkillBase, rolledDices: DiceFace[]): boolean {
  const counts: Partial<Record<DiceFace, number>> = {};
  for (const face of rolledDices) {
    counts[face] = (counts[face] || 0) + 1;
  }
  
  // Handle dual element faces
  let earthFireCount = counts[DiceFace.EARTH_FIRE] || 0;
  let waterWindCount = counts[DiceFace.WATER_WIND] || 0;

  for (const [face, requiredCount] of Object.entries(skill.conditions)) {
    const f = face as DiceFace;
    let available = counts[f] || 0;
    
    if (f === DiceFace.EARTH || f === DiceFace.FIRE) {
      const use = Math.min(requiredCount - available, earthFireCount);
      if (use > 0) {
        available += use;
        earthFireCount -= use;
      }
    }
    if (f === DiceFace.WATER || f === DiceFace.WIND) {
      const use = Math.min(requiredCount - available, waterWindCount);
      if (use > 0) {
        available += use;
        waterWindCount -= use;
      }
    }

    if (available < requiredCount) {
      return false;
    }
  }
  return true;
}

export function getSatisfiedSkills(monsterId: string, rolledDices: DiceFace[]): SkillBase[] {
  const monster = MONSTERS[monsterId];
  if (!monster) return [];
  return monster.skills
    .map(sId => SKILLS[sId])
    .filter(skill => checkSkillConditions(skill, rolledDices));
}

export function getAttributeBonus(attackerType: ElementType, defenderType: ElementType): number {
  if (attackerType === ElementType.WATER && defenderType === ElementType.FIRE) return 1.25;
  if (attackerType === ElementType.FIRE && defenderType === ElementType.WIND) return 1.25;
  if (attackerType === ElementType.WIND && defenderType === ElementType.EARTH) return 1.25;
  if (attackerType === ElementType.EARTH && defenderType === ElementType.WATER) return 1.25;
  return 1.0;
}

export function calculateAccuracy(attackerSpd: number, defenderSpd: number, defenderDodgeBonus: number): number {
  return attackerSpd / (defenderSpd * (1 + defenderDodgeBonus));
}

export function calculateDamage(attackPower: number, attackerType: ElementType, defenderType: ElementType, defenderDef: number): { damage: number, isCritical: boolean } {
  const attribBonus = getAttributeBonus(attackerType, defenderType);
  // Percentage-based formula: Damage = ATK * (100 / (100 + DEF))
  const damageMultiplier = 100 / (100 + defenderDef);
  let damage = Math.floor(attackPower * attribBonus * damageMultiplier);
  if (damage < 1) damage = 1;
  return { damage, isCritical: attribBonus > 1 };
}

export function applySkillEffect(
  skillId: string, 
  attacker: PlayerState, 
  defender: PlayerState, 
  logs: string[]
) {
  const mAttacker = MONSTERS[attacker.monster.baseId];
  const mDefender = MONSTERS[defender.monster.baseId];
  
  let attackPower = 0;
  
  // Apply specific skill effects based on ID
  switch (skillId) {
    case 's1': // 咬
      attackPower = attacker.monster.atk;
      break;
    case 's2': // 鑽地閃
      attackPower = 0;
      attacker.monster.def *= 1.1;
      attacker.monster.spd *= 1.2;
      attacker.monster.dodgeBonus += 1;
      break;
    case 's3': // 瘋狂撕咬
      attackPower = 2 * attacker.monster.atk;
      attacker.monster.def *= 0.6;
      attacker.monster.spd = mAttacker.dex;
      attacker.monster.dodgeBonus = 0;
      break;
    case 's4': // 飛爪
      attackPower = attacker.monster.atk;
      attacker.monster.spd *= 1.1;
      break;
    case 's5': // 閃躲
      attackPower = 0;
      attacker.monster.spd *= 1.5;
      attacker.monster.dodgeBonus += 1;
      break;
    case 's6': // 雙倍奉還
      attackPower = 2 * attacker.monster.atk;
      attacker.monster.spd = mAttacker.dex;
      attacker.monster.def *= 0.6;
      attacker.monster.dodgeBonus = 0;
      break;
    case 's7': // 火球
      attackPower = attacker.monster.atk;
      break;
    case 's8': // 火牆
      attackPower = 0;
      attacker.monster.def *= 1.1;
      break;
    case 's9': // 火柱
      attackPower = 2 * attacker.monster.atk;
      attacker.monster.spd = mAttacker.dex;
      attacker.monster.def *= 0.6;
      attacker.monster.dodgeBonus = 0;
      break;
    case 's10': // 龜縮
      attackPower = 0;
      attacker.monster.def *= 1.3;
      attacker.monster.dodgeBonus += 1;
      break;
    case 's11': // 水槍
      attackPower = attacker.monster.atk;
      break;
    case 's12': // 水柱
      attackPower = 2 * attacker.monster.atk;
      attacker.monster.dodgeBonus = 0;
      break;
  }

  // Cap SPD at 50
  attacker.monster.spd = Math.min(50, attacker.monster.spd);

  if (attackPower > 0) {
    const accuracy = calculateAccuracy(attacker.monster.spd, defender.monster.spd, defender.monster.dodgeBonus);
    if (Math.random() <= accuracy) {
      const { damage, isCritical } = calculateDamage(attackPower, mAttacker.type, mDefender.type, defender.monster.def);
      defender.monster.hp -= damage;
      logs.push(`${attacker.name} 的 ${mAttacker.name} 使用了 ${SKILLS[skillId].name}，造成了 ${damage} 點傷害！`);
      if (isCritical) {
        logs.push(`屬性剋制！傷害增加！`);
      }
    } else {
      logs.push(`${attacker.name} 的 ${mAttacker.name} 使用了 ${SKILLS[skillId].name}，但是被閃避了！`);
    }
  } else {
    logs.push(`${attacker.name} 的 ${mAttacker.name} 使用了 ${SKILLS[skillId].name}！`);
  }
}
