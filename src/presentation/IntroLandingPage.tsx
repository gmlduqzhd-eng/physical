import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Play,
  Users,
  BookOpen,
  ArrowRight,
  ChevronRight,
  Sun,
  Moon,
  Tv,
  HelpCircle,
  ChevronDown,
  Gamepad2,
  Activity,
  Flame,
  KeyRound
} from 'lucide-react';
import { useTheme } from '../application/ThemeContext';
import { sfxTap, sfxSuccess } from '../application/soundEffects';

export const IntroLandingPage = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  // 학생 인라인 PIN 입력 상태
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // 교육과정 3대 영역 탭 ('exercise' | 'sport' | 'expression')
  const [curriculumTab, setCurriculumTab] = useState<'exercise' | 'sport' | 'expression'>('exercise');

  // FAQ 아코디언 상태
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // 학생 PIN 즉시 입장 핸들러
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pinInput.trim();
    if (!cleaned) {
      setPinError('PIN 4자리를 입력해주세요.');
      return;
    }
    sfxSuccess();
    navigate(`/lobby?pin=${cleaned}`);
  };

  // 넷플릭스 스타일 인기 추천 게임 6선
  const FEATURED_GAMES = [
    {
      id: 'jump',
      name: '순발력 점프왕',
      category: '운동',
      emoji: '🦘',
      badge: '순발력 체력',
      code: '[4체01-02]',
      desc: '스마트폰을 쥐고 점프! 체공 시간과 수직 도약을 실시간 감지',
      gradient: 'from-amber-500 to-orange-600',
    },
    {
      id: 'squat',
      name: '스쿼트 챌린지',
      category: '운동',
      emoji: '🏋️',
      badge: '근력·근지구력',
      code: '[6체01-02]',
      desc: '자이로 센서로 무릎 각도와 자세를 정밀 판정하는 피트니스 대결',
      gradient: 'from-cyan-500 to-blue-600',
    },
    {
      id: 'rolling-curling',
      name: '공 굴림 컬링 원정',
      category: '스포츠',
      emoji: '🥌',
      badge: '표적·투사',
      code: '[4체02-05]',
      desc: '손목 스냅의 힘을 정밀 조절해 하우스 중앙(버튼)에 스톤 안착',
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'open-space-tactician',
      name: '빈 공간 설계자',
      category: '스포츠',
      emoji: '🗺️',
      badge: '침투 전술',
      code: '[6체02-05]',
      desc: '3:2 오프사이드 트랩을 부수고 공간으로 찔러주는 칼날 스루패스',
      gradient: 'from-rose-500 to-pink-600',
    },
    {
      id: 'slingshot-archery',
      name: '슬링샷 양궁 퍼펙트 텐',
      category: '스포츠',
      emoji: '🎯',
      badge: '전략·집중',
      code: '[6체02-04]',
      desc: '바람의 세기와 각도를 계산해 활시위를 당기는 전략형 양궁',
      gradient: 'from-purple-500 to-indigo-600',
    },
    {
      id: 'partner-robot-lab',
      name: '파트너 로봇 연구소',
      category: '표현',
      emoji: '🤖',
      badge: '창의 움직임',
      code: '[4체03-02]',
      desc: '신체 요소를 활용한 로봇 대칭 동작 모방 및 창의 표현',
      gradient: 'from-sky-500 to-cyan-600',
    },
  ];

  // 교육과정 3대 영역 게임 데이터
  const CURRICULUM_DATA = {
    exercise: {
      name: '운동 영역 (Health & Fitness)',
      tag: '건강 체력 · 심폐지구력 · 근력',
      color: 'text-emerald-500',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
      btnBg: 'bg-emerald-600 hover:bg-emerald-500',
      games: [
        { id: 'jump', name: '점프왕!', emoji: '🦘', code: '[4체01-02]', desc: '순발력 수직 점프 감지' },
        { id: 'squat', name: '스쿼트 챌린지', emoji: '🏋️', code: '[6체01-02]', desc: '자이로 각도 정밀 판정' },
        { id: 'run', name: '제자리 달리기', emoji: '🏃', code: '[4체01-02]', desc: '스텝 보폭 가속도 측정' },
        { id: 'plank', name: '플랭크 챌린지', emoji: '💪', code: '[6체01-05]', desc: '코어 정적 유지력 대결' },
      ],
    },
    sport: {
      name: '스포츠 영역 (Sports & Games)',
      tag: '기술형 · 전략형 · 생태형',
      color: 'text-blue-500',
      badgeBg: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
      btnBg: 'bg-blue-600 hover:bg-blue-500',
      games: [
        { id: 'rolling-curling', name: '공 굴림 컬링', emoji: '🥌', code: '[4체02-05]', desc: '표적 힘 조절 & 스냅' },
        { id: 'open-space-tactician', name: '오프사이드 브레이커', emoji: '⚽', code: '[6체02-05]', desc: '공간 침투 스루패스' },
        { id: 'slingshot-archery', name: '슬링샷 양궁', emoji: '🎯', code: '[6체02-04]', desc: '탄성 조준 퍼펙트 텐' },
        { id: 'kayak-paddle', name: '급류 탈출 카약', emoji: '🛶', code: '[4체02-07]', desc: '좌우 교차 패들링 모험' },
      ],
    },
    expression: {
      name: '표현 영역 (Expression & Movement)',
      tag: '움직임 요소 · 창의 표현 · 감정',
      color: 'text-purple-500',
      badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400',
      btnBg: 'bg-purple-600 hover:bg-purple-500',
      games: [
        { id: 'partner-robot-lab', name: '파트너 로봇 연구소', emoji: '🤖', code: '[4체03-02]', desc: '대칭 신체 창의 동작' },
        { id: 'emotion-thermometer', name: '감정 온도계', emoji: '🌡️', code: '[4체03-04]', desc: '표정과 몸짓 감정 표현' },
        { id: 'dribble-rhythm', name: '드리블 박자 공장', emoji: '🥁', code: '[4체02-03]', desc: '리듬 템포 동기화 조작' },
        { id: 'animal', name: '동물 체조 원정대', emoji: '🐾', code: '[4체03-03]', desc: '사물·자연 모방 움직임' },
      ],
    },
  };

  // 핵심 FAQ 데이터 (엄선된 3선)
  const FAQS = [
    {
      q: '별도의 앱(App) 설치나 학생 가입이 필요한가요?',
      a: '전혀 필요 없습니다! 스마트폰, 태블릿, PC의 웹 브라우저(크롬, 웨일, 사파리)에서 접속만으로 즉시 작동합니다. 학생들은 복잡한 가입 없이 교사가 발급한 4자리 PIN이나 QR 스캔으로 1초 만에 입장합니다.',
    },
    {
      q: '스마트폰 센서(자이로/가속도)는 어떻게 작동하나요?',
      a: '웹 표준 센서 API를 활용하여 스마트폰의 상하 흔들림, 회전, 기울기, 점프 충격량을 브라우저에서 직접 실시간 연산합니다. 별도의 하드웨어나 외장 장비 없이 스마트폰만 있으면 됩니다.',
    },
    {
      q: '비가 오거나 미세먼지가 심한 날 교실 체육으로도 적합한가요?',
      a: '네, 교실 실내 체육에 최적화되어 있습니다! 책상 사이 공간이나 제자리에서 안전하게 온몸을 움직일 수 있는 게임들로 구성되어 있어 악천후 시에도 완벽한 체육 수업을 진행할 수 있습니다.',
    },
  ];

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 select-none ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* 🌟 1. 글로벌 네비게이션 헤더 */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-white/95 border-slate-200 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* 로고 */}
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-cyan-500/20 shrink-0">
              💦
            </div>
            <div className="whitespace-nowrap shrink-0 flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600 whitespace-nowrap">
                땀방울 원정대
              </span>
              <span className="hidden sm:inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 whitespace-nowrap">
                2022 개정 체육
              </span>
            </div>
          </div>

          {/* 중앙 네비게이션 링크 */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-bold whitespace-nowrap">
            <a href="#action-cards" className={`transition-colors whitespace-nowrap ${isDark ? 'text-slate-300 hover:text-cyan-400' : 'text-slate-700 hover:text-cyan-600'}`}>
              바로 시작
            </a>
            <a href="#intro-video" className={`transition-colors whitespace-nowrap ${isDark ? 'text-slate-300 hover:text-cyan-400' : 'text-slate-700 hover:text-cyan-600'}`}>
              소개 영상
            </a>
            <a href="#trending" className={`transition-colors whitespace-nowrap ${isDark ? 'text-slate-300 hover:text-cyan-400' : 'text-slate-700 hover:text-cyan-600'}`}>
              인기 게임
            </a>
            <a href="#curriculum" className={`transition-colors whitespace-nowrap ${isDark ? 'text-slate-300 hover:text-cyan-400' : 'text-slate-700 hover:text-cyan-600'}`}>
              3대 영역
            </a>
            <a href="#workflow" className={`transition-colors whitespace-nowrap ${isDark ? 'text-slate-300 hover:text-cyan-400' : 'text-slate-700 hover:text-cyan-600'}`}>
              수업 진행 3단계
            </a>
            <button
              onClick={() => navigate('/manual?tab=lesson')}
              className={`transition-colors whitespace-nowrap text-xs px-2.5 py-1 rounded-lg border ${
                isDark ? 'border-purple-500/40 text-purple-300 hover:bg-purple-950/40' : 'border-purple-300 text-purple-700 hover:bg-purple-50'
              }`}
            >
              📋 지도안 생성
            </button>
          </nav>

          {/* 우측 액션 버튼들 */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* 다크/라이트 모드 토글 */}
            <button
              onClick={toggleTheme}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all shrink-0 ${isDark ? 'bg-slate-900 border-slate-700 text-yellow-400 hover:bg-slate-800' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'}`}
              title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* 교사용 수업 관리 */}
            <button
              onClick={() => {
                sfxTap();
                navigate('/admin');
              }}
              className={`hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap shrink-0 ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200 hover:text-white hover:border-cyan-500' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'}`}
            >
              <Users className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span className="whitespace-nowrap">선생님 모드</span>
            </button>

            {/* 핵심 CTA: 게임 허브 */}
            <button
              onClick={() => {
                sfxSuccess();
                navigate('/hub');
              }}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 !text-white rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95 whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-white !text-white shrink-0" />
              <span className="whitespace-nowrap !text-white">게임 허브</span>
            </button>
          </div>
        </div>
      </header>

      {/* 🚀 2. 히어로 섹션 (컨셉 A: 3대 액션 피라미드 포털) */}
      <section className="relative overflow-hidden pt-10 pb-16 md:pt-14 md:pb-20">
        {/* 은은한 배경 오라 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-gradient-to-tr from-cyan-500/15 via-blue-500/15 to-purple-500/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* 헤드라인: 텍스트를 대폭 압축하여 3초 만에 각인 */}
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-600 dark:text-cyan-400 text-xs sm:text-sm font-bold shadow-sm whitespace-nowrap">
              <Sparkles className="w-4 h-4 text-cyan-500 animate-pulse shrink-0" />
              <span className="whitespace-nowrap">앱 설치 없이 웹에서 바로 시작하는 미래형 체육 플랫폼</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] break-keep">
              스마트폰 하나로,<br />
              교실이 <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500">신나는 경기장</span>으로!
            </h1>

            <p className={`text-sm sm:text-base leading-relaxed max-w-xl mx-auto break-keep font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              카메라 QR 스캔으로 1초 만에 입장! 50여 종의 2022 개정 체육 미니게임과 실시간 모둠 대결을 지금 경험해보세요.
            </p>
          </div>

          {/* 🎯 [핵심] 3대 메인 액션 카드 (선생님 / 학생 / 게임 허브) */}
          <div id="action-cards" className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            
            {/* 카드 1: 🏫 선생님 수업 개설 (교사용) */}
            <div className={`p-6 sm:p-7 rounded-3xl border-2 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl flex flex-col justify-between relative overflow-hidden group ${
              isDark
                ? 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/60 shadow-lg'
                : 'bg-white border-slate-200 hover:border-cyan-500 shadow-md'
            }`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/20 transition-colors" />

              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-black px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 whitespace-nowrap">
                    선생님 전용
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xl shrink-0">
                    🏫
                  </div>
                </div>

                <h3 className="text-xl sm:text-2xl font-black mb-2 break-keep">
                  수업방 개설 & 관리
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed mb-6 break-keep ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  학급 방을 열어 TV 전광판과 학생 입장용 QR을 띄우고, 수업 종료 후 NEIS 세특을 자동 작성합니다.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => {
                    sfxSuccess();
                    navigate('/admin');
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 !text-white rounded-2xl font-black text-sm sm:text-base shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 active:scale-95"
                >
                  <Users className="w-4 h-4 shrink-0 !text-white" />
                  <span className="whitespace-nowrap !text-white">수업방 개설하기</span>
                  <ArrowRight className="w-4 h-4 shrink-0 !text-white" />
                </button>

                <div className="flex items-center justify-between text-xs font-bold pt-1 px-1">
                  <button
                    onClick={() => navigate('/board')}
                    className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <Tv className="w-3.5 h-3.5" /> TV 전광판만 열기
                  </button>
                  <button
                    onClick={() => navigate('/manual?tab=lesson')}
                    className="text-slate-500 dark:text-slate-400 hover:underline flex items-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> 지도안 생성
                  </button>
                </div>
              </div>
            </div>

            {/* 카드 2: 📱 학생 PIN 입장 (학생용 & 인라인 입력) */}
            <div className={`p-6 sm:p-7 rounded-3xl border-2 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl flex flex-col justify-between relative overflow-hidden group ${
              isDark
                ? 'bg-slate-900/90 border-slate-800 hover:border-purple-500/60 shadow-lg'
                : 'bg-white border-slate-200 hover:border-purple-500 shadow-md'
            }`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/20 transition-colors" />

              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-black px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 whitespace-nowrap">
                    학생 전용
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl shrink-0">
                    📱
                  </div>
                </div>

                <h3 className="text-xl sm:text-2xl font-black mb-2 break-keep">
                  학생 모둠 PIN 입장
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed mb-4 break-keep ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  교실 앞 TV 화면에 떠 있는 4자리 PIN 코드를 입력하면 즉시 모둠 대결에 입장합니다.
                </p>
              </div>

              {/* 인라인 PIN 입력 폼 */}
              <form onSubmit={handlePinSubmit} className="space-y-2.5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value);
                        setPinError('');
                      }}
                      placeholder="PIN 4자리 (예: 1234)"
                      className={`w-full pl-10 pr-3 py-3 rounded-2xl text-center font-mono font-bold text-base border transition-all ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-purple-500'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500'
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 !text-white rounded-2xl font-black text-sm transition-all shadow-md active:scale-95 whitespace-nowrap shrink-0"
                  >
                    입장 ▶
                  </button>
                </div>

                {pinError ? (
                  <p className="text-[11px] text-rose-500 font-bold text-center">{pinError}</p>
                ) : (
                  <div className="flex items-center justify-center text-xs font-bold pt-1">
                    <button
                      type="button"
                      onClick={() => navigate('/lobby')}
                      className="text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      또는 모둠 선택 로비로 직접 이동 →
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* 카드 3: 🎮 50+ 미니게임 허브 (자유 플레이) */}
            <div className={`p-6 sm:p-7 rounded-3xl border-2 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl flex flex-col justify-between relative overflow-hidden group ${
              isDark
                ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/60 shadow-lg'
                : 'bg-white border-slate-200 hover:border-emerald-500 shadow-md'
            }`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-colors" />

              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-black px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                    자유 체험
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
                    🎮
                  </div>
                </div>

                <h3 className="text-xl sm:text-2xl font-black mb-2 break-keep">
                  50+ 미니게임 허브
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed mb-6 break-keep ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  방 개설 없이도 혼자서 또는 짝과 함께 50여 가지 신체활동 게임을 바로 플레이할 수 있습니다.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => {
                    sfxSuccess();
                    navigate('/hub');
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 !text-white rounded-2xl font-black text-sm sm:text-base shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 active:scale-95"
                >
                  <Gamepad2 className="w-4 h-4 shrink-0 !text-white" />
                  <span className="whitespace-nowrap !text-white">게임 허브 전체보기</span>
                  <ArrowRight className="w-4 h-4 shrink-0 !text-white" />
                </button>

                <div className="flex items-center justify-between text-xs font-bold pt-1 px-1">
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    ⚡ 3대 영역 50종 탑재
                  </span>
                  <button
                    onClick={() => navigate('/play/jump')}
                    className="text-slate-500 dark:text-slate-400 hover:underline"
                  >
                    점프왕 1초 체험 ▶
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 🎬 2.5 플랫폼 공식 소개 영상 (엽쌤스쿨) */}
      <section id="intro-video" className="py-12 md:py-16 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold shadow-sm whitespace-nowrap mb-2">
              <Play className="w-3.5 h-3.5 fill-rose-500 shrink-0" />
              <span>1분 만에 보는 플랫폼 소개</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight break-keep">
              땀방울 원정대, 영상으로 먼저 만나보세요
            </h2>
            <p className={`text-xs sm:text-sm mt-1.5 break-keep ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              선생님과 학생들이 교실에서 직접 스마트폰으로 체육 수업을 즐기는 생생한 모습을 확인하세요.
            </p>
          </div>

          {/* 16:9 반응형 유튜브 비디오 플레이어 컨테이너 */}
          <div className={`relative rounded-3xl overflow-hidden border-2 shadow-2xl transition-all ${
            isDark ? 'bg-slate-900 border-slate-700/80 shadow-cyan-500/10' : 'bg-slate-900 border-slate-300 shadow-xl'
          }`}>
            <div className="relative w-full aspect-video">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/fxb91q1Et-4?rel=0"
                title="땀방울 원정대 공식 소개 영상 (엽쌤스쿨)"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className={`p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-t text-xs ${
              isDark ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🎥</span>
                <div>
                  <span className="font-black text-sm">땀방울 원정대 공식 소개 영상</span>
                  <span className="mx-2 text-slate-400">·</span>
                  <span className="text-slate-500 font-medium">제작: 엽쌤스쿨</span>
                </div>
              </div>
              <a
                href="https://youtu.be/fxb91q1Et-4"
                target="_blank"
                rel="noreferrer noopener"
                className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-1 shrink-0"
              >
                <span>YouTube에서 열기</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* 🔥 3. 지금 가장 핫한 인기 게임 TOP 6 (Trending Games Showcase) */}
      <section id="trending" className={`py-14 border-y transition-colors ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-100/70 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-500 uppercase tracking-wider mb-1">
                <Flame className="w-4 h-4 fill-amber-500" /> TRENDING TOP 6
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight break-keep">
                아이들이 가장 열광하는 대표 미니게임
              </h2>
            </div>

            <button
              onClick={() => {
                sfxTap();
                navigate('/hub');
              }}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-cyan-600 dark:text-cyan-400 hover:underline shrink-0"
            >
              전체 50+ 게임 목록 보기 <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 넷플릭스 스타일 시각적 게임 카드 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURED_GAMES.map((game) => (
              <div
                key={game.id}
                onClick={() => {
                  sfxTap();
                  navigate(`/play/${game.id}`);
                }}
                className={`group p-5 rounded-3xl border-2 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/50'
                    : 'bg-white border-slate-200 hover:border-cyan-500 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${game.gradient} flex items-center justify-center text-2xl shadow-md transition-transform group-hover:scale-110 shrink-0`}>
                      {game.emoji}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 whitespace-nowrap">
                        {game.badge}
                      </span>
                      <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold whitespace-nowrap">
                        {game.code}
                      </span>
                    </div>
                  </div>

                  <h3 className={`text-lg font-black transition-colors mb-1.5 whitespace-nowrap ${isDark ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-cyan-600'}`}>
                    {game.name}
                  </h3>
                  <p className={`text-xs leading-relaxed mb-4 break-keep line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {game.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] font-bold text-slate-500">1초 만에 실행</span>
                  <span className="text-xs font-black text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                    지금 플레이 <Play className="w-3 h-3 fill-current ml-0.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 🏃 4. 2022 개정 체육과 3대 영역 퀵 셀렉터 (Curriculum Showcase) */}
      <section id="curriculum" className="py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-xs font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-1 whitespace-nowrap">
              2022 개정 체육과 완벽 연계
            </h2>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight break-keep">
              교육과정 3대 영역별 맞춤 게임
            </h3>
            <p className={`text-xs sm:text-sm mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              원하는 영역을 클릭하면 국가 성취기준 기반의 게임들을 즉시 확인할 수 있습니다.
            </p>

            {/* 3대 영역 탭 칩 */}
            <div className="flex flex-wrap justify-center gap-2.5 mt-5">
              {[
                { id: 'exercise', name: '🏃 운동 영역', tag: '체력·자세·건강' },
                { id: 'sport', name: '⚽ 스포츠 영역', tag: '기술·전술·생태' },
                { id: 'expression', name: '💃 표현 영역', tag: '움직임·리듬' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    sfxTap();
                    setCurriculumTab(t.id as any);
                  }}
                  className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black border transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
                    curriculumTab === t.id
                      ? isDark
                        ? 'bg-slate-800 border-cyan-500 text-cyan-300 shadow-md scale-105'
                        : 'bg-white border-cyan-600 text-cyan-700 shadow-md scale-105'
                      : isDark
                        ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{t.name}</span>
                  <span className="text-[10px] font-normal opacity-70">({t.tag})</span>
                </button>
              ))}
            </div>
          </div>

          {/* 영역별 대표 카드 4선 그리드 */}
          <div className={`p-6 sm:p-7 rounded-3xl border-2 ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-lg'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-slate-200 dark:border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black px-3 py-1 rounded-full border ${CURRICULUM_DATA[curriculumTab].badgeBg}`}>
                  {CURRICULUM_DATA[curriculumTab].tag}
                </span>
                <h4 className="text-lg font-black">{CURRICULUM_DATA[curriculumTab].name}</h4>
              </div>
              <button
                onClick={() => navigate('/hub')}
                className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline self-start sm:self-auto"
              >
                이 영역 전체 게임 보기 →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CURRICULUM_DATA[curriculumTab].games.map(g => (
                <div
                  key={g.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isDark ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-3xl mb-2">{g.emoji}</div>
                    <h5 className="font-black text-sm sm:text-base whitespace-nowrap mb-0.5">{g.name}</h5>
                    <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold block mb-1">
                      {g.code}
                    </span>
                    <p className={`text-xs break-keep ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {g.desc}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      sfxTap();
                      navigate(`/play/${g.id}`);
                    }}
                    className={`mt-4 w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 text-white shadow-sm active:scale-95 ${CURRICULUM_DATA[curriculumTab].btnBg}`}
                  >
                    <span>체험하기</span> <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ⚡ 5. 3초 만에 이해하는 수업 흐름 (Simple 3-Step Flow) */}
      <section id="workflow" className={`py-14 border-y transition-colors ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-100/70 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-xs font-bold tracking-widest text-cyan-600 dark:text-cyan-400 uppercase mb-1 whitespace-nowrap">
              EASY WORKFLOW
            </h2>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight break-keep">
              단 3단계로 끝나는 스마트 체육
            </h3>
            <p className={`text-xs sm:text-sm mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              선생님도 학생도 번거로운 준비 없이 바로 신나게 뛰어놉니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                step: '01',
                title: 'QR 1초 스캔',
                desc: '앱 설치/회원가입 없이, 교실 TV 화면의 QR코드를 카메라로 비추면 학생 전원 5초 만에 입장 완료.',
                icon: '📱',
                color: 'text-cyan-400',
              },
              {
                step: '02',
                title: '온몸으로 모둠 대결',
                desc: '점프, 스쿼트, 달리기로 온몸을 움직이면 스마트폰 센서가 땀방울을 감지해 대형 전광판에 라이브 집계.',
                icon: '🔥',
                color: 'text-amber-400',
              },
              {
                step: '03',
                title: 'NEIS 세특 자동 완성',
                desc: '수업 종료 즉시 2022 개정 성취기준에 맞춘 학교생활기록부 체육과 세특 평가 문구가 원클릭 자동 생성.',
                icon: '📝',
                color: 'text-emerald-400',
              },
            ].map((s, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-3xl border-2 transition-all ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-3xl">{s.icon}</div>
                  <span className={`text-2xl font-black font-mono ${s.color}`}>STEP {s.step}</span>
                </div>
                <h4 className="text-lg font-black mb-1.5 break-keep">{s.title}</h4>
                <p className={`text-xs sm:text-sm leading-relaxed break-keep ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 🛠️ 6. 교사용 빠른 도구함 (Teacher Quick Bar) */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto rounded-3xl p-6 sm:p-8 border-2 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-blue-900/20 via-indigo-900/20 to-purple-900/20 border-cyan-500/30">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">👩‍🏫</span>
              <h3 className="text-lg sm:text-xl font-black break-keep">체육 수업 준비가 고민이신가요?</h3>
            </div>
            <p className={`text-xs sm:text-sm break-keep ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              2022 개정 교육과정 연계 교수학습 지도안 생성기, 무선 리모컨, 실시간 전광판을 무료로 사용해보세요.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
            <button
              onClick={() => navigate('/manual?tab=lesson')}
              className="flex-1 md:flex-none px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>지도안 생성기</span>
            </button>
            <button
              onClick={() => navigate('/remote')}
              className="flex-1 md:flex-none px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap"
            >
              <Activity className="w-4 h-4 text-amber-400 shrink-0" />
              <span>교사 리모컨</span>
            </button>
            <button
              onClick={() => navigate('/board')}
              className="flex-1 md:flex-none px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap"
            >
              <Tv className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>대형 전광판</span>
            </button>
          </div>
        </div>
      </section>

      {/* ❓ 7. 꼭 필요한 핵심 FAQ (3선 아코디언) */}
      <section className={`py-12 border-t transition-colors ${isDark ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-100/60 border-slate-200'}`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-6">
            <h3 className="text-xl sm:text-2xl font-black break-keep">자주 묻는 질문</h3>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <button
                    aria-expanded={isOpen}
                    aria-controls={`faq-${index}`}
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4 text-left flex justify-between items-center gap-3 focus:outline-none"
                  >
                    <span className="font-bold text-xs sm:text-sm flex items-center gap-2.5 break-keep">
                      <HelpCircle className="w-4 h-4 text-cyan-500 shrink-0" />
                      <span>{faq.q}</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-cyan-500' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div id={`faq-${index}`} className={`px-4 pb-4 pt-1 text-xs leading-relaxed border-t break-keep ${
                      isDark ? 'text-slate-300 border-slate-800/80' : 'text-slate-600 border-slate-200'
                    }`}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 📄 8. 푸터 (Footer) */}
      <footer className={`py-8 border-t text-xs transition-colors ${isDark ? 'bg-slate-950 border-slate-900 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 break-keep">
            <span className="text-base">💦</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">땀방울 원정대</span>
            <span>·</span>
            <span>2022 개정 초등 체육과 교육과정 연계 스마트 피지컬 컴퓨팅</span>
          </div>

          <div className="flex items-center gap-5 whitespace-nowrap shrink-0 font-bold">
            <button onClick={() => navigate('/manual')} className="hover:text-cyan-500 transition-colors">
              사용 설명서
            </button>
            <button onClick={() => navigate('/manual?tab=lesson')} className="hover:text-cyan-500 transition-colors">
              지도안 생성기
            </button>
            <button onClick={() => navigate('/admin')} className="hover:text-cyan-500 transition-colors">
              교사용 로비
            </button>
            <button onClick={() => navigate('/hub')} className="text-cyan-600 dark:text-cyan-400 hover:underline">
              게임 허브
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
};
