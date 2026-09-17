import type { RoomGroup, GameRoom, MissionTemplate } from '../../domain/types';
import * as LucideIcons from 'lucide-react';

interface WaitingScreenProps {
  myGroup: RoomGroup;
  scores: RoomGroup[];
  template: MissionTemplate | null;
  studentName: string;
  gameRoom: GameRoom | null;
}

export const WaitingScreen = ({ myGroup, scores, template, studentName, gameRoom }: WaitingScreenProps) => {
  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LucideIcons.Shield className="w-6 h-6 text-cyan-500" />
          <span className="font-black text-lg text-cyan-600">땀방울 원정대</span>
        </div>
        <span className="text-sm text-slate-500 font-bold">{gameRoom?.name}</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* Waiting animation */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-cyan-100 flex items-center justify-center animate-pulse">
            <LucideIcons.Timer className="w-12 h-12 text-cyan-500" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white">
            <LucideIcons.Check className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-800 mb-2">접속 완료!</h1>
          <p className="text-slate-500 font-bold">선생님이 곧 게임을 시작합니다</p>
          <p className="text-slate-400 text-sm mt-1">잠시만 기다려주세요...</p>
        </div>

        {/* My info card */}
        <div className="w-full max-w-sm bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-500 text-sm font-bold">내 정보</span>
            <span className="px-3 py-1 bg-cyan-50 text-cyan-600 text-xs font-bold rounded-full border border-cyan-200">대기 중</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
              <LucideIcons.User className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <p className="font-black text-lg">{studentName || '이름 없음'}</p>
              <p className="text-sm text-slate-500 font-bold">{myGroup.group_name}</p>
            </div>
          </div>
        </div>

        {/* Participant count */}
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
          <LucideIcons.Users className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-bold text-emerald-700">현재 {scores.length}개 모둠 참여 중</span>
        </div>

        {/* Mission preview */}
        {template && template.buttons && template.buttons.length > 0 && (
          <div className="w-full max-w-sm">
            <p className="text-xs text-slate-400 font-bold mb-2 text-center">오늘의 미션 미리보기</p>
            <div className="space-y-2">
              {template.buttons.slice(0, 3).map((m, i) => {
                const IconComp = (LucideIcons as unknown as Record<string, React.ElementType>)[m.iconName] || LucideIcons.Activity;
                return (
                  <div key={m.id || i} className={`p-3 border rounded-xl flex items-center gap-3 opacity-60 ${m.bg}`}>
                    <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center ${m.color}`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${m.color}`}>{m.title}</p>
                      <p className="text-xs text-slate-400">{m.desc}</p>
                    </div>
                  </div>
                );
              })}
              {template.buttons.length > 3 && (
                <p className="text-xs text-slate-400 text-center font-bold">외 {template.buttons.length - 3}개 미션...</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
