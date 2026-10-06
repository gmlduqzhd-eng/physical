import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Play,
  Users,
  BookOpen,
  ArrowRight,
  Sun,
  Moon,
  Tv,
  HelpCircle,
  ChevronDown,
  Gamepad2,
  Activity,
  KeyRound,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '../application/ThemeContext';
import { sfxTap, sfxSuccess } from '../application/soundEffects';

export const IntroLandingPage = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  // 학생 인라인 PIN 입력 상태
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // 게임 쇼케이스 탭 ('trending' | 'exercise' | 'sport' | 'expression')
  const [activeTab, setActiveTab] = useState<'trending' | 'exercise' | 'sport' | 'expression'>('trending');

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

  // 단일 통합 쇼케이스 데이터
  const SHOWCASE_TABS = [
    { id: 'trending', label: '🔥 인기 TOP 6', desc: '가장 많이 플레이되는 대표 게임' },
    { id: 'exercise', label: '🏃 운동 영역', desc: '체력 · 건강 · 순발력' },
    { id: 'sport', label: '⚽ 스포츠 영역', desc: '기술형 · 전략형 · 생태형' },
    { id: 'expression', label: '💃 표현 영역', desc: '움직임 요소 · 창의 동작' },
  ] as const;

  const SHOWCASE_GAMES: Record<string, Array<{
    id: string;
    name: string;
    emoji: string;
    badge: string;
    code: string;
    desc: string;
    gradient: string;
  }>> = {
    trending: [
      {
        id: 'jump',
        name: '순발력 점프왕',
        emoji: '🦘',
        badge: '운동',
        code: '[4체01-02]',
        desc: '스마트폰을 쥐고 점프! 체공 시간과 수직 도약 실시간 감지',
        gradient: 'from-amber-500 to-orange-600',
      },
      {
        id: 'squat',
        name: '스쿼트 챌린지',
        emoji: '🏋️',
        badge: '운동',
        code: '[6체01-02]',
        desc: '자이로 센서로 무릎 각도와 자세를 정밀 판정하는 피트니스 대결',
        gradient: 'from-cyan-500 to-blue-600',
      },
      {
        id: 'rolling-curling',
        name: '공 굴림 컬링 원정',
        emoji: '🥌',
        badge: '스포츠',
        code: '[4체02-05]',
        desc: '손목 스냅의 힘을 정밀 조절해 하우스 중앙에 스톤 안착',
        gradient: 'from-emerald-500 to-teal-600',
      },
      {
        id: 'open-space-tactician',
        name: '빈 공간 설계자',
        emoji: '🗺️',
        badge: '스포츠',
        code: '[6체02-05]',
        desc: '3:2 오프사이드 트랩을 뚫고 공간으로 찔러주는 스루패스',
        gradient: 'from-rose-500 to-pink-600',
      },
      {
        id: 'slingshot-archery',
        name: '슬링샷 양궁 퍼펙트 텐',
        emoji: '🎯',
        badge: '스포츠',
        code: '[6체02-04]',
        desc: '바람 세기와 각도를 계산해 활시위를 당기는 전략형 양궁',
        gradient: 'from-purple-500 to-indigo-600',
      },
      {
        id: 'partner-robot-lab',
        name: '파트너 로봇 연구소',
        emoji: '🤖',
        badge: '표현',
        code: '[4체03-02]',
        desc: '신체 요소를 활용한 로봇 대칭 동작 모방 및 창의 표현',
        gradient: 'from-sky-500 to-cyan-600',
      },
    ],
    exercise: [
      {
        id: 'jump',
        name: '순발력 점프왕',
        emoji: '🦘',
        badge: '순발력',
        code: '[4체01-02]',
        desc: '수직 점프 체공 시간과 도약력 정밀 측정',
        gradient: 'from-amber-500 to-orange-600',
      },
      {
        id: 'squat',
        name: '스쿼트 챌린지',
        emoji: '🏋️',
        badge: '근력·지구력',
        code: '[6체01-02]',
        desc: '스마트폰 자이로 각도 기반 정확한 스쿼트 판정',
        gradient: 'from-cyan-500 to-blue-600',
      },
      {
        id: 'run',
        name: '제자리 달리기',
        emoji: '🏃',
        badge: '심폐지구력',
        code: '[4체01-02]',
        desc: '스마트폰을 쥐고 빠르게 스텝을 밟아 완주',
        gradient: 'from-emerald-500 to-teal-600',
      },
      {
        id: 'plank',
        name: '플랭크 챌린지',
        emoji: '💪',
        badge: '코어 근력',
        code: '[6체01-05]',
        desc: '등 위에 폰을 얹고 정적 코어 버티기 대결',
        gradient: 'from-indigo-500 to-purple-600',
      },
    ],
    sport: [
      {
        id: 'rolling-curling',
        name: '공 굴림 컬링 원정',
        emoji: '🥌',
        badge: '표적·투사',
        code: '[4체02-05]',
        desc: '손목 스냅의 힘을 정밀 조절해 하우스 중앙 안착',
        gradient: 'from-emerald-500 to-teal-600',
      },
      {
        id: 'open-space-tactician',
        name: '빈 공간 설계자',
        emoji: '⚽',
        badge: '영역 침투',
        code: '[6체02-05]',
        desc: '오프사이드 트랩을 부수는 스루패스 전술',
        gradient: 'from-rose-500 to-pink-600',
      },
      {
        id: 'slingshot-archery',
        name: '슬링샷 양궁',
        emoji: '🎯',
        badge: '투사체 집중',
        code: '[6체02-04]',
        desc: '바람과 탄성을 계산해 10점 과녁을 명중',
        gradient: 'from-purple-500 to-indigo-600',
      },
      {
        id: 'kayak-paddle',
        name: '급류 탈출 카약',
        emoji: '🛶',
        badge: '생태 모험',
        code: '[4체02-07]',
        desc: '스마트폰을 패들 삼아 좌우로 젓는 급류 모험',
        gradient: 'from-blue-500 to-cyan-600',
      },
    ],
    expression: [
      {
        id: 'partner-robot-lab',
        name: '파트너 로봇 연구소',
        emoji: '🤖',
        badge: '움직임 요소',
        code: '[4체03-02]',
        desc: '짝과 함께 만드는 대칭 로봇 창의 동작',
        gradient: 'from-sky-500 to-cyan-600',
      },
      {
        id: 'emotion-thermometer',
        name: '감정 온도계',
        emoji: '🌡️',
        badge: '감정 표현',
        code: '[4체03-04]',
        desc: '기쁨, 분노, 슬픔 등 감정을 몸짓으로 표현',
        gradient: 'from-amber-500 to-rose-600',
      },
      {
        id: 'dribble-rhythm',
        name: '드리블 박자 공장',
        emoji: '🥁',
        badge: '리듬 조작',
        code: '[4체02-03]',
        desc: '음악 템포에 맞춰 스마트폰을 바운스 조작',
        gradient: 'from-pink-500 to-purple-600',
      },
      {
        id: 'animal',
        name: '동물 체조 원정대',
        emoji: '🐾',
        badge: '모방 표현',
        code: '[4체03-03]',
        desc: '개구리, 게, 독수리 등 자연 사물 모방 체조',
        gradient: 'from-teal-500 to-emerald-600',
      },
    ],
  };

  // 핵심 FAQ 데이터
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
          <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center text-lg shadow-md shadow-cyan-500/20 shrink-0">
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

          {/* 중앙 네비게이션 링크 (군더더기 축약) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-bold whitespace-nowrap">
            <a href="#showcase" className={`transition-colors whitespace-nowrap ${isDark ? 'text-slate-300 hover:text-cyan-400' : 'text-slate-700 hover:text-cyan-600'}`}>
              게임 쇼케이스
            </a>
            <a href="#workflow" className={`transition-colors whitespace-nowrap ${isDark ? 'text-slate-300 hover:text-cyan-400' : 'text-slate-700 hover:text-cyan-600'}`}>
              수업 진행 방식
            </a>
            <button
              onClick={() => navigate('/manual?tab=lesson')}
              className={`transition-colors whitespace-nowrap text-xs px-2.5 py-1 rounded-lg border ${
                isDark ? 'border-purple-500/40 text-purple-300 hover:bg-purple-950/40' : 'border-purple-300 text-purple-700 hover:bg-purple-50'
              }`}
            >
              📋 지도안 생성기
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

            {/* 게임 허브 바로가기 */}
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

      {/* 🚀 2. 통합 히어로 섹션 (좌측: 3대 퀵 액션 + 우측: 공식 소개 영상) */}
      <section className="relative overflow-hidden pt-8 pb-12 md:pt-12 md:pb-16">
        {/* 은은한 배경 오라 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-tr from-cyan-500/15 via-blue-500/15 to-purple-500/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* [좌측 7컬럼] 헤드라인 & 3대 퀵 스타트 바 */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              {/* 상단 뱃지 */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-600 dark:text-cyan-400 text-xs sm:text-sm font-bold shadow-sm whitespace-nowrap">
                <Sparkles className="w-4 h-4 text-cyan-500 animate-pulse shrink-0" />
                <span className="whitespace-nowrap">별도 앱 설치 없는 2022 개정 체육 디지털 플랫폼</span>
              </div>

              {/* 메인 타이틀 */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] break-keep">
                스마트폰 하나로,<br />
                교실이 <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500">신나는 경기장</span>으로!
              </h1>

              {/* 1줄 서브 카피 */}
              <p className={`text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0 break-keep font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                스마트폰 모션 센서로 즐기는 50여 종의 체육 미니게임과 실시간 모둠 대결, 그리고 NEIS 세특 자동 생성까지 원스톱으로 지원합니다.
              </p>

              {/* 🎯 3대 핵심 퀵 스타트 바 (Compact & Instant Action) */}
              <div className="space-y-3 pt-2 max-w-xl mx-auto lg:mx-0">
                
                {/* 1. 학생용 인라인 PIN 입력 바 */}
                <div className={`p-2.5 sm:p-3 rounded-2xl border-2 transition-all shadow-sm ${
                  isDark ? 'bg-slate-900/90 border-purple-500/40 hover:border-purple-500' : 'bg-white border-purple-200 hover:border-purple-400'
                }`}>
                  <form onSubmit={handlePinSubmit} className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-2 text-purple-600 dark:text-purple-400 shrink-0 font-black text-xs sm:text-sm">
                      <KeyRound className="w-4 h-4 shrink-0" />
                      <span className="hidden xs:inline whitespace-nowrap">학생 PIN</span>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value);
                        setPinError('');
                      }}
                      placeholder="TV의 4자리 번호 입력"
                      className={`flex-1 min-w-0 px-3 py-2 rounded-xl text-center font-mono font-bold text-sm sm:text-base border transition-all ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-purple-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-purple-500'
                      }`}
                    />
                    <button
                      type="submit"
                      className="px-4 sm:px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 !text-white rounded-xl font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 whitespace-nowrap shrink-0"
                    >
                      입장 ▶
                    </button>
                  </form>
                  {pinError && <p className="text-[11px] text-rose-500 font-bold mt-1 text-center">{pinError}</p>}
                </div>

                {/* 2. 교사용 & 자유 플레이 2대 버튼 나란히 배치 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* 교사용 수업방 개설 */}
                  <button
                    onClick={() => {
                      sfxSuccess();
                      navigate('/admin');
                    }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 !text-white rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 active:scale-95"
                  >
                    <Users className="w-4 h-4 shrink-0 !text-white" />
                    <span className="whitespace-nowrap !text-white">선생님 수업방 개설</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 !text-white" />
                  </button>

                  {/* 50+ 게임 허브 둘러보기 */}
                  <button
                    onClick={() => {
                      sfxTap();
                      navigate('/hub');
                    }}
                    className={`w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm border transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 active:scale-95 ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 hover:border-emerald-500 text-emerald-400 hover:text-emerald-300'
                        : 'bg-white border-slate-300 hover:border-emerald-500 text-emerald-700 shadow-sm'
                    }`}
                  >
                    <Gamepad2 className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">50+ 미니게임 허브</span>
                  </button>
                </div>

              </div>

            </div>

            {/* [우측 5컬럼] 엽쌤스쿨 공식 소개 영상 플레이어 */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              <div className={`relative rounded-3xl overflow-hidden border-2 shadow-2xl transition-all ${
                isDark ? 'bg-slate-900 border-slate-700 shadow-cyan-500/10' : 'bg-slate-900 border-slate-300 shadow-xl'
              }`}>
                {/* 16:9 반응형 영상 */}
                <div className="relative w-full aspect-video">
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/fxb91q1Et-4?rel=0"
                    title="땀방울 원정대 공식 소개 영상 (엽쌤스쿨)"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>

                {/* 영상 캡션 & 링크 */}
                <div className={`p-3 sm:p-3.5 flex items-center justify-between gap-2 border-t text-xs ${
                  isDark ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">🎥</span>
                    <span className="font-bold text-xs truncate">공식 소개 영상 (제작: 엽쌤스쿨)</span>
                  </div>
                  <a
                    href="https://youtu.be/fxb91q1Et-4"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-1 shrink-0 text-[11px]"
                  >
                    <span>유튜브</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 🎮 3. 통합 미니게임 쇼케이스 (탭 1개로 단일화하여 중복 제거) */}
      <section id="showcase" className={`py-12 border-y transition-colors ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-100/70 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-1">
                <Gamepad2 className="w-4 h-4" /> MINIGAME SHOWCASE
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight break-keep">
                대표 체육 미니게임 둘러보기
              </h2>
            </div>

            <button
              onClick={() => {
                sfxTap();
                navigate('/hub');
              }}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-cyan-600 dark:text-cyan-400 hover:underline shrink-0"
            >
              전체 50+ 게임 목록 보기 <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 4대 쇼케이스 탭 (인기 / 운동 / 스포츠 / 표현) */}
          <div className="flex flex-wrap gap-2 mb-6">
            {SHOWCASE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  sfxTap();
                  setActiveTab(tab.id);
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black border transition-all whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? isDark
                      ? 'bg-slate-800 border-cyan-500 text-cyan-300 shadow-md scale-105'
                      : 'bg-white border-cyan-600 text-cyan-700 shadow-md scale-105'
                    : isDark
                      ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      : 'bg-white/80 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* 선택된 탭의 게임 그리드 (최대 6개 또는 4개) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SHOWCASE_GAMES[activeTab].map((game) => (
              <div
                key={game.id}
                onClick={() => {
                  sfxTap();
                  navigate(`/play/${game.id}`);
                }}
                className={`group p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/50'
                    : 'bg-white border-slate-200 hover:border-cyan-500 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2.5">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${game.gradient} flex items-center justify-center text-xl shadow-md transition-transform group-hover:scale-110 shrink-0`}>
                      {game.emoji}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 whitespace-nowrap">
                        {game.badge}
                      </span>
                      <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold whitespace-nowrap">
                        {game.code}
                      </span>
                    </div>
                  </div>

                  <h3 className={`text-base font-black transition-colors mb-1 whitespace-nowrap ${isDark ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-cyan-600'}`}>
                    {game.name}
                  </h3>
                  <p className={`text-xs leading-relaxed mb-3 break-keep line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {game.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-500">1초 만에 실행</span>
                  <span className="text-xs font-black text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                    지금 플레이 <Play className="w-3 h-3 fill-current ml-0.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ⚡ 4. 수업 진행 3단계 & 교사용 빠른 도구함 (Compact Workflow & Tools) */}
      <section id="workflow" className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-xs font-bold tracking-widest text-cyan-600 dark:text-cyan-400 uppercase mb-1 whitespace-nowrap">
              SIMPLE & FAST
            </h2>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight break-keep">
              단 3단계로 완성되는 스마트 체육
            </h3>
          </div>

          {/* 3단계 가로 타임라인 배너 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              {
                step: '01',
                title: 'QR 1초 스캔',
                desc: '앱 설치/가입 없이 교실 TV 화면 QR을 비추면 5초 만에 전원 입장',
                icon: '📱',
                color: 'text-cyan-400',
              },
              {
                step: '02',
                title: '온몸으로 모둠 대결',
                desc: '점프·스쿼트·달리기로 땀방울을 감지해 대형 전광판 실시간 합산',
                icon: '🔥',
                color: 'text-amber-400',
              },
              {
                step: '03',
                title: 'NEIS 세특 자동 완성',
                desc: '수업 후 2022 개정 성취기준 연계 체육과 세특 평가 문구 원클릭 생성',
                icon: '📝',
                color: 'text-emerald-400',
              },
            ].map((s, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                  isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="text-3xl shrink-0 mt-0.5">{s.icon}</div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-mono font-black ${s.color}`}>STEP {s.step}</span>
                    <h4 className="text-sm sm:text-base font-black break-keep">{s.title}</h4>
                  </div>
                  <p className={`text-xs leading-relaxed break-keep ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 교사용 퀵 도구 바 (지도안 생성기 / 교사 리모컨 / 대형 전광판) */}
          <div className="rounded-2xl p-5 border-2 flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-blue-900/15 via-indigo-900/15 to-purple-900/15 border-cyan-500/30">
            <div>
              <h4 className="text-sm sm:text-base font-black break-keep flex items-center gap-1.5">
                <span>👩‍🏫</span> 교사용 수업 지원 퀵 툴킷
              </h4>
              <p className={`text-xs mt-0.5 break-keep ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                원클릭 교수학습 지도안 생성기, 무선 리모컨, 실시간 전광판을 무료로 사용하세요.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
              <button
                onClick={() => navigate('/manual?tab=lesson')}
                className="flex-1 md:flex-none px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95 whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>지도안 생성기</span>
              </button>
              <button
                onClick={() => navigate('/remote')}
                className="flex-1 md:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95 whitespace-nowrap"
              >
                <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>교사 리모컨</span>
              </button>
              <button
                onClick={() => navigate('/board')}
                className="flex-1 md:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95 whitespace-nowrap"
              >
                <Tv className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>대형 전광판</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ❓ 5. 핵심 FAQ (3선 컴팩트 아코디언) */}
      <section className={`py-10 border-t transition-colors ${isDark ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-100/60 border-slate-200'}`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-5">
            <h3 className="text-lg sm:text-xl font-black break-keep">자주 묻는 질문</h3>
          </div>

          <div className="space-y-2.5">
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
                    className="w-full p-3.5 text-left flex justify-between items-center gap-3 focus:outline-none"
                  >
                    <span className="font-bold text-xs sm:text-sm flex items-center gap-2 break-keep">
                      <HelpCircle className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      <span>{faq.q}</span>
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-cyan-500' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div id={`faq-${index}`} className={`px-3.5 pb-3.5 pt-1 text-xs leading-relaxed border-t break-keep ${
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

      {/* 📄 6. 푸터 (Footer) */}
      <footer className={`py-6 border-t text-xs transition-colors ${isDark ? 'bg-slate-950 border-slate-900 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 break-keep">
            <span className="text-sm">💦</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">땀방울 원정대</span>
            <span>·</span>
            <span>2022 개정 초등 체육과 교육과정 연계 스마트 피지컬 컴퓨팅</span>
          </div>

          <div className="flex items-center gap-4 whitespace-nowrap shrink-0 font-bold">
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
