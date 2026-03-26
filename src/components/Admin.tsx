import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { MONSTERS, SKILLS, SETTINGS } from '../shared/gameData';
import { MonsterBase, SkillBase, ElementType, DiceFace, GameSettings } from '../shared/types';

export default function Admin({ onBack }: { onBack: () => void }) {
  const [monsters, setMonsters] = useState<Record<string, MonsterBase>>({});
  const [skills, setSkills] = useState<Record<string, SkillBase>>({});
  const [settings, setSettings] = useState<GameSettings>(SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const socket = io(window.location.origin);
    socket.emit('getGameData', (data: { MONSTERS: any, SKILLS: any, SETTINGS: any }) => {
      setMonsters(data.MONSTERS);
      setSkills(data.SKILLS);
      if (data.SETTINGS) setSettings(data.SETTINGS);
      setLoading(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSave = () => {
    const socket = io(window.location.origin);
    socket.emit('updateGameData', { MONSTERS: monsters, SKILLS: skills, SETTINGS: settings });
    setTimeout(() => {
      socket.disconnect();
      alert('儲存成功！');
    }, 100);
  };

  const addMonster = () => {
    const id = `m${Object.keys(monsters).length + 1}`;
    setMonsters({
      ...monsters,
      [id]: {
        id,
        name: '新怪獸',
        type: ElementType.NONE,
        hp: 100,
        str: 20,
        con: 20,
        dex: 20,
        skills: [],
        svgPath: ''
      }
    });
  };

  const addSkill = () => {
    const id = `s${Object.keys(skills).length + 1}`;
    setSkills({
      ...skills,
      [id]: {
        id,
        name: '新技能',
        apCost: 40,
        conditions: { [DiceFace.ATTACK]: 1 },
        description: 'ATK=STR',
        svgPath: ''
      }
    });
  };

  if (loading) return <div className="p-8 text-white">載入中...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto bg-slate-900 min-h-screen text-white">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-amber-500 text-center md:text-left">管理者介面</h2>
        <div className="flex gap-2 md:gap-4 w-full md:w-auto">
          <button onClick={handleSave} className="flex-1 md:flex-none px-4 py-2 bg-green-600 rounded hover:bg-green-500 font-bold text-sm md:text-base">儲存</button>
          <button onClick={onBack} className="flex-1 md:flex-none px-4 py-2 bg-gray-600 rounded hover:bg-gray-500 text-sm md:text-base">返回</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Settings */}
        <div className="bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-700 lg:col-span-2">
          <h3 className="text-xl md:text-2xl font-bold mb-4 text-blue-400">全域設定</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-1">攻擊命中率公式</label>
              <input 
                type="text" 
                value={settings.accuracyFormula} 
                onChange={e => setSettings({ ...settings, accuracyFormula: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">可用變數: attackerSpd, defenderSpd, defenderDodgeBonus</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">傷害計算公式</label>
              <input 
                type="text" 
                value={settings.damageFormula} 
                onChange={e => setSettings({ ...settings, damageFormula: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">可用變數: attackPower, attribBonus, defenderDef</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Game Tick (AP 增加速度, 1-100)</label>
              <input 
                type="number" 
                min="1"
                max="100"
                value={settings.gameTick} 
                onChange={e => setSettings({ ...settings, gameTick: Math.max(1, Math.min(100, Number(e.target.value))) })}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">預設 10。數值越大 AP 恢復越快。</p>
            </div>
            <div className="flex items-center h-full pt-4">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.engineeringMode} 
                  onChange={e => setSettings({ ...settings, engineeringMode: e.target.checked })}
                  className="w-5 h-5 bg-slate-900 border border-slate-600 rounded mr-3"
                />
                <span className="text-sm text-gray-300">啟用工程模式 (在對話框顯示詳細計算參數)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Monsters */}
        <div className="bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl md:text-2xl font-bold text-blue-400">怪獸設定</h3>
            <button onClick={addMonster} className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-500 font-bold">+ 新增</button>
          </div>
          <div className="space-y-6">
            {Object.entries(monsters).map(([id, m]: [string, MonsterBase]) => (
              <div key={id} className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-lg">{m.name} ({id})</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">名稱</label>
                    <input 
                      type="text" 
                      value={m.name} 
                      onChange={e => setMonsters({ ...monsters, [id]: { ...m, name: e.target.value } })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">屬性</label>
                    <select 
                      value={m.type}
                      onChange={e => setMonsters({ ...monsters, [id]: { ...m, type: e.target.value as ElementType } })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                    >
                      {Object.values(ElementType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">HP</label>
                    <input 
                      type="number" 
                      value={m.hp} 
                      onChange={e => setMonsters({ ...monsters, [id]: { ...m, hp: Number(e.target.value) } })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">STR (攻擊)</label>
                    <input 
                      type="number" 
                      value={m.str} 
                      onChange={e => setMonsters({ ...monsters, [id]: { ...m, str: Number(e.target.value) } })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">CON (防禦 - 上限100)</label>
                    <input 
                      type="number" 
                      value={m.con} 
                      onChange={e => setMonsters({ ...monsters, [id]: { ...m, con: Math.min(100, Number(e.target.value)) } })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">DEX (速度 - 上限50)</label>
                    <input 
                      type="number" 
                      value={m.dex} 
                      onChange={e => setMonsters({ ...monsters, [id]: { ...m, dex: Math.min(50, Number(e.target.value)) } })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">擁有技能 (以逗號分隔的技能 ID)</label>
                    <input 
                      type="text" 
                      defaultValue={m.skills.join(', ')} 
                      onBlur={e => setMonsters({ ...monsters, [id]: { ...m, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">圖片/SVG 路徑</label>
                    <input 
                      type="text" 
                      value={m.svgPath || ''} 
                      onChange={e => setMonsters({ ...monsters, [id]: { ...m, svgPath: e.target.value } })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm font-mono"
                      placeholder="/assets/monsters/m1.svg"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl md:text-2xl font-bold text-blue-400">技能設定</h3>
            <button onClick={addSkill} className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-500 font-bold">+ 新增</button>
          </div>
          <div className="bg-slate-900 p-4 rounded-lg mb-6 border border-amber-900/50">
            <h4 className="text-amber-500 font-bold mb-2">效果語法說明 (逗號分隔):</h4>
            <ul className="text-xs text-gray-400 space-y-1 font-mono">
              <li>• ATK=X*STR (攻擊力=倍率*力量)</li>
              <li>• ATK=X (設定固定攻擊力)</li>
              <li>• DEF*=X (防禦力乘上倍率, 上限100)</li>
              <li>• SPD*=X (速度乘上倍率, 上限50)</li>
              <li>• SPD=DEX (重設速度為基礎敏捷)</li>
              <li>• dodge-bonus+=X (增加閃避加成)</li>
              <li>• dodge-bonus=0 (清除閃避加成)</li>
            </ul>
          </div>
          <div className="space-y-6">
            {Object.entries(skills).map(([id, s]: [string, SkillBase]) => (
              <div key={id} className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-lg">{s.name} ({id})</span>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">名稱</label>
                    <input 
                      type="text" 
                      value={s.name} 
                      onChange={e => setSkills({ ...skills, [id]: { ...s, name: e.target.value } })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">AP 消耗</label>
                    <input 
                      type="number" 
                      value={s.apCost} 
                      onChange={e => setSkills({ ...skills, [id]: { ...s, apCost: Number(e.target.value) } })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">描述 (僅顯示用，實際效果在程式碼內)</label>
                    <input 
                      type="text" 
                      value={s.description} 
                      onChange={e => setSkills({ ...skills, [id]: { ...s, description: e.target.value } })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">圖片/SVG 路徑</label>
                    <input 
                      type="text" 
                      value={s.svgPath || ''} 
                      onChange={e => setSkills({ ...skills, [id]: { ...s, svgPath: e.target.value } })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm font-mono"
                      placeholder="/assets/skills/s1.svg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">發動條件 (JSON 格式)</label>
                    <textarea 
                      defaultValue={JSON.stringify(s.conditions, null, 2)} 
                      onBlur={e => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setSkills({ ...skills, [id]: { ...s, conditions: parsed } });
                        } catch (err) {
                          alert('Invalid JSON format for conditions');
                          e.target.value = JSON.stringify(s.conditions, null, 2);
                        }
                      }}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm font-mono h-32"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
