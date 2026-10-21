import React, { useMemo } from 'react';
import { useMotionIntensity, type MotionIntensityLevel } from '../../../application/useMotionIntensity';

/**
 * 실시간 움직임 강도 위젯 (MotionIntensityWidget)
 *
 * 화면 우하단에 떠 있는 작은 원형 뱃지로, 현재 움직임 강도를 시각적으로 표시합니다.
 * - 색상·이모지·라벨이 idle / low / active / vigorous 레벨에 따라 변화
 * - SVG 원형 프로그레스 링으로 intensity 수치를 표현
 * - DeviceMotion 미지원 디바이스에서는 자동으로 숨김 (graceful degradation)
 */

// ---------------------------------------------------------------------------
// Level → visual mapping
// ---------------------------------------------------------------------------

interface LevelVisual {
  emoji: string;
  label: string;
  ringColor: string;       // stroke color for SVG ring
  bgClass: string;         // Tailwind background classes
  textClass: string;       // Tailwind text color class
  glowClass: string;       // optional glow / animation classes
}

const LEVEL_VISUALS: Record<MotionIntensityLevel, LevelVisual> = {
  idle: {
    emoji: '😴',
    label: '몸을 움직여보세요!',
    ringColor: '#ef4444',         // red-500
    bgClass: 'bg-red-500/20 border-red-500/40',
    textClass: 'text-red-400',
    glowClass: 'animate-pulse',
  },
  low: {
    emoji: '🚶',
    label: '조금 더!',
    ringColor: '#f59e0b',         // amber-500
    bgClass: 'bg-amber-500/20 border-amber-500/40',
    textClass: 'text-amber-400',
    glowClass: '',
  },
  active: {
    emoji: '🏃',
    label: '좋아요!',
    ringColor: '#10b981',         // emerald-500
    bgClass: 'bg-emerald-500/20 border-emerald-500/40',
    textClass: 'text-emerald-400',
    glowClass: '',
  },
  vigorous: {
    emoji: '🔥',
    label: '대단해요! 🔥',
    ringColor: '#22d3ee',         // cyan-400
    bgClass: 'bg-cyan-400/20 border-cyan-400/40',
    textClass: 'text-cyan-300',
    glowClass: 'shadow-[0_0_14px_rgba(34,211,238,0.6)]',
  },
};

// ---------------------------------------------------------------------------
// SVG progress ring constants
// ---------------------------------------------------------------------------

const RING_SIZE = 48;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MotionIntensityWidgetProps {
  /** 위젯 표시 여부 (기본 true) */
  enabled?: boolean;
}

export const MotionIntensityWidget: React.FC<MotionIntensityWidgetProps> = ({
  enabled = true,
}) => {
  const { intensity, level, isSupported } = useMotionIntensity();

  const visual = useMemo(() => LEVEL_VISUALS[level], [level]);

  const strokeDashoffset = useMemo(
    () => RING_CIRCUMFERENCE - (intensity / 100) * RING_CIRCUMFERENCE,
    [intensity],
  );

  // 비지원 디바이스이거나 비활성 상태이면 렌더링하지 않음
  if (!isSupported || !enabled) return null;

  return (
    <div
      className={`
        fixed bottom-20 right-4 z-[9998]
        flex items-center gap-2
        animate-in fade-in duration-500
        select-none pointer-events-none
      `}
    >
      {/* ─── 라벨 (pill badge) ─── */}
      <span
        className={`
          px-2 py-0.5 rounded-full text-[10px] font-bold leading-tight
          backdrop-blur-sm border whitespace-nowrap
          ${visual.bgClass} ${visual.textClass} ${visual.glowClass}
        `}
      >
        {visual.label}
      </span>

      {/* ─── 원형 프로그레스 링 + 이모지 ─── */}
      <div
        className={`
          relative flex items-center justify-center
          rounded-full border backdrop-blur-sm
          ${visual.bgClass} ${visual.glowClass}
        `}
        style={{ width: RING_SIZE, height: RING_SIZE }}
      >
        {/* SVG ring */}
        <svg
          className="absolute inset-0"
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        >
          {/* 배경 트랙 */}
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={RING_STROKE}
            className="text-slate-700/40"
          />
          {/* 진행률 링 */}
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke={visual.ringColor}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-out"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
            }}
          />
        </svg>

        {/* 중앙 이모지 */}
        <span className="text-lg leading-none" role="img" aria-label={visual.label}>
          {visual.emoji}
        </span>
      </div>
    </div>
  );
};
