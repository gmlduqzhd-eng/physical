import { useState, useRef, useCallback } from 'react';
import { X, RotateCcw, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hapticHeavy, hapticTap, sfxSuccess } from '../../application/soundEffects';

// 룰렛에서 사용하는 게임 정보 (type = 라우트 경로)
interface RouletteGame {
  type: string;
  name: string;
  emoji: string;
}

interface RouletteSection {
  label: string;
  emoji: string;
  color: string;
  games: RouletteGame[];
}

const SECTIONS: RouletteSection[] = [
  {
    label: '상체',
    emoji: '💪',
    color: '#06b6d4',
    games: [
      { type: 'punch', name: '에어 펀치', emoji: '🥊' },
      { type: 'arm_raise', name: '하늘 높이', emoji: '🙌' },
      { type: 'wave', name: '좌우 흔들기', emoji: '👋' },
      { type: 'multi_touch', name: '양손 터치', emoji: '🖐️' },
    ],
  },
  {
    label: '하체',
    emoji: '🦵',
    color: '#8b5cf6',
    games: [
      { type: 'jump', name: '점프왕', emoji: '🦘' },
      { type: 'squat', name: '스쿼트 챌린지', emoji: '🏋️' },
      { type: 'run', name: '제자리 달리기', emoji: '🏃' },
      { type: 'zigzag', name: '지그재그 런', emoji: '⚡' },
    ],
  },
  {
    label: '전신',
    emoji: '🏃',
    color: '#f59e0b',
    games: [
      { type: 'shake', name: '바운스 충전', emoji: '📳' },
      { type: 'animal', name: '동물 체조', emoji: '🐻' },
      { type: 'volcano', name: '화산 폭발', emoji: '🌋' },
      { type: 'freeze', name: '얼음 땡', emoji: '🧊' },
    ],
  },
  {
    label: '코어',
    emoji: '🧘',
    color: '#10b981',
    games: [
      { type: 'plank', name: '플랭크 챌린지', emoji: '💪' },
      { type: 'tilt_balance', name: '균형 잡기', emoji: '⚖️' },
      { type: 'one_leg', name: '한 발 서기', emoji: '🦩' },
      { type: 'body_twist', name: '몸 비틀기', emoji: '🌀' },
    ],
  },
  {
    label: '스트레칭',
    emoji: '🤸',
    color: '#ec4899',
    games: [
      { type: 'stretch', name: '스트레칭 타이머', emoji: '🧘' },
      { type: 'speed_circle', name: '빙글빙글', emoji: '🔄' },
      { type: 'circle_draw', name: '원 그리기 대결', emoji: '⭕' },
      { type: 'dance_pose', name: '댄스 포즈', emoji: '💃' },
    ],
  },
];

interface WarmupRouletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WarmupRoulette = ({ isOpen, onClose }: WarmupRouletteProps) => {
  const navigate = useNavigate();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<RouletteSection | null>(null);
  const [recommendedGame, setRecommendedGame] = useState<RouletteGame | null>(null);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sectionAngle = 360 / SECTIONS.length; // 72° per section

  const handleSpin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    setRecommendedGame(null);
    hapticTap();

    // 랜덤 최종 각도: 5~8바퀴 + 랜덤 오프셋
    const extraSpins = (5 + Math.random() * 3) * 360;
    const randomOffset = Math.random() * 360;
    const totalRotation = rotation + extraSpins + randomOffset;

    setRotation(totalRotation);

