from .types import DiceFace, ElementType, MonsterBase, SkillBase, GameSettings

DICE_COSTS = {
    DiceFace.ATTACK: 5,
    DiceFace.DEFENSE: 1,
    DiceFace.DODGE: 1,
    DiceFace.EARTH: 1,
    DiceFace.WATER: 1,
    DiceFace.FIRE: 1,
    DiceFace.WIND: 1,
    DiceFace.EARTH_FIRE: 2,
    DiceFace.WATER_WIND: 2,
    DiceFace.EMPTY: 0,
}

SETTINGS = GameSettings(
    accuracyFormula="(attackerSpd * 1.2) / (attackerSpd + defenderSpd * (1 + defenderDodgeBonus))",
    damageFormula="max(1, int((attackPower * attribBonus) - defenderDef))",
    gameTick=40,
    engineeringMode=True
)

MONSTERS = {
    "m1": MonsterBase(
        id="m1",
        name="鑽地鼠",
        type=ElementType.EARTH,
        hp=120,
        str=25,
        con=35,
        dex=15,
        skills=["s1", "s2", "s3"],
        svgPath="/assets/monsters/m1.svg"
    ),
    "m2": MonsterBase(
        id="m2",
        name="風狼",
        type=ElementType.WIND,
        hp=80,
        str=20,
        con=15,
        dex=40,
        skills=["s4", "s5", "s6"],
        svgPath="/assets/monsters/m2.svg"
    ),
    "m3": MonsterBase(
        id="m3",
        name="火鳥",
        type=ElementType.FIRE,
        hp=70,
        str=45,
        con=15,
        dex=30,
        skills=["s7", "s8", "s9"],
        svgPath="/assets/monsters/m3.svg"
    ),
    "m4": MonsterBase(
        id="m4",
        name="水龜",
        type=ElementType.WATER,
        hp=100,
        str=30,
        con=25,
        dex=25,
        skills=["s10", "s11", "s12"],
        svgPath="/assets/monsters/m4.svg"
    )
}

SKILLS = {
    "s1": SkillBase(
        id="s1",
        name="咬",
        apCost=40,
        conditions={DiceFace.ATTACK: 2},
        description="ATK=STR",
        svgPath="/assets/skills/s1.svg"
    ),
    "s2": SkillBase(
        id="s2",
        name="鑽地閃",
        apCost=50,
        conditions={DiceFace.DODGE: 2},
        description="ATK=0*STR, DEF*=1.1, SPD*=1.2, dodge-bonus+=1",
        svgPath="/assets/skills/s2.svg"
    ),
    "s3": SkillBase(
        id="s3",
        name="瘋狂撕咬",
        apCost=90,
        conditions={DiceFace.ATTACK: 3},
        description="ATK=2*STR, DEF*=0.6, SPD=DEX, dodge-bonus=0",
        svgPath="/assets/skills/s3.svg"
    ),
    "s4": SkillBase(
        id="s4",
        name="飛爪",
        apCost=40,
        conditions={DiceFace.ATTACK: 1, DiceFace.DODGE: 1},
        description="ATK=STR, SPD*=1.1",
        svgPath="/assets/skills/s4.svg"
    ),
    "s5": SkillBase(
        id="s5",
        name="閃躲",
        apCost=40,
        conditions={DiceFace.DODGE: 1, DiceFace.WIND: 1},
        description="ATK=0*STR, SPD*=1.5, dodge-bonus+=1",
        svgPath="/assets/skills/s5.svg"
    ),
    "s6": SkillBase(
        id="s6",
        name="雙倍奉還",
        apCost=90,
        conditions={DiceFace.ATTACK: 2, DiceFace.DODGE: 1, DiceFace.WIND: 1},
        description="ATK=2*STR, SPD=DEX, DEF*=0.6, dodge-bonus=0",
        svgPath="/assets/skills/s6.svg"
    ),
    "s7": SkillBase(
        id="s7",
        name="火球",
        apCost=40,
        conditions={DiceFace.ATTACK: 1, DiceFace.FIRE: 1},
        description="ATK=STR",
        svgPath="/assets/skills/s7.svg"
    ),
    "s8": SkillBase(
        id="s8",
        name="火牆",
        apCost=50,
        conditions={DiceFace.DEFENSE: 1, DiceFace.FIRE: 1},
        description="ATK=0*STR, DEF*=1.1",
        svgPath="/assets/skills/s8.svg"
    ),
    "s9": SkillBase(
        id="s9",
        name="火柱",
        apCost=90,
        conditions={DiceFace.ATTACK: 1, DiceFace.FIRE: 1, DiceFace.WIND: 1},
        description="ATK=2*STR, SPD=DEX, DEF*=0.6, dodge-bonus=0",
        svgPath="/assets/skills/s9.svg"
    ),
    "s10": SkillBase(
        id="s10",
        name="龜縮",
        apCost=40,
        conditions={DiceFace.DEFENSE: 2},
        description="ATK=0*STR, DEF*=1.3, dodge-bonus+=1",
        svgPath="/assets/skills/s10.svg"
    ),
    "s11": SkillBase(
        id="s11",
        name="水槍",
        apCost=50,
        conditions={DiceFace.ATTACK: 2, DiceFace.WATER: 1},
        description="ATK=STR",
        svgPath="/assets/skills/s11.svg"
    ),
    "s12": SkillBase(
        id="s12",
        name="水柱",
        apCost=90,
        conditions={DiceFace.ATTACK: 2, DiceFace.WATER: 2},
        description="ATK=2*STR, dodge-bonus=0",
        svgPath="/assets/skills/s12.svg"
    )
}

