import { DiceFace, ElementType, MonsterBase, PlayerState, SkillBase } from './types.js';
import { MONSTERS, SKILLS, SETTINGS } from './gameData.js';

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
  try {
    const fn = new Function('attackerSpd', 'defenderSpd', 'defenderDodgeBonus', `return ${SETTINGS.accuracyFormula};`);
    return fn(attackerSpd, defenderSpd, defenderDodgeBonus);
  } catch (e) {
    console.error('Error evaluating accuracy formula:', e);
    return attackerSpd / (defenderSpd * (1 + defenderDodgeBonus));
  }
}

export function calculateDamage(attackPower: number, attribBonus: number, defenderDef: number): number {
  try {
    const fn = new Function('attackPower', 'attribBonus', 'defenderDef', `return ${SETTINGS.damageFormula};`);
    return fn(attackPower, attribBonus, defenderDef);
  } catch (e) {
    console.error('Error evaluating damage formula:', e);
    return Math.floor((attackPower * attribBonus) - defenderDef);
  }
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
  
  // Apply specific skill effects based on description
  const skill = SKILLS[skillId];
  if (skill && skill.description) {
    const effects = skill.description.split(',').map(s => s.trim());
    for (const effect of effects) {
      const normalizedEffect = effect.replace(/\s+/g, '');
      if (normalizedEffect === 'ATK=STR') {
        attackPower = attacker.monster.atk;
      } else if (normalizedEffect.startsWith('ATK=')) {
        const match = normalizedEffect.match(/ATK=([\d.]+)\*STR/);
        if (match) {
          attackPower = parseFloat(match[1]) * attacker.monster.atk;
        } else if (normalizedEffect === 'ATK=0') {
          attackPower = 0;
        }
      } else if (normalizedEffect.startsWith('DEF*=')) {
        const val = parseFloat(normalizedEffect.split('*=')[1]);
        if (!isNaN(val)) attacker.monster.def *= val;
      } else if (normalizedEffect.startsWith('SPD*=')) {
        const val = parseFloat(normalizedEffect.split('*=')[1]);
        if (!isNaN(val)) attacker.monster.spd *= val;
      } else if (normalizedEffect === 'SPD=DEX') {
        attacker.monster.spd = mAttacker.dex;
      } else if (normalizedEffect.startsWith('dodge-bonus+=')) {
        const val = parseInt(normalizedEffect.split('+=')[1]);
        if (!isNaN(val)) attacker.monster.dodgeBonus += val;
      } else if (normalizedEffect === 'dodge-bonus=0') {
        attacker.monster.dodgeBonus = 0;
      }
    }
  }

  // Cap SPD at 50 and DEF at 100
  attacker.monster.spd = Math.min(50, attacker.monster.spd);
  attacker.monster.def = Math.min(100, attacker.monster.def);

  if (attackPower > 0) {
    const accuracy = calculateAccuracy(attacker.monster.spd, defender.monster.spd, defender.monster.dodgeBonus);
    
    if (SETTINGS.engineeringMode) {
      const msg = `[工程模式] 命中率計算: 攻擊方SPD=${attacker.monster.spd.toFixed(1)}, 防禦方SPD=${defender.monster.spd.toFixed(1)}, 閃避加成=${defender.monster.dodgeBonus} => 命中率=${(accuracy * 100).toFixed(1)}%`;
      logs.push(msg);
      console.log(msg);
    }

    if (Math.random() <= accuracy) {
      const attribBonus = getAttributeBonus(mAttacker.type, mDefender.type);
      let damage = calculateDamage(attackPower, attribBonus, defender.monster.def);
      if (damage < 1) damage = 1; // Minimum 1 damage if hit
      
      if (SETTINGS.engineeringMode) {
        const msg = `[工程模式] 傷害計算: 攻擊力=${attackPower.toFixed(1)}, 屬性加成=${attribBonus}, 防禦力=${defender.monster.def.toFixed(1)} => 傷害=${damage}`;
        logs.push(msg);
        console.log(msg);
      }

      defender.monster.hp -= damage;
      
      // Defense decreases by 5% after being attacked
      defender.monster.def *= 0.95;
      
      logs.push(`${attacker.name} 的 ${mAttacker.name} 使用了 ${SKILLS[skillId].name}，造成了 ${damage} 點傷害！`);
      if (attribBonus > 1) {
        logs.push(`屬性剋制！傷害增加！`);
      }
    } else {
      logs.push(`${attacker.name} 的 ${mAttacker.name} 使用了 ${SKILLS[skillId].name}，但是被閃避了！`);
    }
  } else {
    logs.push(`${attacker.name} 的 ${mAttacker.name} 使用了 ${SKILLS[skillId].name}！`);
  }
}