    // 회전 멈춘 뒤 결과 계산 (CSS transition 3.5초 대기)
    spinTimeoutRef.current = setTimeout(() => {
      // 멈춘 각도 → 어떤 섹션에 해당하는지 계산
      const normalizedAngle = (360 - (totalRotation % 360) + 90) % 360;
      const sectionIndex = Math.floor(normalizedAngle / sectionAngle) % SECTIONS.length;
      const selected = SECTIONS[sectionIndex];

      setResult(selected);
      const pick = selected.games[Math.floor(Math.random() * selected.games.length)];
      setRecommendedGame(pick);
      setSpinning(false);
      hapticHeavy();
      sfxSuccess();
    }, 3600);
  }, [spinning, rotation, sectionAngle]);

  const handleReset = () => {
    setResult(null);
    setRecommendedGame(null);
    setRotation(0);
  };

  const handlePlayGame = () => {
    if (recommendedGame) {
      onClose();
      navigate(`/play/${recommendedGame.type}`);
    }
  };

  if (!isOpen) return null;

  // SVG 원형 룰렛 (pie chart 방식)
  const radius = 130;
  const center = 150;

  const renderSectors = () => {
    return SECTIONS.map((section, i) => {
      const startAngle = (i * sectionAngle - 90) * (Math.PI / 180);
      const endAngle = ((i + 1) * sectionAngle - 90) * (Math.PI / 180);

      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);

      const largeArc = sectionAngle > 180 ? 1 : 0;

      const pathData = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z',
      ].join(' ');

      // 라벨 위치 (섹터 중앙)
      const midAngle = ((i + 0.5) * sectionAngle - 90) * (Math.PI / 180);
      const labelR = radius * 0.65;
      const lx = center + labelR * Math.cos(midAngle);
      const ly = center + labelR * Math.sin(midAngle);

      return (
        <g key={i}>
          <path d={pathData} fill={section.color} stroke="#1e293b" strokeWidth="2" />
          <text
            x={lx}
            y={ly - 8}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-2xl"
            style={{ fontSize: '24px' }}
          >
            {section.emoji}
          </text>
          <text
            x={lx}
            y={ly + 14}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontWeight="900"
            style={{ fontSize: '12px' }}
          >
            {section.label}
          </text>
        </g>
      );
    });
  };

  return (
    <div
      className="fixed inset-0 z-[10005] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative flex flex-col items-center"
        onClick={e => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-black text-white mb-1">🎯 오늘의 워밍업</h2>
        <p className="text-xs text-slate-400 font-bold mb-4">어떤 부위를 워밍업할까요?</p>

        {/* 포인터 (12시 방향 삼각형) */}
        <div className="relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-yellow-400 drop-shadow-lg" />
          </div>

          {/* 룰렛 SVG */}
          <div
            className="transition-transform ease-out"
            style={{
              transform: `rotate(${rotation}deg)`,
              transitionDuration: spinning ? '3.5s' : '0s',
              transitionTimingFunction: 'cubic-bezier(0.17, 0.67, 0.12, 0.99)',
            }}
          >
            <svg width="300" height="300" viewBox="0 0 300 300" className="drop-shadow-2xl">
              {/* 외곽 링 */}
              <circle cx={center} cy={center} r={radius + 8} fill="none" stroke="#334155" strokeWidth="4" />
              <circle cx={center} cy={center} r={radius} fill="#0f172a" />
              {renderSectors()}
              {/* 가운데 원 */}
              <circle cx={center} cy={center} r="22" fill="#0f172a" stroke="#475569" strokeWidth="3" />
              <text x={center} y={center} textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontWeight="900" fontSize="10">
                SPIN
              </text>
            </svg>
          </div>
        </div>

        {/* 돌리기 / 결과 영역 */}
        <div className="mt-4 w-full flex flex-col items-center gap-3">
          {!result ? (
            <button
              onClick={handleSpin}
              disabled={spinning}
              className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all shadow-lg border-2 ${
                spinning
                  ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-400/30 active:scale-95'
              }`}
            >
              {spinning ? (
                <>
                  <span className="animate-spin text-xl">🎡</span> 돌아가는 중...
                </>
              ) : (
                <>🎡 돌리기!</>
              )}
            </button>
          ) : (
            <div className="w-full bg-slate-800/80 rounded-2xl p-5 border border-slate-700 text-center animate-in zoom-in-95 duration-200">
              <div className="text-4xl mb-2">{result.emoji}</div>
              <h3 className="text-xl font-black text-white mb-1">
                오늘의 워밍업: <span style={{ color: result.color }}>{result.label}</span>
              </h3>

              {/* 추천 미니게임 — 클릭하면 바로 실행 */}
              <button
                onClick={handlePlayGame}
                className="w-full bg-slate-900 hover:bg-slate-800 rounded-xl px-4 py-3.5 mt-3 border border-cyan-500/40 hover:border-cyan-400 transition-all group cursor-pointer text-left"
              >
                <p className="text-[11px] text-slate-400 font-bold mb-1">추천 미니게임 (탭하여 바로 시작!)</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{recommendedGame?.emoji}</span>
                    <span className="text-lg font-black text-cyan-300 group-hover:text-cyan-200 transition-colors">
                      {recommendedGame?.name}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 text-white ml-0.5" />
                  </div>
                </div>
              </button>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> 다시 돌리기
                </button>
                <button
                  onClick={handlePlayGame}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  <Play className="w-3.5 h-3.5" /> 게임 시작!
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
