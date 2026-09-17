import { useState, useEffect } from 'react';
import { PhysicalActivityLayout } from './common/PhysicalActivityLayout';
import { Compass, Play, CheckCircle2 } from 'lucide-react';
import { sfxCoin, sfxSuccess } from '../../../application/soundEffects';

interface Point {
  x: number;
  y: number;
}

export const OpenSpaceTactician = () => {
  // 1: 전술판 설계, 2: 실제 코트 실행(60초), 3: 전술 성찰
  const [tacticsStep, setTacticsStep] = useState<number>(1);
  const [selectedPlayer, setSelectedPlayer] = useState<'A' | 'B' | null>(null);

  // 공격자 위치
  const [playerA, setPlayerA] = useState<Point>({ x: 80, y: 150 });
  const [playerB, setPlayerB] = useState<Point>({ x: 80, y: 50 });

  // 수비자 고정 위치
  const defenders = [
    { id: 'X', x: 180, y: 70 },
    { id: 'Y', x: 180, y: 130 },
  ];

  // 패스 목표 지점
  const [passTarget, setPassTarget] = useState<Point>({ x: 260, y: 100 });

  // 60초 실제 간이 게임 실행 타이머
  const [execTimer, setExecTimer] = useState<number>(60);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);

  const [reflectionSuccess, setReflectionSuccess] = useState<string>('');
  const [reflectionChange, setReflectionChange] = useState<string>('');

  useEffect(() => {
    if (!isTimerActive) return;
    const interval = setInterval(() => {
      setExecTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          setIsTimerActive(false);
          setTacticsStep(3);
          sfxSuccess();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerActive]);

  const handleFieldClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 340;
    const clickY = ((e.clientY - rect.top) / rect.height) * 200;

    if (selectedPlayer === 'A') {
      setPlayerA({ x: Math.round(clickX), y: Math.round(clickY) });
      setSelectedPlayer(null);
      sfxCoin();
    } else if (selectedPlayer === 'B') {
      setPlayerB({ x: Math.round(clickX), y: Math.round(clickY) });
      setSelectedPlayer(null);
      sfxCoin();
    } else {
      // 빈 공간 클릭 시 패스 목표 지점으로 설정
      setPassTarget({ x: Math.round(clickX), y: Math.round(clickY) });
      sfxCoin();
    }
  };

  return (
    <PhysicalActivityLayout
      title="빈 공간 설계자"
      emoji="🗺️"
      domain="스포츠"
      sportType="전략형"
      achievementCode="[6체02-06]"
      achievementTitle="전략형 스포츠에서 빈 공간 창출과 협력적 공격 전술 실행"
      activityType="모둠"
      expectedMinutes={5}
      equipment={['공 1개', '콘 4개 (활동 구역 표시용)']}
      instructions={[
        '미니 전술판에서 공격자 A(공 소유)와 B의 위치를 빈 공간으로 이동시킵니다.',
        '수비자 X, Y를 피해 공을 전달할 빈 공간(목표 지점)을 터치해 패스 길을 엽니다.',
        '설계된 전술 화살표를 확인하고, 실제 코트에서 1분간 친구들과 직접 실행해 봅니다.',
        '활동 후 빈 공간 활용과 호흡이 어땠는지 성공점과 보완점을 성찰합니다.',
      ]}
      colorTheme="cyan"
    >
      {({ onComplete }) => (
        <div className="w-full bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl">
          {tacticsStep === 1 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-bold">
                  <Compass className="w-4 h-4" />
                  <span>스마트 미니 전술판</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-cyan-400">🔵 공격자</span>
                  <span className="text-rose-400">🔴 수비수</span>
                  <span className="text-amber-400">🟡 패스 목표</span>
                </div>
              </div>

              {/* 전술판 SVG */}
              <div className="relative w-full rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-950 mb-3 shadow-inner">
                <svg
                  viewBox="0 0 340 200"
                  className="w-full h-auto cursor-crosshair"
                  onClick={handleFieldClick}
                >
                  {/* 경기장 라인 */}
                  <rect x="10" y="10" width="320" height="180" fill="#064e3b" rx="8" />
                  <line x1="170" y1="10" x2="170" y2="190" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 4" />
                  <circle cx="170" cy="100" r="30" fill="none" stroke="#10b981" strokeWidth="1.5" />
                  <rect x="310" y="70" width="20" height="60" fill="#047857" stroke="#10b981" strokeWidth="1.5" />

                  {/* 패스 궤적 화살표 (공격자 A -> 패스 목표) */}
                  <line
                    x1={playerA.x}
                    y1={playerA.y}
                    x2={passTarget.x}
                    y2={passTarget.y}
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                    strokeDasharray="6 3"
                  />
                  {/* 이동 경로 (공격자 B -> 패스 목표 지점으로 침투) */}
                  <line
                    x1={playerB.x}
                    y1={playerB.y}
                    x2={passTarget.x}
                    y2={passTarget.y}
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />

                  {/* 수비자 2명 */}
                  {defenders.map(d => (
                    <g key={d.id} transform={`translate(${d.x}, ${d.y})`}>
                      <circle r="12" fill="#ef4444" stroke="#fca5a5" strokeWidth="2" />
                      <text textAnchor="middle" dy="4" fill="#ffffff" fontSize="10" fontWeight="bold">
                        {d.id}
                      </text>
                    </g>
                  ))}

                  {/* 공격자 B (오프더볼 침투) */}
                  <g
                    transform={`translate(${playerB.x}, ${playerB.y})`}
                    className="cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); setSelectedPlayer('B'); }}
                  >
                    <circle r="13" fill="#0284c7" stroke={selectedPlayer === 'B' ? '#ffffff' : '#38bdf8'} strokeWidth="2.5" />
                    <text textAnchor="middle" dy="4" fill="#ffffff" fontSize="11" fontWeight="bold">B</text>
                  </g>

                  {/* 공격자 A (볼 핸들러) */}
                  <g
                    transform={`translate(${playerA.x}, ${playerA.y})`}
                    className="cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); setSelectedPlayer('A'); }}
                  >
                    <circle r="14" fill="#2563eb" stroke={selectedPlayer === 'A' ? '#ffffff' : '#60a5fa'} strokeWidth="2.5" />
                    <circle cx="9" cy="-9" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
                    <text textAnchor="middle" dy="4" fill="#ffffff" fontSize="11" fontWeight="bold">A</text>
                  </g>

                  {/* 패스 목표 지점 */}
                  <g transform={`translate(${passTarget.x}, ${passTarget.y})`}>
                    <circle r="10" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 3" />
                    <circle r="4" fill="#fbbf24" />
                    <text textAnchor="middle" dy="18" fill="#fef08a" fontSize="8" fontWeight="bold">빈 공간</text>
                  </g>
                </svg>
              </div>

              {/* 전술 안내 조작 바 */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs mb-4 flex justify-between items-center">
                <span className="text-slate-300">
                  {selectedPlayer
                    ? `선수 [${selectedPlayer}] 선택됨! 이동시킬 위치를 터치하세요.`
                    : '선수를 먼저 누른 뒤 이동하거나, 빈 공간을 터치해 패스 지점을 지정하세요.'}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setSelectedPlayer('A')}
                    className={`px-2 py-1 rounded-lg font-bold ${selectedPlayer === 'A' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    A 이동
                  </button>
                  <button
                    onClick={() => setSelectedPlayer('B')}
                    className={`px-2 py-1 rounded-lg font-bold ${selectedPlayer === 'B' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    B 이동
                  </button>
                </div>
              </div>

              {/* 전술 요약 브리핑 */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-cyan-500/20 text-xs mb-5 space-y-1">
                <span className="font-bold text-cyan-400 block">📋 전술 브리핑:</span>
                <p className="text-slate-300">
                  • 공격자 A가 수비수 X와 Y의 사이를 뚫고 <strong>우측 빈 공간({passTarget.x}, {passTarget.y})</strong>으로 찔러주는 전략!
                </p>
                <p className="text-slate-300">
                  • 공격자 B는 수비수를 등지고 재빠르게 <strong>빈 공간으로 쇄도</strong>하여 공을 받아냅니다.
                </p>
              </div>

              <button
                onClick={() => setTacticsStep(2)}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white rounded-xl font-black text-sm shadow-md"
              >
                전술 확정! 실제 코트에서 1분간 실행하기
              </button>
            </div>
          )}

          {/* Phase 2: 실제 코트에서 60초 간이 게임 실행 */}
          {tacticsStep === 2 && (
            <div className="py-4 text-center">
              <span className="text-5xl block mb-2">🏃‍♂️⚽</span>
              <h3 className="text-xl font-black text-white mb-1">실제 코트에서 전술 실행!</h3>
              <p className="text-xs text-slate-300 mb-6">
                친구들과 함께 지금 설계한 빈 공간 침투 전술을 1분 동안 연습해 보세요.
              </p>

              <div className="text-7xl font-black text-cyan-400 font-mono mb-4">
                {execTimer}초
              </div>

              {!isTimerActive ? (
                <div className="space-y-3">
                  <button
                    onClick={() => setIsTimerActive(true)}
                    className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white rounded-2xl font-black text-base shadow-lg active:scale-95 transition-all inline-flex items-center gap-2"
                  >
                    <Play className="w-5 h-5" /> 1분 실전 연습 시작
                  </button>
                  <div>
                    <button
                      onClick={() => setTacticsStep(3)}
                      className="text-xs text-slate-500 hover:text-slate-400 underline"
                    >
                      (이미 실습을 마쳤다면 바로 전술 성찰하기)
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-emerald-300 font-bold animate-pulse">
                  &ldquo;수비수를 따돌리고 빈 공간으로 달려가 공을 부르세요!&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Phase 3: 전술 성찰 및 성공/보완점 선택 */}
          {tacticsStep === 3 && (
            <div className="py-2 animate-in fade-in duration-300">
              <h3 className="text-lg font-black text-white text-center mb-1">🔍 전술 실행 성찰</h3>
              <p className="text-xs text-slate-400 text-center mb-5">
                실제 경기장에서 전술을 시도해 본 소감을 모둠원과 함께 선택하세요.
              </p>

              {/* 잘된 점 */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-4">
                <span className="text-xs font-bold text-emerald-400 block mb-2">
                  👏 오늘 우리 팀이 성공한 점은?
                </span>
                <div className="space-y-1.5 text-xs">
                  {[
                    '수비수가 없는 빈 공간을 먼저 발견하고 잘 뛰어들어갔다',
                    '공을 가진 친구와 눈을 맞추고 알맞은 타이밍에 패스했다',
                    '실수가 나와도 서로 격려하며 다음 기회를 만들었다',
                  ].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setReflectionSuccess(opt)}
                      className={`w-full p-2.5 rounded-xl border text-left font-bold transition-all ${
                        reflectionSuccess === opt
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      ✓ {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 바꾸고 싶은 점 */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6">
                <span className="text-xs font-bold text-cyan-400 block mb-2">
                  💡 다음 경기에서 더 보완하고 싶은 점은?
                </span>
                <div className="space-y-1.5 text-xs">
                  {[
                    '공을 받기 전에 목소리로 먼저 신호를 더 크게 주기',
                    '달리는 친구의 앞쪽 빈 공간으로 공을 조금 더 길게 찔러주기',
                    '수비수가 다가오기 전에 더 빠르게 패스 판단하기',
                  ].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setReflectionChange(opt)}
                      className={`w-full p-2.5 rounded-xl border text-left font-bold transition-all ${
                        reflectionChange === opt
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      ✓ {opt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onComplete(`빈 공간 전술 설계 및 실전 1분 완주! (성공점: "${reflectionSuccess || '빈 공간 침투'}", 보완점: "${reflectionChange || '목소리 신호'}")`)}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> 전술 설계 리포트 완료
              </button>
            </div>
          )}
        </div>
      )}
    </PhysicalActivityLayout>
  );
};
