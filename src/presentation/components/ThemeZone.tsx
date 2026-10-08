import { ChevronRight, Trophy } from 'lucide-react';

export type ThemeModeId =
  | 'streak'
  | 'tamagotchi'
  | 'mbti'
  | 'cooldown'
  | 'splitBattle'
  | 'quickPin'
  | 'stationCircuit'
  | 'motionCam'
  | 'classPlaylist'
  | 'remote';

type ThemeGroupId = 'solo' | 'versus' | 'teacher';

interface ThemeMode {
  id: ThemeModeId;
  group: ThemeGroupId;
  emoji: string;
  title: string;
  desc: string;
}

interface ThemeGroup {
  id: ThemeGroupId;
  emoji: string;
  label: string;
  /** 'tile' = 4열 세로 카드, 'row' = 2열 가로 카드 (항목이 적은 그룹용) */
  layout: 'tile' | 'row';
  /** Tailwind는 정적 클래스만 수집하므로 그룹 색상 클래스를 문자열로 고정해 둔다. */
  accent: { text: string; iconBg: string; hoverBorder: string };
}

const GROUPS: ThemeGroup[] = [
  {
    id: 'solo', emoji: '🙋', label: '혼자 하기', layout: 'tile',
    accent: { text: 'text-cyan-300', iconBg: 'bg-cyan-500/10 ring-cyan-500/25', hoverBorder: 'hover:border-cyan-500/60' },
  },
  {
    id: 'versus', emoji: '⚔️', label: '함께 대결', layout: 'tile',
    accent: { text: 'text-amber-300', iconBg: 'bg-amber-500/10 ring-amber-500/25', hoverBorder: 'hover:border-amber-500/60' },
  },
  {
    id: 'teacher', emoji: '🧑‍🏫', label: '선생님 도구', layout: 'row',
    accent: { text: 'text-purple-300', iconBg: 'bg-purple-500/10 ring-purple-500/25', hoverBorder: 'hover:border-purple-500/60' },
  },
];

const MODES: ThemeMode[] = [
  { id: 'streak', group: 'solo', emoji: '🔥', title: '3분 땀방울 챌린지', desc: '매일 루틴 & 불꽃 스탬프' },
  { id: 'tamagotchi', group: 'solo', emoji: '💧', title: '내 땀방이 키우기', desc: '캐릭터 육성 & 아이템 룸' },
  { id: 'mbti', group: 'solo', emoji: '🦁', title: '나의 체육 MBTI', desc: '1분 동물 페르소나 찾기' },
  { id: 'cooldown', group: 'solo', emoji: '🫀', title: '쿨다운 & 심박수 루틴', desc: '호흡 이완 & 맥박 체크' },

  { id: 'splitBattle', group: 'versus', emoji: '🤼', title: '2인 배틀 대결', desc: '화면 분할 줄다리기·연타' },
  { id: 'quickPin', group: 'versus', emoji: '🔢', title: '4자리 PIN 학급대항전', desc: '청팀 vs 백팀 즉시 대결' },
  { id: 'stationCircuit', group: 'versus', emoji: '🏟️', title: 'QR 스테이션 서킷', desc: '4구역 순환 미션 스탬프' },
  { id: 'motionCam', group: 'versus', emoji: '📷', title: '모션 감지 캠 챌린지', desc: '카메라 앞 핸즈프리 점프' },

  { id: 'classPlaylist', group: 'teacher', emoji: '⏱️', title: '40분 수업 플레이어', desc: '도입-전개-정리 원스톱' },
  { id: 'remote', group: 'teacher', emoji: '📱', title: '교사 스마트 리모컨', desc: '호루라기 휘슬 & 타이머 통제' },
];

interface ThemeZoneProps {
  onSelect: (id: ThemeModeId) => void;
  onOpenBadgeArchive: () => void;
}

export const ThemeZone = ({ onSelect, onOpenBadgeArchive }: ThemeZoneProps) => (
  <section className="px-4 md:px-8 max-w-5xl mx-auto pt-4 pb-1" aria-labelledby="theme-zone-title">
    <div className="flex items-center justify-between mb-3">
      <h2 id="theme-zone-title" className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 whitespace-nowrap">
        ⚡ 신나는 스마트 체육 특별 테마존
      </h2>
      <button
        id="theme-zone-badge-archive"
        onClick={onOpenBadgeArchive}
        className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-amber-300 transition-colors"
      >
        <Trophy className="w-3.5 h-3.5" /> 배지 도감 <ChevronRight className="w-3 h-3" />
      </button>
    </div>

    <div className="flex flex-col gap-4">
      {GROUPS.map(group => (
        <ThemeGroupRow key={group.id} group={group} modes={MODES.filter(m => m.group === group.id)} onSelect={onSelect} />
      ))}
    </div>
  </section>
);

const ThemeGroupRow = ({ group, modes, onSelect }: { group: ThemeGroup; modes: ThemeMode[]; onSelect: (id: ThemeModeId) => void }) => (
  <div role="group" aria-label={group.label}>
    <h3 className={`text-[11px] font-black mb-1.5 flex items-center gap-1 ${group.accent.text}`}>
      <span aria-hidden>{group.emoji}</span> {group.label}
    </h3>
    <div className={`grid gap-2 ${group.layout === 'tile' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {modes.map(mode => (
        <ThemeCard key={mode.id} mode={mode} group={group} onClick={() => onSelect(mode.id)} />
      ))}
    </div>
  </div>
);

const ThemeCard = ({ mode, group, onClick }: { mode: ThemeMode; group: ThemeGroup; onClick: () => void }) => {
  const isRow = group.layout === 'row';
  return (
    <button
      id={`theme-mode-${mode.id}`}
      onClick={onClick}
      className={`group p-3 rounded-xl bg-slate-900/60 border border-slate-800 ${group.accent.hoverBorder} hover:-translate-y-0.5 transition-all text-left flex ${isRow ? 'items-center gap-3' : 'flex-col gap-2'}`}
    >
      <span className={`w-9 h-9 shrink-0 rounded-lg ring-1 flex items-center justify-center text-xl ${group.accent.iconBg}`} aria-hidden>
        {mode.emoji}
      </span>
      {/* 버튼 안 <p>만 줄바꿈 허용(index.css) → 좁은 모바일 2열에서도 제목이 잘리지 않음 */}
      <div className="min-w-0 flex-1">
        <p className={`font-extrabold text-sm text-white leading-snug ${isRow ? 'truncate' : ''}`}>{mode.title}</p>
        <p className={`text-[11px] text-slate-400 mt-0.5 ${isRow ? 'truncate' : ''}`}>{mode.desc}</p>
      </div>
      {isRow && <ChevronRight className="w-4 h-4 shrink-0 text-slate-600 group-hover:text-slate-300 transition-colors" />}
    </button>
  );
};
