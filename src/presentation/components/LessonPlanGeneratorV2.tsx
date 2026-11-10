import { useState, useMemo, useRef, useEffect, useId } from 'react';
import { Search, Sparkles, ChevronDown, ChevronUp, Printer, Copy, Check, RotateCcw, ExternalLink, Play, Shield, BookOpen, Target, Heart, Download } from 'lucide-react';
import { LESSON_GAME_CATALOG } from '../../data/lessonGameCatalog';
import type { LessonGameMeta } from '../../data/lessonGameCatalog';
import { generateLessonPlan, calcGameScore, validateLessonInputs, type GradeGroup, type DomainOption, type ActivityMode, type DeviceOption, type SpaceOption, type GameSelectMode, type FocusArea, type GeneratedPlan } from '../../domain/lessonPlan';

// ══════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════
export const LessonPlanGeneratorV2 = () => {

  const printRef = useRef<HTMLDivElement>(null);
  const formId = useId();

  // 기본 설정
  const [grade, setGrade] = useState<GradeGroup>('3~4학년군');
  const [duration, setDuration] = useState(40);
  const [customDuration, setCustomDuration] = useState('');
  const [durationMode, setDurationMode] = useState<'40' | '80' | 'custom'>('40');
  const [domain, setDomain] = useState<DomainOption>('자동');
  const [unit, setUnit] = useState('');
  const [actMode, setActMode] = useState<ActivityMode>('자동 추천');

  // 상세 설정
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [studentCountInput, setStudentCountInput] = useState('24');
  const [groupSizeInput, setGroupSizeInput] = useState('4');
  const studentCount = Number(studentCountInput);
  const groupSize = Number(groupSizeInput);
  const [space, setSpace] = useState<SpaceOption>('자동');
  const [device, setDevice] = useState<DeviceOption>('모둠별 1대');
  const [focuses, setFocuses] = useState<FocusArea[]>(['신체활동량', '즐거움']);

  // 게임 선택
  const [gameSelectMode, setGameSelectMode] = useState<GameSelectMode>('auto');
  const [selectedGame, setSelectedGame] = useState<LessonGameMeta | null>(null);
  const [gameSearch, setGameSearch] = useState('');
  const [showGamePicker, setShowGamePicker] = useState(false);

  // 결과
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSection, setCopiedSection] = useState('');
  const [copyError, setCopyError] = useState('');
  const [formError, setFormError] = useState('');
  const copyTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => copyTimers.current.forEach(clearTimeout), []);

  // 1~2학년 도메인 옵션
  const isLowGrade = grade === '1~2학년 · 즐거운 생활 연계';
  const domainOptions: DomainOption[] = isLowGrade ? ['자동', '놀이', '기본 움직임', '표현'] : ['자동', '운동', '스포츠', '표현'];

  // 게임 필터링
  const filteredGames = useMemo(() => {
    let games = LESSON_GAME_CATALOG;
    const gradeKey = isLowGrade ? '1~2학년' : grade;
    games = games.filter(g => g.grades.includes(gradeKey));
    if (domain !== '자동' && domain !== '놀이' && domain !== '기본 움직임') games = games.filter(g => g.domain === domain);
    if (gameSearch) games = games.filter(g => g.title.includes(gameSearch) || g.description.includes(gameSearch) || g.learningKeywords.some(k => k.includes(gameSearch)));
    return games;
  }, [grade, domain, gameSearch, isLowGrade]);

  // 수업 시간 처리
  const handleDurationChange = (mode: '40' | '80' | 'custom') => {
    setDurationMode(mode);
    if (mode === '40') setDuration(40);
    else if (mode === '80') setDuration(80);
  };

  const toggleFocus = (f: FocusArea) => {
    setFocuses(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  // 생성
  const handleGenerate = () => {
    const d = durationMode === 'custom' ? Number(customDuration) : duration;
    const inputError = validateLessonInputs(d, studentCountInput, groupSizeInput);
    if (inputError) { setFormError(inputError); return; }
    if (gameSelectMode === 'manual' && !selectedGame) { setFormError('직접 선택할 게임을 먼저 골라 주세요.'); return; }
    setFormError('');
    const result = generateLessonPlan(grade, d, domain, unit, actMode, studentCount, space, device, focuses, gameSelectMode === 'manual' ? selectedGame : null, gameSelectMode, groupSize);
    setPlan(result);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 다른 게임 추천
  const handleRerollGame = () => {
    if (!plan) return;
    const d = plan.overview.duration;
    // 현재 추천된 게임을 제외하고 다시 추천
    const currentId = plan.recommendedGame?.game.id;
    const candidates = LESSON_GAME_CATALOG.filter(g => g.id !== currentId);
    const scored = candidates.map(g => ({ game: g, score: calcGameScore(g, grade, domain, actMode, space, device, focuses) })).sort((a, b) => b.score - a.score);
    if (scored[0]) {
      const newPlan = generateLessonPlan(grade, d, domain, unit, actMode, studentCount, space, device, focuses, scored[0].game, 'manual', groupSize);
      setPlan(newPlan);
    }
  };

  // 복사
  const handleCopyAll = async () => {
    if (!plan) return;
    const text = planToText(plan);
    try {
      await navigator.clipboard.writeText(text);
      setCopyError('');
      setCopied(true);
      copyTimers.current.push(setTimeout(() => setCopied(false), 2000));
    } catch { setCopyError('복사 권한을 확인하거나 지도안 다운로드를 이용해 주세요.'); }
  };

  const handleCopySection = async (section: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyError('');
      setCopiedSection(section);
      copyTimers.current.push(setTimeout(() => setCopiedSection(''), 2000));
    } catch { setCopyError('복사 권한을 확인하거나 지도안 다운로드를 이용해 주세요.'); }
  };

  // 인쇄
  const handlePrint = () => { window.print(); };

  // 마크다운 다운로드
  const handleDownloadMd = () => {
    if (!plan) return;
    const md = planToMarkdown(plan);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    a.href = url;
    a.download = `지도안_${dateStr}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─── 렌더링 ───
  return (
    <div className="space-y-6">
      {formError && <p role="alert" className="rounded-xl border border-amber-700 p-3 text-sm text-amber-300">{formError}</p>}
      {copyError && <p role="alert" className="rounded-xl border border-amber-700 p-3 text-sm text-amber-300">{copyError}</p>}
      {/* 생성된 결과가 있으면 결과 먼저 표시 */}
      {plan ? (
        <div ref={printRef} className="print-area space-y-4">
          {/* 액션 바 */}
          <div className="flex flex-wrap gap-2 print:hidden sticky top-[120px] z-10 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md py-3 border-b border-slate-200 dark:border-slate-800">
            <button onClick={() => setPlan(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all border border-slate-300 dark:border-slate-700"><RotateCcw className="w-3.5 h-3.5" /> 새로 만들기</button>
            <button onClick={handleRerollGame} className="px-4 py-2 bg-purple-50 dark:bg-purple-900/50 hover:bg-purple-100 dark:hover:bg-purple-800/50 rounded-xl text-sm font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 transition-all border border-purple-200 dark:border-purple-700/50"><Sparkles className="w-3.5 h-3.5" /> 다른 게임 추천</button>
            <button onClick={handleCopyAll} className="px-4 py-2 bg-cyan-50 dark:bg-cyan-900/50 hover:bg-cyan-100 dark:hover:bg-cyan-800/50 rounded-xl text-sm font-bold text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5 transition-all border border-cyan-200 dark:border-cyan-700/50">{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? '복사됨!' : '전체 복사'}</button>
            <button onClick={handlePrint} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all border border-slate-300 dark:border-slate-700"><Printer className="w-3.5 h-3.5" /> 인쇄</button>
            <button onClick={handleDownloadMd} className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 rounded-xl text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 transition-all border border-emerald-200 dark:border-emerald-700/50"><Download className="w-3.5 h-3.5" /> 지도안 다운로드</button>
          </div>

          {/* 📋 수업 개요 */}
          <SectionCard title="📋 수업 개요" id="overview">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['학년군', plan.overview.gradeGroup], ['수업 시간', `${plan.overview.duration}분`],
                ['교육과정 영역', plan.overview.domain], ['활동 형태', plan.overview.activityMode],
                ['단원/주제', plan.overview.unit], ['학생 수', `${plan.overview.studentCount}명`],
                ['장소', plan.overview.space], ['단원', plan.overview.topic],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700/50">
                  <div className="text-[10px] text-slate-500 font-bold mb-1">{label}</div>
                  <div className="text-sm text-slate-900 dark:text-white font-bold">{value}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* 🎯 교육과정 연계 */}
          <SectionCard title="🎯 교육과정 연계" id="curriculum">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {plan.curriculum.competencies.map(c => <span key={c} className="px-2.5 py-1 bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-700/40 rounded-lg text-xs font-bold text-cyan-700 dark:text-cyan-300">{c}</span>)}
              </div>
              {plan.curriculum.isLowGrade ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl p-4">
                  <p className="text-amber-800 dark:text-amber-300 text-sm font-bold mb-1">📌 통합교과(즐거운 생활) 연계 신체활동</p>
                  <p className="text-amber-700/90 dark:text-amber-200/80 text-xs">테마: {plan.curriculum.lowGradeTheme}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-2">※ 1~2학년은 독립된 체육 교과가 없으므로 성취기준 코드를 별도로 제시하지 않습니다.</p>
                </div>
              ) : plan.curriculum.standards.length > 0 && (
                <div className="space-y-2">
                  {plan.curriculum.standards.map(s => (
                    <div key={s.code} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700/50">
                      <span className="text-cyan-600 dark:text-cyan-400 text-xs font-black mr-2">{s.code}</span>
                      <span className="text-slate-900 dark:text-white text-sm">{s.text}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5 border border-blue-200 dark:border-blue-800/30"><span className="text-blue-700 dark:text-blue-400 font-bold block mb-1">지식·이해</span><span className="text-slate-700 dark:text-slate-300">{plan.curriculum.knowledge}</span></div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5 border border-emerald-200 dark:border-emerald-800/30"><span className="text-emerald-700 dark:text-emerald-400 font-bold block mb-1">과정·기능</span><span className="text-slate-700 dark:text-slate-300">{plan.curriculum.process}</span></div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2.5 border border-purple-200 dark:border-purple-800/30"><span className="text-purple-700 dark:text-purple-400 font-bold block mb-1">가치·태도</span><span className="text-slate-700 dark:text-slate-300">{plan.curriculum.attitude}</span></div>
              </div>
            </div>
          </SectionCard>

          {/* 🌱 오늘의 배움 */}
          <SectionCard title="🌱 오늘의 배움" id="goals">
            <div className="space-y-3">
              <div className="space-y-2">{plan.learningGoals.goals.map((g, i) => <div key={i} className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-700/30 text-sm text-emerald-950 dark:text-emerald-100 font-bold">📌 {g}</div>)}</div>
              <div><p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-2">성공 기준</p><div className="space-y-1">{plan.learningGoals.successCriteria.map((c, i) => <div key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400 mt-0.5">☐</span>{c}</div>)}</div></div>
            </div>
          </SectionCard>

          {/* 🎮 추천 게임 */}
          {plan.recommendedGame && (
            <SectionCard title="🎮 추천 땀방울 원정대 게임" id="game">
              <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-cyan-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-2xl p-4 border border-purple-200 dark:border-purple-700/40">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{plan.recommendedGame.game.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">{plan.recommendedGame.game.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{plan.recommendedGame.game.description}</p>
                    <p className="text-xs text-purple-700 dark:text-purple-300 mt-2 font-bold">💡 {plan.recommendedGame.reason}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">📍 {plan.recommendedGame.role}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">⏱ 권장 사용 시간: {plan.recommendedGame.usageTime}분</p>
                    <div className="flex gap-2 mt-3 print:hidden">
                      <button onClick={() => window.open(plan.recommendedGame!.game.route, '_blank')} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-bold text-white flex items-center gap-1 transition-all"><Play className="w-3 h-3" /> 게임 실행</button>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* 🗺 수업 흐름 */}
          <SectionCard title="🗺 수업 흐름" id="flow" copyText={plan.lessonFlow.map(f => `[${f.stage}] ${f.time}분\n${f.activity}`).join('\n\n')} onCopy={(t) => handleCopySection('flow', t)} copiedSection={copiedSection === 'flow'}>
            <div className="space-y-3">
              {plan.lessonFlow.map((f, i) => (
                <div key={i} className={`rounded-xl p-4 border ${f.stage === '도입' ? 'bg-blue-50 dark:bg-blue-900/15 border-blue-200 dark:border-blue-700/30' : f.stage === '정리' ? 'bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-700/30' : 'bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-700/30'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${f.stage === '도입' ? 'bg-blue-600 text-white' : f.stage === '정리' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'}`}>{f.stage}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{f.time}분</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-500 font-bold block mb-1">교수·학습 활동</span><span className="text-slate-900 dark:text-white whitespace-pre-line">{f.activity}</span></div>
                    <div><span className="text-slate-500 font-bold block mb-1">교사 활동</span><span className="text-slate-700 dark:text-slate-300 whitespace-pre-line">{f.teacherActivity}</span></div>
                    <div><span className="text-slate-500 font-bold block mb-1">학생 활동</span><span className="text-slate-700 dark:text-slate-300 whitespace-pre-line">{f.studentActivity}</span></div>
                    {f.gameUsage !== '-' && <div><span className="text-purple-600 dark:text-purple-400 font-bold block mb-1">🎮 게임 활용</span><span className="text-purple-800 dark:text-purple-200 whitespace-pre-line">{f.gameUsage}</span></div>}
                    <div><span className="text-slate-500 font-bold block mb-1">안전 유의점</span><span className="text-red-600 dark:text-red-300/80 whitespace-pre-line">{f.safety}</span></div>
                    {f.evaluation !== '-' && <div><span className="text-slate-500 font-bold block mb-1">평가 포인트</span><span className="text-cyan-700 dark:text-cyan-300/80">{f.evaluation}</span></div>}
                  </div>
                </div>
              ))}
              <div className="text-right text-xs font-bold text-slate-500 dark:text-slate-400">⏱ 총 수업 시간: {plan.lessonFlow.reduce((a, f) => a + f.time, 0)}분</div>
            </div>
          </SectionCard>

          {/* 🎮 게임 활용 상세 */}
          {plan.gameDetail && (
            <SectionCard title="🎮 게임 활용 상세" id="gameDetail">
              <div className="space-y-3 text-sm">
                {[
                  ['🔧 준비', plan.gameDetail.preparation],
                  ['👥 배치', plan.gameDetail.arrangement],
                  ['🔄 역할 순환', plan.gameDetail.rotation],
                  ['📱 기기 운영', plan.gameDetail.deviceOps],
                  ['📊 난이도', plan.gameDetail.difficulty],
                ].map(([label, text]) => (
                  <div key={label as string} className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/40">
                    <span className="text-slate-400 text-xs font-bold block mb-1">{label}</span>
                    <span className="text-slate-200 text-xs">{text}</span>
                  </div>
                ))}
                <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/40">
                  <span className="text-slate-400 text-xs font-bold block mb-1">📋 진행 순서</span>
                  <ol className="list-decimal list-inside space-y-1">{plan.gameDetail.procedure.map((p, i) => <li key={i} className="text-xs text-slate-200">{p}</li>)}</ol>
                </div>
              </div>
            </SectionCard>
          )}

          {/* 🛡 안전 지도 */}
          <SectionCard title="🛡 안전 지도" id="safety">
            <ul className="space-y-1.5">{plan.safety.map((s, i) => <li key={i} className="text-xs text-slate-300 flex items-start gap-2"><Shield className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />{s}</li>)}</ul>
          </SectionCard>

          {/* 🔍 과정 중심 평가 */}
          <SectionCard title="🔍 과정 중심 평가" id="eval">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">{plan.evaluation.elements.map(e => <span key={e} className="px-2 py-1 bg-cyan-900/30 border border-cyan-700/40 rounded-lg text-[10px] font-bold text-cyan-300">{e}</span>)}</div>
              <div><p className="text-xs text-slate-400 font-bold mb-2">관찰 체크리스트</p>{plan.evaluation.checklist.map((c, i) => <div key={i} className="text-xs text-slate-300 flex items-start gap-2 mb-1"><span className="text-cyan-400 mt-0.5">☐</span>{c}</div>)}</div>
            </div>
          </SectionCard>

          {/* 🙋 학생 자기평가 */}
          <SectionCard title="🙋 학생 자기평가" id="selfEval">
            <div className="flex flex-wrap gap-3 mb-3">{['😊 잘했어요', '🙂 조금 더 연습할래요', '😐 아직 어려워요'].map(e => <span key={e} className="px-3 py-1.5 bg-slate-800 rounded-xl text-xs font-bold text-slate-300 border border-slate-700">{e}</span>)}</div>
            {plan.selfEval.items.map((it, i) => <div key={i} className="text-xs text-slate-300 flex items-start gap-2 mb-1"><span className="text-emerald-400">☐</span>{it}</div>)}
          </SectionCard>

          {/* 🔄 수준별 활동 조정 */}
          <SectionCard title="🔄 수준별 활동 조정" id="level">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: '🌱 도움이 필요한 학생', items: plan.levelAdjust.needHelp, color: 'blue' },
                { label: '🌿 일반 학생', items: plan.levelAdjust.general, color: 'green' },
                { label: '🌳 도전이 필요한 학생', items: plan.levelAdjust.challenge, color: 'purple' },
              ].map(({ label, items, color }) => (
                <div key={label} className={`bg-${color}-900/15 rounded-xl p-3 border border-${color}-700/30`}>
                  <p className={`text-xs font-bold text-${color}-300 mb-2`}>{label}</p>
                  {items.map((it, i) => <p key={i} className="text-[11px] text-slate-300 mb-1">• {it}</p>)}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ♿ 모두가 참여하는 수업 */}
          <SectionCard title="♿ 모두가 참여하는 수업" id="inclusion">
            <ul className="space-y-1.5">{plan.inclusion.map((s, i) => <li key={i} className="text-xs text-slate-300 flex items-start gap-2"><Heart className="w-3 h-3 text-pink-400 mt-0.5 shrink-0" />{s}</li>)}</ul>
          </SectionCard>

          {/* 💡 교사 TIP */}
          <SectionCard title="💡 교사 TIP" id="tips">
            {plan.teacherTips.map((t, i) => (
              <div key={i} className="bg-amber-900/15 rounded-xl p-3 border border-amber-700/30 mb-2">
                <p className="text-xs font-bold text-amber-300 mb-1">❓ {t.problem}</p>
                <p className="text-xs text-slate-300">→ {t.solution}</p>
              </div>
            ))}
          </SectionCard>

          {/* 🎮 게임 변형 */}
          {plan.gameVariations.length > 0 && (
            <SectionCard title="🎮 게임 변형 수업" id="variations">
              {plan.gameVariations.map((v, i) => (
                <div key={i} className={`rounded-xl p-3 border mb-2 ${v.level === '기본' ? 'bg-slate-800/40 border-slate-700/40' : v.level === '쉬움' ? 'bg-blue-900/15 border-blue-700/30' : 'bg-purple-900/15 border-purple-700/30'}`}>
                  <span className={`text-xs font-black ${v.level === '기본' ? 'text-slate-300' : v.level === '쉬움' ? 'text-blue-300' : 'text-purple-300'}`}>[{v.level}]</span>
                  <p className="text-xs text-slate-300 mt-1">{v.description}</p>
                </div>
              ))}
            </SectionCard>
          )}

          {/* 🔀 이렇게 바꿔도 좋아요 */}
          <SectionCard title="🔀 이렇게 바꿔도 좋아요" id="alternatives">
            {plan.alternatives.map((a, i) => (
              <div key={i} className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40 mb-2">
                <p className="text-xs font-bold text-cyan-300 mb-1">📌 {a.scenario}</p>
                <p className="text-xs text-slate-300">{a.solution}</p>
              </div>
            ))}
          </SectionCard>

          {/* 📵 NO DEVICE 대체 활동 */}
          <SectionCard title="📵 NO DEVICE 대체 활동" id="noDevice">
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/40">
              <p className="text-sm text-white">{plan.noDeviceActivity}</p>
            </div>
          </SectionCard>

          {/* 푸터 */}
          <div className="text-center pt-4 border-t border-slate-800">
            <p className="text-slate-500 text-[10px]">© 땀방울 원정대 수업 지도안 생성기 · 2022 개정 초등 체육과 교육과정 연계</p>
          </div>
        </div>
      ) : (
        /* ═══ 입력 폼 ═══ */
        <div className="space-y-5">
          {/* 기본 설정 */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-none space-y-4 transition-colors">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2"><BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> 기본 수업 설정</h3>

            {/* 학년군 */}
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-2">① 학년군</label>
              <div className="grid grid-cols-3 gap-2">
                {(['1~2학년 · 즐거운 생활 연계', '3~4학년군', '5~6학년군'] as GradeGroup[]).map(g => (
                  <button key={g} onClick={() => { setGrade(g); setDomain('자동'); setSelectedGame(null); }}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${grade === g ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* 수업 시간 */}
            <div>
              <label htmlFor={`${formId}-duration`} className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-2">② 수업 시간</label>
              <div className="flex gap-2">
                {[{ key: '40', label: '40분' }, { key: '80', label: '80분' }, { key: 'custom', label: '직접 입력' }].map(({ key, label }) => (
                  <button key={key} onClick={() => handleDurationChange(key as any)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${durationMode === key ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {durationMode === 'custom' && <><input id={`${formId}-duration`} aria-label="수업 시간 (분)" aria-describedby={`${formId}-duration-help`} min={6} max={480} step={1} type="number" value={customDuration} onChange={e => setCustomDuration(e.target.value)} placeholder="6~480분" className="mt-2 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none" /><p id={`${formId}-duration-help`} className="text-xs text-slate-500">6~480분의 정수로 입력하세요.</p></>}
            </div>

            {/* 교육과정 영역 */}
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-2">③ 교육과정 영역</label>
              <div className="flex flex-wrap gap-2">
                {domainOptions.map(d => (
                  <button key={d} onClick={() => { setDomain(d); setSelectedGame(null); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${domain === d ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* 단원/주제 */}
            <div>
              <label htmlFor={`${formId}-unit`} className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-2">④ 단원 또는 수업 주제</label>
              <input id={`${formId}-unit`} type="text" value={unit} onChange={e => setUnit(e.target.value)} placeholder="예: 전략형 스포츠 - 빈 공간을 활용하며 게임하기" className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:outline-none" />
            </div>

            {/* 활동 형태 */}
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-2">⑤ 활동 형태</label>
              <div className="flex flex-wrap gap-2">
                {(['자동 추천', '개인', '짝', '모둠', '팀 대항', '학급 전체'] as ActivityMode[]).map(m => (
                  <button key={m} onClick={() => setActMode(m)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${actMode === m ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 상세 설정 */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-none transition-colors">
            <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full p-4 flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
              <span className="flex items-center gap-2"><Target className="w-4 h-4 text-purple-600 dark:text-purple-400" /> 상세 설정</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAdvanced && (
              <div className="p-5 pt-0 space-y-4 border-t border-slate-200 dark:border-slate-700/50">
                {/* 학급 인원 */}
                <div>
                  <label htmlFor={`${formId}-students`} className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-2">⑥ 학급 인원</label>
                  <input id={`${formId}-students`} aria-describedby={`${formId}-students-help`} type="number" min={1} max={200} step={1} value={studentCountInput} onChange={e => setStudentCountInput(e.target.value)} className="w-32 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none" />
                </div>

                <p id={`${formId}-students-help`} className="text-xs text-slate-500">학급 전체 인원을 1~200명으로 입력하세요.</p>
                <div><label htmlFor={`${formId}-group-size`} className="text-xs font-bold block mb-2">모둠별 최대 인원</label><input id={`${formId}-group-size`} type="number" min={2} max={20} step={1} value={groupSizeInput} onChange={e=>setGroupSizeInput(e.target.value)} aria-describedby={`${formId}-group-help`}/><p id={`${formId}-group-help`} className="text-xs text-slate-500">2~20명. 인원을 고르게 나누며, 짝 활동은 2명 기준으로 계산합니다.</p></div>
                {/* 장소 */}
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-2">⑦ 수업 장소</label>
                  <div className="flex flex-wrap gap-2">
                    {(['자동', '교실', '체육관', '운동장', '다목적실', '좁은 실내 공간'] as SpaceOption[]).map(s => (
                      <button key={s} onClick={() => setSpace(s)} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${space === s ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{s}</button>
                    ))}
                  </div>
                </div>

                {/* 기기 */}
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-2">⑧ 디지털 기기</label>
                  <div className="flex flex-wrap gap-2">
                    {(['없음', '교사용 1대', '모둠별 1대', '학생 1인 1기기'] as DeviceOption[]).map(d => (
                      <button key={d} onClick={() => setDevice(d)} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${device === d ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{d}</button>
                    ))}
                  </div>
                </div>

                {/* 수업 중점 */}
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-2">⑩ 수업 중점 (복수 선택)</label>
                  <div className="flex flex-wrap gap-2">
                    {(['신체활동량', '움직임 기능', '체력', '전략적 사고', '협력', '의사소통', '창의적 표현', '건강 관리', '안전', '즐거움'] as FocusArea[]).map(f => (
                      <button key={f} onClick={() => toggleFocus(f)} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${focuses.includes(f) ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{f}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 게임 선택 */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-none space-y-4 transition-colors">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" /> 땀방울 원정대 게임</h3>
            <div className="flex gap-2">
              <button onClick={() => { setGameSelectMode('auto'); setSelectedGame(null); setShowGamePicker(false); }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${gameSelectMode === 'auto' ? 'bg-purple-600 text-white border-purple-500 shadow-lg' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>🤖 자동 추천</button>
              <button onClick={() => { setGameSelectMode('manual'); setShowGamePicker(true); }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${gameSelectMode === 'manual' ? 'bg-purple-600 text-white border-purple-500 shadow-lg' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>🎯 직접 선택</button>
            </div>

            {/* 선택된 게임 표시 */}
            {selectedGame && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 border border-purple-200 dark:border-purple-700/30 flex items-center gap-3">
                <span className="text-2xl">{selectedGame.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedGame.title}</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">{selectedGame.description}</p>
                </div>
                <button onClick={() => setSelectedGame(null)} className="text-xs text-slate-400 hover:text-red-500">✕</button>
              </div>
            )}

            {/* 게임 선택 UI */}
            {showGamePicker && gameSelectMode === 'manual' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <input type="text" value={gameSearch} onChange={e => setGameSearch(e.target.value)} aria-label="활동 이름 또는 키워드 검색" placeholder="게임 이름 또는 키워드 검색" className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-purple-500 focus:outline-none" />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {filteredGames.map(g => (
                    <button key={g.id} onClick={() => { setSelectedGame(g); setShowGamePicker(false); }}
                      className={`lesson-game-option w-full text-left p-3 rounded-xl border transition-all ${selectedGame?.id === g.id ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500 dark:border-purple-600' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}>
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">{g.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="basis-full text-xs font-bold text-slate-900 dark:text-white">{g.title}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-700">{g.domain}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${g.intensity === '높음' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700/40' : g.intensity === '보통' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/40' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700/40'}`}>{g.intensity}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{g.description}</p>
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-600 shrink-0" />
                      </div>
                    </button>
                  ))}
                  {filteredGames.length === 0 && <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">조건에 맞는 게임이 없습니다.</p>}
                </div>
              </div>
            )}
          </div>

          {/* 생성 버튼 */}
          <button onClick={handleGenerate}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-black text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98]">
            <Sparkles className="w-5 h-5" /> 수업 지도안 생성
          </button>
        </div>
      )}
    </div>
  );
};

// ─── 섹션 카드 컴포넌트 ───
function SectionCard({ title, id, children, copyText, onCopy, copiedSection }: { title: string; id: string; children: React.ReactNode; copyText?: string; onCopy?: (text: string) => void; copiedSection?: boolean }) {
  return (
    <div id={id} className="bg-white dark:bg-slate-900/80 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-black text-slate-900 dark:text-white">{title}</h3>
        {copyText && onCopy && (
          <button onClick={() => onCopy(copyText)} className="text-xs text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 print:hidden flex items-center gap-1 transition-colors">
            {copiedSection ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copiedSection ? '복사됨' : '복사'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── 전체 텍스트 변환 ───
function planToText(plan: GeneratedPlan): string {
  let t = '';
  t += `📋 수업 개요\n━━━━━━━━━━━━━━━━━━━━\n`;
  t += `학년군: ${plan.overview.gradeGroup}\n수업 시간: ${plan.overview.duration}분\n`;
  t += `단원: ${plan.overview.unit}\n영역: ${plan.overview.domain}\n활동 형태: ${plan.overview.activityMode}\n`;
  t += `학생 수: ${plan.overview.studentCount}명\n장소: ${plan.overview.space}\n\n`;

  t += `🎯 교육과정 연계\n━━━━━━━━━━━━━━━━━━━━\n`;
  if (plan.curriculum.isLowGrade) {
    t += `통합교과(즐거운 생활) 연계 신체활동\n테마: ${plan.curriculum.lowGradeTheme}\n`;
  } else {
    plan.curriculum.standards.forEach(s => { t += `${s.code} ${s.text}\n`; });
  }
  t += `핵심 역량: ${plan.curriculum.competencies.join(', ')}\n`;
  t += `지식·이해: ${plan.curriculum.knowledge}\n과정·기능: ${plan.curriculum.process}\n가치·태도: ${plan.curriculum.attitude}\n\n`;

  t += `🌱 학습 목표\n━━━━━━━━━━━━━━━━━━━━\n`;
  plan.learningGoals.goals.forEach(g => { t += `• ${g}\n`; });
  t += `\n성공 기준:\n`;
  plan.learningGoals.successCriteria.forEach(c => { t += `☐ ${c}\n`; });
  t += '\n';

  if (plan.recommendedGame) {
    t += `🎮 추천 게임: ${plan.recommendedGame.game.emoji} ${plan.recommendedGame.game.title}\n`;
    t += `추천 이유: ${plan.recommendedGame.reason}\n`;
    t += `권장 사용 시간: ${plan.recommendedGame.usageTime}분\n\n`;
  }

  t += `🗺 수업 흐름\n━━━━━━━━━━━━━━━━━━━━\n`;
  plan.lessonFlow.forEach(f => {
    t += `[${f.stage}] ${f.time}분\n`;
    t += `활동: ${f.activity}\n교사: ${f.teacherActivity}\n학생: ${f.studentActivity}\n`;
    if (f.gameUsage !== '-') t += `게임: ${f.gameUsage}\n`;
    t += `안전: ${f.safety}\n\n`;
  });

  t += `🛡 안전 지도\n━━━━━━━━━━━━━━━━━━━━\n`;
  plan.safety.forEach(s => { t += `• ${s}\n`; });
  t += '\n';

  t += `🔍 평가 체크리스트\n━━━━━━━━━━━━━━━━━━━━\n`;
  plan.evaluation.checklist.forEach(c => { t += `☐ ${c}\n`; });
  t += '\n';

  t += `💡 교사 TIP\n━━━━━━━━━━━━━━━━━━━━\n`;
  plan.teacherTips.forEach(tip => { t += `❓ ${tip.problem}\n→ ${tip.solution}\n\n`; });

  t += `📵 NO DEVICE 대체 활동\n━━━━━━━━━━━━━━━━━━━━\n`;
  t += `${plan.noDeviceActivity}\n\n`;

  t += `© 땀방울 원정대 수업 지도안 생성기\n`;
  return t;
}

function planToMarkdown(plan: GeneratedPlan): string {
  let md = '';

  md += `# 📋 수업 지도안\n\n`;
  md += `> 땀방울 원정대 · 2022 개정 초등 체육과 교육과정 연계\n\n`;

  // 수업 개요
  md += `## 📋 수업 개요\n\n`;
  md += `| 항목 | 내용 |\n|------|------|\n`;
  md += `| 학년군 | ${plan.overview.gradeGroup} |\n`;
  md += `| 수업 시간 | ${plan.overview.duration}분 |\n`;
  md += `| 단원/주제 | ${plan.overview.unit} |\n`;
  md += `| 교육과정 영역 | ${plan.overview.domain} |\n`;
  md += `| 활동 형태 | ${plan.overview.activityMode} |\n`;
  md += `| 학생 수 | ${plan.overview.studentCount}명 |\n`;
  md += `| 장소 | ${plan.overview.space} |\n\n`;

  // 교육과정 연계
  md += `## 🎯 교육과정 연계\n\n`;
  if (plan.curriculum.isLowGrade) {
    md += `**통합교과(즐거운 생활) 연계 신체활동**\n\n`;
    md += `- 테마: ${plan.curriculum.lowGradeTheme}\n`;
    md += `- ※ 1~2학년은 독립된 체육 교과가 없으므로 성취기준 코드를 별도로 제시하지 않습니다.\n\n`;
  } else if (plan.curriculum.standards.length > 0) {
    plan.curriculum.standards.forEach(s => { md += `- **${s.code}** ${s.text}\n`; });
    md += '\n';
  }
  md += `**핵심 역량:** ${plan.curriculum.competencies.join(', ')}\n\n`;
  md += `| 지식·이해 | 과정·기능 | 가치·태도 |\n|-----------|----------|----------|\n`;
  md += `| ${plan.curriculum.knowledge} | ${plan.curriculum.process} | ${plan.curriculum.attitude} |\n\n`;

  // 학습 목표
  md += `## 🌱 학습 목표\n\n`;
  plan.learningGoals.goals.forEach(g => { md += `- 📌 ${g}\n`; });
  md += `\n### 성공 기준\n\n`;
  plan.learningGoals.successCriteria.forEach(c => { md += `- [ ] ${c}\n`; });
  md += '\n';

  // 추천 게임
  if (plan.recommendedGame) {
    md += `## 🎮 추천 게임\n\n`;
    md += `**${plan.recommendedGame.game.emoji} ${plan.recommendedGame.game.title}**\n\n`;
    md += `- 추천 이유: ${plan.recommendedGame.reason}\n`;
    md += `- 수업 속 역할: ${plan.recommendedGame.role}\n`;
    md += `- 권장 사용 시간: ${plan.recommendedGame.usageTime}분\n\n`;
  }

  // 수업 흐름
  md += `## 🗺 수업 흐름\n\n`;
  md += `| 단계 | 시간 | 교수·학습 활동 | 교사 활동 | 학생 활동 | 안전 유의점 |\n`;
  md += `|------|------|---------------|----------|----------|------------|\n`;
  plan.lessonFlow.forEach(f => {
    md += `| ${f.stage} | ${f.time}분 | ${f.activity.replace(/\n/g, ' ')} | ${f.teacherActivity.replace(/\n/g, ' ')} | ${f.studentActivity.replace(/\n/g, ' ')} | ${f.safety.replace(/\n/g, ' ')} |\n`;
  });
  md += `\n⏱ **총 수업 시간:** ${plan.lessonFlow.reduce((a, f) => a + f.time, 0)}분\n\n`;

  // 게임 활용 상세
  if (plan.gameDetail) {
    md += `## 🎮 게임 활용 상세\n\n`;
    md += `- **준비:** ${plan.gameDetail.preparation}\n`;
    md += `- **배치:** ${plan.gameDetail.arrangement}\n`;
    md += `- **역할 순환:** ${plan.gameDetail.rotation}\n`;
    md += `- **기기 운영:** ${plan.gameDetail.deviceOps}\n`;
    md += `- **난이도:** ${plan.gameDetail.difficulty}\n\n`;
    md += `### 진행 순서\n\n`;
    plan.gameDetail.procedure.forEach((p, i) => { md += `${i + 1}. ${p}\n`; });
    md += '\n';
  }

  // 안전 지도
  md += `## 🛡 안전 지도\n\n`;
  plan.safety.forEach(s => { md += `- ${s}\n`; });
  md += '\n';

  // 평가
  md += `## 🔍 과정 중심 평가\n\n`;
  md += `**평가 요소:** ${plan.evaluation.elements.join(', ')}\n\n`;
  md += `### 관찰 체크리스트\n\n`;
  plan.evaluation.checklist.forEach(c => { md += `- [ ] ${c}\n`; });
  md += '\n';

  // 자기평가
  md += `## 🙋 학생 자기평가\n\n`;
  plan.selfEval.items.forEach(it => { md += `- [ ] ${it}\n`; });
  md += '\n';

  // 수준별
  md += `## 🔄 수준별 활동 조정\n\n`;
  md += `### 🌱 도움이 필요한 학생\n\n`;
  plan.levelAdjust.needHelp.forEach(it => { md += `- ${it}\n`; });
  md += `\n### 🌿 일반 학생\n\n`;
  plan.levelAdjust.general.forEach(it => { md += `- ${it}\n`; });
  md += `\n### 🌳 도전이 필요한 학생\n\n`;
  plan.levelAdjust.challenge.forEach(it => { md += `- ${it}\n`; });
  md += '\n';

  // 포용
  md += `## ♿ 모두가 참여하는 수업\n\n`;
  plan.inclusion.forEach(s => { md += `- ${s}\n`; });
  md += '\n';

  // 교사 TIP
  md += `## 💡 교사 TIP\n\n`;
  plan.teacherTips.forEach(t => {
    md += `**❓ ${t.problem}**\n\n→ ${t.solution}\n\n`;
  });

  // 게임 변형
  if (plan.gameVariations.length > 0) {
    md += `## 🎮 게임 변형 수업\n\n`;
    plan.gameVariations.forEach(v => {
      md += `**[${v.level}]** ${v.description}\n\n`;
    });
  }

  // 대안
  md += `## 🔀 이렇게 바꿔도 좋아요\n\n`;
  plan.alternatives.forEach(a => {
    md += `**📌 ${a.scenario}**\n\n${a.solution}\n\n`;
  });

  // NO DEVICE
  md += `## 📵 NO DEVICE 대체 활동\n\n`;
  md += `${plan.noDeviceActivity}\n\n`;

  md += `---\n\n`;
  md += `*© 땀방울 원정대 수업 지도안 생성기 · 2022 개정 초등 체육과 교육과정 연계*\n`;

  return md;
}