async def load_game_data_from_supabase():
    try:
        from .supabase_client import get_supabase_client
        client = await get_supabase_client()
        if not client:
            print("Supabase client not available. Using local default game data.")
            return

        # Fetch from game_data table where id = 1
        # Currently the id might be a string "default" or integer 1.
        # I tested with id=1 in the exploration but some tables use string ids.
        # If we use .eq('id', 'default') it might also work if the id is a string.
        # Let's try to query limit 1
        res = await client.table('game_data').select('*').limit(1).execute()

        if res.data and len(res.data) > 0:
            row = res.data[0]
            print("Successfully loaded game data from Supabase.")

            # Load MONSTERS
            if 'monsters' in row and isinstance(row['monsters'], dict):
                MONSTERS.clear()
                for k, v in row['monsters'].items():
                    # v is dict
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

            # Load SKILLS
            if 'skills' in row and isinstance(row['skills'], dict):
                SKILLS.clear()
                for k, v in row['skills'].items():
                    # Parse conditions (dict of str -> int)
                    conditions = {}
                    for ck, cv in v.get('conditions', {}).items():
                        # The client uses '攻' etc. directly, convert to DiceFace enum if needed,
                        # but DiceFace enum IS a string enum: DiceFace.ATTACK = '攻'
                        # We can just construct it directly or check.
                        try:
                            conditions[DiceFace(ck)] = cv
                        except ValueError:
                            pass # Skip unknown dice faces

                    s = SkillBase(
                        id=v.get('id', k),
                        name=v.get('name', ''),
                        apCost=v.get('apCost', 0),
                        conditions=conditions,
                        description=v.get('description', ''),
                        svgPath=v.get('svgPath')
                    )
                    SKILLS[k] = s

            # Load SETTINGS
            if 'settings' in row and isinstance(row['settings'], dict):
                settings_data = row['settings']
                SETTINGS.accuracyFormula = settings_data.get('accuracyFormula', SETTINGS.accuracyFormula)
                SETTINGS.damageFormula = settings_data.get('damageFormula', SETTINGS.damageFormula)
                SETTINGS.gameTick = settings_data.get('gameTick', SETTINGS.gameTick)
                SETTINGS.engineeringMode = settings_data.get('engineeringMode', SETTINGS.engineeringMode)

        else:
            print("No game data found in Supabase. Using local defaults.")

    except Exception as e:
        print(f"Error loading game data from Supabase: {e}")
        print("Using local default game data.")