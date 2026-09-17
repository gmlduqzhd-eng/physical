import { useState } from 'react';
import { supabase } from '../../../data/supabase';
import type { MissionTemplate } from '../../../domain/types';
import { Zap, Loader2 } from 'lucide-react';

interface QuickStartProps {
  templates: MissionTemplate[];
  onRoomCreated: (roomId: string) => void;
  onRefresh: () => void;
}

export const QuickStart = ({ templates, onRoomCreated, onRefresh }: QuickStartProps) => {
  const [loading, setLoading] = useState(false);

  const handleQuickStart = async () => {
    if (templates.length === 0) {
      alert('먼저 템플릿을 1개 이상 만들어주세요.');
      return;
    }

    setLoading(true);

    const recentTemplate = templates[0]; // 가장 최근 템플릿
    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}`;
    const roomName = `오늘의 원정대 (${dateStr})`;
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const { data, error } = await supabase.from('game_rooms')
      .insert([{ pin_code: pin, name: roomName, template_id: recentTemplate.id }])
      .select('id')
      .single();

    setLoading(false);

    if (error || !data) {
      alert('방 생성에 실패했습니다.');
      return;
    }

    // 기본 모둠 8개 자동 생성
    const groups = Array.from({ length: 8 }, (_, i) => ({
      room_id: data.id,
      group_name: `${i + 1}모둠`,
      avatar: 'Smile'
    }));
    await supabase.from('room_groups').insert(groups);

    onRefresh();
    onRoomCreated(data.id);

    alert(`✅ 방이 생성되었습니다!\n\n📋 방 이름: ${roomName}\n🔑 PIN: ${pin}\n📦 템플릿: ${recentTemplate.name}\n👥 모둠: 1~8모둠 자동 생성`);
  };

  return (
    <button
      onClick={handleQuickStart}
      disabled={loading || templates.length === 0}
      className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl font-black text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mb-6 border-2 border-cyan-400/30"
    >
      {loading ? (
        <><Loader2 className="w-6 h-6 animate-spin" /> 방 생성 중...</>
      ) : (
        <><Zap className="w-6 h-6" /> ⚡ 빠른 수업 시작 (원클릭 방 생성)</>
      )}
    </button>
  );
};
