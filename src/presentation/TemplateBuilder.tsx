import { useState, useEffect } from 'react';
import { supabase } from '../data/supabase';
import type { MissionButton, MissionTemplate } from '../domain/types';
import * as LucideIcons from 'lucide-react';

const ICONS = [
  'Footprints', 'Activity', 'Users', 'Flame', 'Shield', 
  'Zap', 'Dumbbell', 'HeartPulse', 'Target', 'Trophy',
  'Star', 'Swords', 'Wind', 'Waves', 'Mountain'
];

const THEMES = [
  { name: 'Cyan (청록)', color: 'text-cyan-400', bg: 'bg-cyan-950/40 border-cyan-900' },
  { name: 'Blue (파랑)', color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-900' },
  { name: 'Emerald (에메랄드)', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-900' },
  { name: 'Orange (주황)', color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-900' },
  { name: 'Purple (보라)', color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-900' },
  { name: 'Yellow (노랑)', color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-900' },
  { name: 'Red (빨강)', color: 'text-red-400', bg: 'bg-red-950/40 border-red-900' },
];

interface TemplateBuilderProps {
  initialTemplate?: MissionTemplate | null;
  onBack: () => void;
  onSuccess: () => void;
}

export const TemplateBuilder = ({ initialTemplate, onBack, onSuccess }: TemplateBuilderProps) => {
  const [name, setName] = useState('');
  const [buttons, setButtons] = useState<MissionButton[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialTemplate) {
      setName(initialTemplate.name);
      setButtons(initialTemplate.buttons);
    }
  }, [initialTemplate]);

  const addButton = () => {
    const newButton: MissionButton = {
      id: `mission-${Date.now()}`,
      title: '새로운 미션',
      desc: '미션 설명을 입력하세요',
      amount: 10,
      cooldown: 3,
      iconName: 'Activity',
      color: THEMES[0].color,
      bg: THEMES[0].bg,
    };
    setButtons([...buttons, newButton]);
  };

  const updateButton = (index: number, field: keyof MissionButton, value: any) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setButtons(newButtons);
  };

  const updateTheme = (index: number, themeIndex: number) => {
    const newButtons = [...buttons];
    newButtons[index].color = THEMES[themeIndex].color;
    newButtons[index].bg = THEMES[themeIndex].bg;
    setButtons(newButtons);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const moveButton = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === buttons.length - 1) return;
    
    const newButtons = [...buttons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newButtons[index];
    newButtons[index] = newButtons[targetIndex];
    newButtons[targetIndex] = temp;
    
    setButtons(newButtons);
  };

  const handleSave = async () => {
    if (!name.trim()) return alert('템플릿 이름을 입력해주세요.');
    if (buttons.length === 0) return alert('최소 1개 이상의 미션 버튼을 추가해주세요.');
    
    setLoading(true);
    
    let error;
    if (initialTemplate) {
      const { error: updateErr } = await supabase.from('mission_templates')
        .update({ name, buttons })
        .eq('id', initialTemplate.id);
      error = updateErr;
    } else {
      const { error: insertErr } = await supabase.from('mission_templates')
        .insert([{ name, buttons }]);
      error = insertErr;
    }

    setLoading(false);
    if (error) {
      alert('템플릿 저장 중 오류가 발생했습니다.');
      console.error(error);
    } else {
      alert('성공적으로 저장되었습니다!');
      onSuccess();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-xl space-y-6">
      <div className="flex justify-between items-center border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-bold text-white">
          {initialTemplate ? '템플릿 수정하기' : '나만의 미션 템플릿 만들기'}
        </h2>
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors text-sm font-bold">
          &larr; 돌아가기
        </button>
      </div>

      <div>
        <label className="block text-slate-300 font-bold mb-2">템플릿 이름</label>
        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 6학년 1학기 왕복달리기 세트" 
          className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-slate-300 font-bold">미션 버튼 목록 ({buttons.length}개)</label>
          <button onClick={addButton} className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 font-bold border border-emerald-500/30 rounded-lg text-sm transition-colors">
            + 새 미션 추가
          </button>
        </div>

        {buttons.length === 0 && (
          <div className="text-center py-10 bg-slate-800/50 rounded-xl border border-dashed border-slate-600 text-slate-500">
            아직 추가된 미션이 없습니다.<br/>위젯의 '새 미션 추가' 버튼을 눌러보세요.
          </div>
        )}

        <div className="space-y-4">
          {buttons.map((btn, i) => {
            const IconComp = (LucideIcons as any)[btn.iconName] || LucideIcons.Activity;
            
            return (
              <div key={btn.id} className={`p-4 border rounded-xl flex flex-col gap-4 relative ${btn.bg}`}>
                <div className="absolute top-4 right-4 flex gap-2">
                  <div className="flex bg-slate-900/80 rounded overflow-hidden">
                    <button 
                      onClick={() => moveButton(i, 'up')} 
                      disabled={i === 0}
                      className="px-2 py-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border-r border-slate-700/50"
                    >
                      <LucideIcons.ChevronUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => moveButton(i, 'down')} 
                      disabled={i === buttons.length - 1}
                      className="px-2 py-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <LucideIcons.ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={() => removeButton(i)} className="text-slate-400 hover:text-red-400 font-bold text-xs bg-slate-900/80 px-2 py-1 rounded">
                    삭제
                  </button>
                </div>
                
                <div className="flex gap-4 items-center border-b border-white/10 pb-4 mt-2">
                  <div className={`w-12 h-12 rounded-full bg-slate-950/50 flex items-center justify-center border border-white/10 shrink-0 ${btn.color}`}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div className="flex-1 pr-16">
                    <input 
                      type="text" value={btn.title} onChange={e => updateButton(i, 'title', e.target.value)}
                      placeholder="미션 제목 (예: 버피 테스트)"
                      className={`bg-transparent text-xl font-black w-full focus:outline-none ${btn.color}`}
                    />
                    <input 
                      type="text" value={btn.desc} onChange={e => updateButton(i, 'desc', e.target.value)}
                      placeholder="설명 (예: 5회 반복)"
                      className="bg-transparent text-sm text-slate-300 font-bold w-full focus:outline-none mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">지급 점수 (점)</label>
                    <input type="number" value={btn.amount} onChange={e => updateButton(i, 'amount', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono"/>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">쿨다운 (초)</label>
                    <input type="number" value={btn.cooldown} onChange={e => updateButton(i, 'cooldown', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono"/>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">아이콘</label>
                    <select value={btn.iconName} onChange={e => updateButton(i, 'iconName', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                      {ICONS.map(icon => <option key={icon} value={icon}>{icon}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">색상 테마</label>
                    <select 
                      value={THEMES.findIndex(t => t.color === btn.color)} 
                      onChange={e => updateTheme(i, Number(e.target.value))} 
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                    >
                      {THEMES.map((theme, idx) => <option key={idx} value={idx}>{theme.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button 
        onClick={handleSave} 
        disabled={loading}
        className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-lg text-white transition-colors mt-4"
      >
        {loading ? '저장 중...' : '템플릿 저장하기'}
      </button>
    </div>
  );
};
