import random
import math
from typing import List, Dict
from asteval import Interpreter

from .types import DiceFace, ElementType, SkillBase, PlayerState
from .data import MONSTERS, SKILLS, SETTINGS

def roll_dices(faces_list: List[List[DiceFace]]) -> List[DiceFace]:
    return [random.choice(dice) for dice in faces_list]

def check_skill_conditions(skill: SkillBase, rolled_dices: List[DiceFace]) -> bool:
    counts: Dict[DiceFace, int] = {}
    for face in rolled_dices:
        counts[face] = counts.get(face, 0) + 1

    earth_fire_count = counts.get(DiceFace.EARTH_FIRE, 0)
    water_wind_count = counts.get(DiceFace.WATER_WIND, 0)

    for face, required_count in skill.conditions.items():
        available = counts.get(face, 0)

        if face in (DiceFace.EARTH, DiceFace.FIRE):
            use = min(required_count - available, earth_fire_count)
            if use > 0:
                available += use
                earth_fire_count -= use

        if face in (DiceFace.WATER, DiceFace.WIND):
            use = min(required_count - available, water_wind_count)
            if use > 0:
                available += use
                water_wind_count -= use

        if available < required_count:
            return False

    return True

def get_satisfied_skills(monster_id: str, rolled_dices: List[DiceFace]) -> List[SkillBase]:
    monster = MONSTERS.get(monster_id)
    if not monster:
        return []

    return [SKILLS[s_id] for s_id in monster.skills if check_skill_conditions(SKILLS[s_id], rolled_dices)]

def get_attribute_bonus(attacker_type: ElementType, defender_type: ElementType) -> float:
    if attacker_type == ElementType.WATER and defender_type == ElementType.FIRE: return 1.25
    if attacker_type == ElementType.FIRE and defender_type == ElementType.WIND: return 1.25
    if attacker_type == ElementType.WIND and defender_type == ElementType.EARTH: return 1.25
    if attacker_type == ElementType.EARTH and defender_type == ElementType.WATER: return 1.25
    return 1.0

def calculate_accuracy(attacker_spd: float, defender_spd: float, defender_dodge_bonus: int) -> float:
    try:
        aeval = Interpreter()
        aeval.symtable['attackerSpd'] = attacker_spd
        aeval.symtable['defenderSpd'] = defender_spd
        aeval.symtable['defenderDodgeBonus'] = defender_dodge_bonus
        return float(aeval(SETTINGS.accuracyFormula))
    except Exception as e:
        print(f"Error evaluating accuracy formula: {e}")
        return attacker_spd / (defender_spd * (1 + defender_dodge_bonus))

def calculate_damage(attack_power: float, attrib_bonus: float, defender_def: float) -> float:
    try:
        aeval = Interpreter()
        aeval.symtable['math'] = math
        aeval.symtable['Math'] = math
        aeval.symtable['max'] = max
        aeval.symtable['min'] = min
        aeval.symtable['attackPower'] = attack_power
        aeval.symtable['attribBonus'] = attrib_bonus
        aeval.symtable['defenderDef'] = defender_def
        formula = SETTINGS.damageFormula.replace("Math.", "math.")
        return float(aeval(formula))
    except Exception as e:
        print(f"Error evaluating damage formula: {e}")
        return math.floor((attack_power * attrib_bonus) - defender_def)

def apply_skill_effect(skill_id: str, attacker: PlayerState, defender: PlayerState, logs: List[str]):
    m_attacker = MONSTERS[attacker.monster.baseId]
    m_defender = MONSTERS[defender.monster.baseId]

    attack_power = 0.0
    skill = SKILLS.get(skill_id)

    if skill and skill.description:
        effects = [s.strip() for s in skill.description.split(',')]
        for effect in effects:
            norm = effect.replace(' ', '')
            if norm == 'ATK=STR':
                attack_power = attacker.monster.atk
            elif norm.startswith('ATK='):
                import re
                match = re.match(r'ATK=([\d.]+)\*STR', norm)
                if match:
                    attack_power = float(match.group(1)) * attacker.monster.atk
                elif norm == 'ATK=0':
                    attack_power = 0.0
            elif norm.startswith('DEF*='):
                val = float(norm.split('*=')[1])
                attacker.monster.def_val *= val
            elif norm.startswith('SPD*='):
                val = float(norm.split('*=')[1])
                attacker.monster.spd *= val
            elif norm == 'SPD=DEX':
                attacker.monster.spd = m_attacker.dex
            elif norm.startswith('dodge-bonus+='):
                val = int(norm.split('+=')[1])
                attacker.monster.dodgeBonus += val
            elif norm == 'dodge-bonus=0':
                attacker.monster.dodgeBonus = 0

    attacker.monster.spd = min(50.0, attacker.monster.spd)
    attacker.monster.def_val = min(100.0, attacker.monster.def_val)

    if attack_power > 0:
        accuracy = calculate_accuracy(attacker.monster.spd, defender.monster.spd, defender.monster.dodgeBonus)

        if SETTINGS.engineeringMode:
            msg = f"[工程模式] 招式: {skill.name if skill else '未知'}, 命中率計算: 攻擊方SPD={attacker.monster.spd:.1f}, 防禦方SPD={defender.monster.spd:.1f}, 閃避加成={defender.monster.dodgeBonus} => 命中率={accuracy * 100:.1f}%"
            logs.append(msg)
            print(msg)

        if random.random() <= accuracy:
            attrib_bonus = get_attribute_bonus(m_attacker.type, m_defender.type)
            damage = calculate_damage(attack_power, attrib_bonus, defender.monster.def_val)
            if damage < 1:
                damage = 1

            if SETTINGS.engineeringMode:
                msg = f"[工程模式] 招式: {skill.name if skill else '未知'}, 傷害計算: 攻擊力={attack_power:.1f}, 屬性加成={attrib_bonus}, 防禦力={defender.monster.def_val:.1f} => 傷害={damage}"
                logs.append(msg)
                print(msg)

            defender.monster.hp -= damage
            defender.monster.def_val *= 0.95

            logs.append(f"{attacker.name} 的 {m_attacker.name} 使用了 {skill.name}, 造成了 {damage} 點傷害！")
            if attrib_bonus > 1:
                logs.append("屬性剋制！傷害增加！")
        else:
            logs.append(f"{attacker.name} 的 {m_attacker.name} 使用了 {skill.name}, 但是被閃避了！")
    else:
        logs.append(f"{attacker.name} 的 {m_attacker.name} 使用了 {skill.name}！")
