import {LocalQRCode} from '../LocalQRCode';
import { useState } from 'react';
import { createClassroom, classroomError, openClassroomBoard } from '../../../data/classroomRepository';
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
  groupPins: {group_name:string;short_pin:string}[];
}

export const QuickStart = ({ templates, onRoomCreated, onRefresh }: QuickStartProps) => {
  const [loading, setLoading] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<CreatedRoom | null>(null);
  const [copied, setCopied] = useState(false);

  const handleQuickStart = async () => {
    if (loading) return;
    if (!templates.some(template => template.buttons.length > 0)) {
      alert('먼저 미션이 있는 템플릿을 만들어주세요.');
      return;
    }
    setLoading(true);

    const recentTemplate = templates.find(template => template.buttons.length > 0)!;
    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}`;
    const roomName = `오늘의 원정대 (${dateStr})`;
    const groupCount = 8;

    try {
      const room = await createClassroom(roomName, recentTemplate.id, Array.from({ length: groupCount }, (_, i) => `${i + 1}모둠`));
      onRefresh(); onRoomCreated(room.id);
      const {data:invites,error:inviteError}=await supabase.rpc('get_classroom_invites',{room_uuid:room.id});
      if(inviteError || !Array.isArray(invites) || invites.some(item=>!item.short_pin)) throw new Error('모둠 PIN을 불러오지 못했습니다. 방 관리 화면에서 확인해주세요.');
      setCreatedRoom({ id: room.id, name: roomName, pin: room.pin_code, templateName: recentTemplate.name, groupCount, groupPins: invites });
    } catch (cause) { alert(classroomError(cause, '방 생성에 실패했습니다.')); }
    finally { setLoading(false); }
  };

  const handleCopyPin = async () => {
    try {
      await navigator.clipboard.writeText(createdRoom?.pin || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { alert(`PIN: ${createdRoom?.pin || ''} — 직접 복사해주세요.`); }
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
              <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-2">모둠별 4자리 입장 PIN</p>
              <div className="grid grid-cols-2 gap-2 text-left">{createdRoom.groupPins.map(item=><p key={item.group_name} className="rounded-lg bg-white p-2 font-bold">{item.group_name}: <span className="font-mono text-2xl">{item.short_pin}</span></p>)}</div>
              <details className="mt-3 text-sm"><summary>교사 복구용 8자리 PIN</summary><p>{createdRoom.pin}</p><button onClick={handleCopyPin} className="p-2 bg-white border border-cyan-200 rounded-lg" title="복구 PIN 복사">{copied ? <Check className="w-5 h-5 text-emerald-600"/> : <Copy className="w-5 h-5 text-cyan-500"/>}</button></details>
              <p className="text-xs text-cyan-500 mt-2">학생에게 자기 모둠 PIN만 알려주세요.</p>
            </div>

            {/* 전체 입장 QR 코드 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-5 text-center">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">📱 전체 입장 QR 코드</p>
              <LocalQRCode value={baseUrl+'/lobby'} alt="학생 입장 QR" className="w-36 h-36 mx-auto"/>
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
              href={`/board/${createdRoom.id}`} onClick={e=>{e.preventDefault();void openClassroomBoard(createdRoom.id);}}
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
