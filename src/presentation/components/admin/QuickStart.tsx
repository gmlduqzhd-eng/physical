import { useState } from 'react';
import { supabase } from '../../../data/supabase';
import type { MissionTemplate } from '../../../domain/types';
import { Zap, Loader2, X, Copy, Check, ExternalLink } from 'lucide-react';

interface QuickStartProps {
  templates: MissionTemplate[];
  onRoomCreated: (roomId: string) => void;
  onRefresh: () => void;
}

interface CreatedRoom {
  id: string;
  name: string;
  pin: string;
  templateName: string;
  groupCount: number;
}

export const QuickStart = ({ templates, onRoomCreated, onRefresh }: QuickStartProps) => {
  const [loading, setLoading] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<CreatedRoom | null>(null);
  const [copied, setCopied] = useState(false);

  const handleQuickStart = async () => {
    setLoading(true);

    const recentTemplate = templates.length > 0 ? templates[0] : null;
    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}`;
    const roomName = `오늘의 원정대 (${dateStr})`;
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const groupCount = 8;

    const { data, error } = await supabase.from('game_rooms')
      .insert([{ pin_code: pin, name: roomName, template_id: recentTemplate?.id || null }])
      .select('id')
      .single();

    if (error || !data) {
      setLoading(false);
      alert('방 생성에 실패했습니다.');
      return;
    }

    // 기본 모둠 자동 생성
    const groups = Array.from({ length: groupCount }, (_, i) => ({
      room_id: data.id,
      group_name: `${i + 1}모둠`,
      avatar: 'Smile'
    }));
    await supabase.from('room_groups').insert(groups);

    setLoading(false);
    onRefresh();
    onRoomCreated(data.id);

    setCreatedRoom({
      id: data.id,
      name: roomName,
      pin,
      templateName: recentTemplate?.name || '(기본 템플릿 없음)',
      groupCount,
    });
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(createdRoom?.pin || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const baseUrl = window.location.origin;

  return (
    <>
      <button
        onClick={handleQuickStart}
        disabled={loading}
        className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl font-black text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mb-6 border-2 border-cyan-400/30"
      >
        {loading ? (
          <><Loader2 className="w-6 h-6 animate-spin" /> 방 생성 중...</>
        ) : (
          <><Zap className="w-6 h-6" /> ⚡ 빠른 수업 시작 (3초 원클릭)</>
        )}
      </button>

      {/* 생성 완료 대형 모달 */}
      {createdRoom && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setCreatedRoom(null)} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>

            {/* 성공 헤더 */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">수업 준비 완료! 🎉</h2>
              <p className="text-sm text-slate-500 mt-1">{createdRoom.name}</p>
            </div>

            {/* PIN 코드 대형 표시 */}
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-2xl p-6 mb-5 text-center">
              <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-2">입장 PIN 코드</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-6xl font-black text-cyan-700 tracking-[0.3em] font-mono">{createdRoom.pin}</span>
                <button onClick={handleCopyPin} className="p-2 bg-white border border-cyan-200 rounded-lg hover:bg-cyan-50 transition-colors" title="PIN 복사">
                  {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-cyan-500" />}
                </button>
              </div>
              <p className="text-xs text-cyan-500 mt-2">학생들에게 이 핀 번호를 불러주세요</p>
            </div>

            {/* 전체 입장 QR 코드 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-5 text-center">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">📱 전체 입장 QR 코드</p>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${baseUrl}/lobby`)}`}
                alt="입장 QR"
                className="w-48 h-48 mx-auto mb-2 border border-slate-200 rounded-xl"
              />
              <p className="text-xs text-slate-400">QR 스캔 → PIN 입력 → 바로 참여!</p>
            </div>

            {/* 방 정보 요약 */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <p className="text-xs text-slate-400 font-bold">템플릿</p>
                <p className="text-sm font-bold text-slate-700 truncate">{createdRoom.templateName}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <p className="text-xs text-slate-400 font-bold">모둠 수</p>
                <p className="text-sm font-bold text-slate-700">{createdRoom.groupCount}개 모둠</p>
              </div>
            </div>

            {/* TV 전광판 바로가기 */}
            <a
              href={`/board/${createdRoom.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> TV 전광판 열기
            </a>
          </div>
        </div>
      )}
    </>
  );
};
