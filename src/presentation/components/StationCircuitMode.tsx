import React, { useState } from 'react';
import { X, CheckCircle, Printer, Trophy, Play } from 'lucide-react';

interface StationCircuitModeProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchGame: (gameType: string) => void;
}

interface Station {
  id: string;
  name: string;
  targetGame: string;
  desc: string;
  mission: string;
  emoji: string;
  color: string;
}

const STATIONS: Station[] = [
  {
    id: 'A',
    name: '스테이션 A : 민첩성 구역',
    targetGame: 'reaction',
    desc: '번개 같은 반사신경으로 초록 신호에 즉시 반응하기!',
    mission: '반응속도 350ms 이하 달성하기',
    emoji: '⚡',
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: 'B',
    name: '스테이션 B : 코어 파워 구역',
    targetGame: 'plank',
    desc: '흔들리지 않는 바른 자세로 버티기!',
    mission: '플랭크 30초 이상 유지하기',
    emoji: '🧱',
    color: 'from-blue-600 to-indigo-700'
  },
  {
    id: 'C',
    name: '스테이션 C : 스피드 연타 구역',
    targetGame: 'swipe',
    desc: '화살표 방향을 빠르게 캐치하여 스와이프!',
    mission: '연속 10회 정확히 넘기기',
    emoji: '🏃',
    color: 'from-emerald-500 to-teal-700'
  },
  {
    id: 'D',
    name: '스테이션 D : 밸런스 균형 구역',
    targetGame: 'balance',
    desc: '한 발로 서서 스마트폰의 수평을 유지하기!',
    mission: '20초 동안 균형 게이지 지키기',
    emoji: '🦩',
    color: 'from-purple-500 to-pink-600'
  }
];

export const StationCircuitMode: React.FC<StationCircuitModeProps> = ({ isOpen, onClose, onLaunchGame }) => {
  const [completedStations, setCompletedStations] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState(false);

  if (!isOpen) return null;

  const toggleComplete = (id: string) => {
    setCompletedStations(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const isAllDone = STATIONS.every(s => completedStations.includes(s.id));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 상단 타이틀 */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🏟️</span>
            <div>
              <h2 className="text-xl font-black">체육관 서킷 트레이닝 스테이션</h2>
              <p className="text-xs text-slate-400">4개 구역을 순환하며 모든 스탬프를 모으세요!</p>
            </div>
          </div>
          <button
            onClick={() => setPrintMode(!printMode)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 border border-slate-700"
          >
            <Printer className="w-3.5 h-3.5" />
            {printMode ? '스탬프판 보기' : '인쇄용 안내'}
          </button>
        </div>

        {printMode ? (
          /* 교사용 인쇄/게시 안내 */
          <div className="bg-slate-800/90 rounded-2xl p-5 border border-slate-700 text-sm space-y-4">
            <h3 className="font-bold text-emerald-400 text-base">📌 체육관 벽면 부착 가이드</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              체육관 4개 모서리(A, B, C, D)에 아래 스테이션 표지를 인쇄하여 부착하고,
              학생들이 모둠별로 3~5분마다 시계 방향으로 이동하며 미션을 수행하도록 지도해 주세요.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {STATIONS.map(s => (
                <div key={s.id} className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                  <p className="font-bold text-amber-300">구역 {s.id}</p>
                  <p className="font-extrabold mt-1">{s.name}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{s.mission}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 학생용 스탬프 랠리 뷰 */
          <div className="space-y-3">
            {/* 상단 완주 현황 */}
            <div className="bg-slate-800/80 rounded-2xl p-4 flex items-center justify-between border border-slate-700">
              <span className="text-xs font-bold text-slate-300">현재 스탬프 달성도</span>
              <span className="text-sm font-black text-emerald-400">
                {completedStations.length} / {STATIONS.length} 구역 완료
              </span>
            </div>

            {/* 스테이션 카드 리스트 */}
            {STATIONS.map(station => {
              const done = completedStations.includes(station.id);
              return (
                <div
                  key={station.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    done
                      ? 'bg-emerald-950/30 border-emerald-500/50'
                      : 'bg-slate-800/60 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{station.emoji}</span>
                      <div>
                        <h4 className="text-sm font-extrabold flex items-center gap-1.5">
                          {station.name}
                          {done && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                        </h4>
                        <p className="text-xs text-slate-400">{station.desc}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950/50 p-2.5 rounded-xl text-xs font-bold text-amber-300 mb-3 border border-slate-800">
                    🎯 목표: {station.mission}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onLaunchGame(station.targetGame);
                        onClose();
                      }}
                      className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> 미션 게임 실행
                    </button>
                    <button
                      onClick={() => toggleComplete(station.id)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                        done
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300'
                      }`}
                    >
                      {done ? '완료됨 ✓' : '도장 찍기'}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* 올 클리어 축하 배너 */}
            {isAllDone && (
              <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-slate-950 font-black text-center shadow-xl animate-bounce">
                <Trophy className="w-8 h-8 mx-auto mb-1" />
                <p className="text-base">축하합니다! 전 구역 서킷 트레이닝 완주!</p>
                <p className="text-xs opacity-80">선생님께 화면을 보여주고 칭찬 스티커를 받으세요!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
