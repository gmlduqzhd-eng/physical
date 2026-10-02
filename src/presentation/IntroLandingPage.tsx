import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Play,
  Users,
  Smartphone,
  Award,
  BookOpen,
  ArrowRight,
  ChevronRight,
  Flame,
  Zap,
  Star,
  Sun,
  Moon,
  HelpCircle,
  Activity,
  Tv,
  FileSpreadsheet,
  QrCode,
  ChevronDown
} from 'lucide-react';
import { useTheme } from '../application/ThemeContext';
import { sfxTap, sfxCoin, sfxSuccess } from '../application/soundEffects';

export const IntroLandingPage = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  // 인터랙티브 롤 스위처 ('teacher' | 'student')
  const [activeRole, setActiveRole] = useState<'teacher' | 'student'>('teacher');

  // 교육과정 3대 영역 탭 ('exercise' | 'sport' | 'expression')
  const [curriculumTab, setCurriculumTab] = useState<'exercise' | 'sport' | 'expression'>('exercise');

  // FAQ 아코디언 상태
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // 미니 액션 시뮬레이터 (히어로 섹션 라이브 체험)
  const [simSteps, setSimSteps] = useState(0);
  const [simScore, setSimScore] = useState(0);
  const [simFeedback, setSimFeedback] = useState<string | null>(null);

  const handleSimTap = () => {
    sfxTap();
    const nextSteps = simSteps + 1;
    const nextScore = simScore + 15;
    setSimSteps(nextSteps);
    setSimScore(nextScore);

    if (nextSteps % 5 === 0) {
      sfxCoin();
      setSimFeedback('🔥 콤보 달성! +50 보너스');
      setSimScore(s => s + 50);
      setTimeout(() => setSimFeedback(null), 1000);
    }
  };

  // 대표 추천 게임 6선
  const FEATURED_GAMES = [
    {
      id: 'jump',
      name: '순발력 점프왕',
      category: '운동',
      emoji: '🦘',
      badge: '초등 3~6학년',
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
      badge: '표적/투사',
      code: '[4체02-05]',
      desc: '손목 스냅의 힘을 정밀 조절해 하우스 중앙(버튼)에 스톤 안착',
      gradient: 'from-emerald-500 to-teal-600',
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
      id: 'wind-surf-balance',
      name: '바람을 타는 윈드서핑',
      category: '스포츠',
      emoji: '🏄',
      badge: '생태/자이로',
      code: '[6체02-09]',
      desc: '돌풍의 방향을 읽고 스마트폰을 기울여 수평을 유지하는 서핑',
      gradient: 'from-sky-500 to-cyan-600',
    },
  ];

  // 자주 묻는 질문 데이터
  const FAQS = [
    {
      q: '별도의 앱(App) 설치나 학생 계정 가입이 필요한가요?',
      a: '전혀 필요 없습니다! 크롬, 사파리, 웨일 등 웹 브라우저에서 URL 접속만으로 1초 만에 실행됩니다. 학생들은 복잡한 회원가입 없이 교사가 발급한 4자리 PIN 코드나 QR코드로 즉시 참여합니다.',
    },
    {
      q: '스마트폰 센서(자이로/가속도)는 어떻게 작동하나요?',
      a: '웹 표준 DeviceMotion 및 DeviceOrientation API를 활용하여 스마트폰의 상하 흔들림, 회전, 기울기, 점프 충격량을 브라우저 자체에서 실시간 연산합니다. 별도의 센서 장비나 추가 하드웨어가 전혀 필요하지 않습니다.',
    },
    {
      q: '비가 오거나 미세먼지가 심한 날 교실 체육으로도 적합한가요?',
      a: '네, 적극 추천합니다! 넓은 운동장이 없어도 교실 책상 사이 공간이나 제자리에서 안전하게 온몸을 움직일 수 있는 게임들로 구성되어 있어 악천후 시 실내 체육 수업으로 최적입니다.',
    },
    {
      q: 'NEIS 학교생활기록부 체육과 세특(세부능력 및 특기사항)은 어떻게 생성되나요?',
      a: '수업 종료 후 모둠 및 학생별 참여도, 활동 영역(운동·스포츠·표현), 누적 성취기준을 기반으로 2022 개정 체육과 성취기준에 부합하는 정형화된 세특 평가 문구가 원클릭으로 자동 작성됩니다. 교사는 복사하여 NEIS에 바로 입력할 수 있습니다.',
    },
    {
      q: '학급 인원이 20~30명인데 모둠 대항전이 원활한가요?',
      a: '물론입니다. 1개 모둠부터 최대 8개 모둠까지 유연하게 설정 가능하며, 모둠원 전체의 점수가 실시간 합산되어 교실 앞 대형 TV/전자칠판 전광판에 라이브로 중계됩니다.',
    },
  ];

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* 🌟 1. 상단 글로벌 네비게이션 헤더 */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${isDark ? 'bg-slate-950/85 border-slate-800' : 'bg-white/85 border-slate-200 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* 로고 */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-cyan-500/20">
              💦
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                땀방울 원정대
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                2022 개정 체육
              </span>
            </div>
          </div>

          {/* 중앙 네비게이션 링크 (데스크톱) */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-bold">
            <a href="#features" className={`transition-colors ${isDark ? 'text-slate-300 hover:text-cyan-400' : 'text-slate-600 hover:text-cyan-600'}`}>
              플랫폼 소개
            </a>
            <a href="#curriculum" className={`transition-colors ${isDark ? 'text-slate-300 hover:text-cyan-400' : 'text-slate-600 hover:text-cyan-600'}`}>
              교육과정 연계
            </a>
            <a href="#minigames" className={`transition-colors ${isDark ? 'text-slate-300 hover:text-cyan-400' : 'text-slate-600 hover:text-cyan-600'}`}>
              추천 게임
            </a>
            <a href="#faq" className={`transition-colors ${isDark ? 'text-slate-300 hover:text-cyan-400' : 'text-slate-600 hover:text-cyan-600'}`}>
              자주 묻는 질문
            </a>
          </nav>

          {/* 우측 액션 버튼들 */}
          <div className="flex items-center gap-2.5">
            {/* 다크/라이트 모드 토글 */}
            <button
              onClick={toggleTheme}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-yellow-400 hover:bg-slate-800' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'}`}
              title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* 교사용 수업방 바로가기 */}
            <button
              onClick={() => navigate('/lobby')}
              className={`hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'}`}
            >
              <Users className="w-3.5 h-3.5 text-cyan-500" />
              수업 개설
            </button>

            {/* 핵심 CTA: 게임하기 (메인 허브 이동) */}
            <button
              onClick={() => {
                sfxSuccess();
                navigate('/hub');
              }}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              게임하기
            </button>
          </div>
        </div>
      </header>

      {/* 🚀 2. 히어로 섹션 (Hero Section) */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        {/* 배경 은은한 그라디언트 블러 오라 */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* 좌측 텍스트 & CTA 헤드라인 */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              
              {/* 상단 태그 뱃지 */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs sm:text-sm font-bold shadow-sm">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>2022 개정 체육과 교육과정 연계 스마트 피지컬 컴퓨팅</span>
              </div>

              {/* 메인 타이틀 */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.18] break-keep">
                스마트폰 하나로,<br />
                교실이 <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">신나는 체육 경기장</span>으로!
              </h1>

              {/* 상세 설명 */}
              <p className={`text-base sm:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0 break-keep font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                별도의 센서 장비 없이 스마트폰의 자이로·가속도 모션 센서만으로 즐기는 초·중등 디지털 체육 플랫폼입니다.
                <strong> 50여 종의 신체활동 미니게임</strong>, <strong>실시간 모둠 전광판</strong>, <strong>교사 스마트 리모컨</strong>, 그리고 <strong>NEIS 생기부 세특 자동 생성</strong>까지 원스톱으로 지원합니다.
              </p>

              {/* 메인 액션 버튼 모음 */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
                <button
                  id="hero-play-btn"
                  onClick={() => {
                    sfxSuccess();
                    navigate('/hub');
                  }}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                >
                  <Play className="w-5 h-5 fill-white" />
                  지금 게임하기 (체육관 입장)
                  <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  onClick={() => navigate('/lobby')}
                  className={`w-full sm:w-auto px-6 py-4 rounded-2xl font-bold text-base border transition-all flex items-center justify-center gap-2 ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 hover:border-cyan-500 text-slate-200 hover:text-white'
                      : 'bg-white border-slate-300 hover:border-cyan-500 text-slate-700 hover:text-slate-900 shadow-sm'
                  }`}
                >
                  <Users className="w-5 h-5 text-cyan-500" />
                  선생님 수업방 개설
                </button>

                <button
                  onClick={() => navigate('/join')}
                  className={`w-full sm:w-auto px-5 py-4 rounded-2xl font-bold text-base border transition-all flex items-center justify-center gap-2 ${
                    isDark
                      ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-purple-400" />
                  학생 PIN 입장
                </button>
              </div>

              {/* 핵심 지표 뱃지 4선 */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                {[
                  { label: '미니게임 라인업', val: '50+ 종', icon: '🎮' },
                  { label: '교육과정 핵심영역', val: '3대 영역', icon: '🏃' },
                  { label: '앱 설치 소요시간', val: '0초 (Web)', icon: '⚡' },
                  { label: 'NEIS 세특 생성', val: '원클릭 자동', icon: '📝' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border transition-all ${
                      isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-sm'
                    }`}
                  >
                    <div className="text-xl mb-1">{item.icon}</div>
                    <div className="text-base font-black text-cyan-400">{item.val}</div>
                    <div className="text-[11px] font-medium text-slate-500">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 우측 인터랙티브 라이브 스마트폰 목업 (체험 위젯) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-sm">
                
                {/* 폰 외관 프레임 */}
                <div className={`p-4 rounded-[40px] border-4 shadow-2xl relative ${isDark ? 'bg-slate-900 border-slate-700/80 shadow-cyan-500/10' : 'bg-slate-800 border-slate-700 shadow-xl'}`}>
                  
                  {/* 상단 다이내믹 아일랜드 / 수화부 */}
                  <div className="w-28 h-4 bg-slate-950 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
                  </div>

                  {/* 폰 화면 내부 */}
                  <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 rounded-[28px] p-5 text-white overflow-hidden relative border border-slate-800 select-none">
                    
                    {/* 상단 인게임 스테이터스 */}
                    <div className="flex justify-between items-center mb-4 text-xs font-bold">
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Activity className="w-3 h-3 animate-spin" /> 센서 가동 중
                      </span>
                      <span className="text-amber-400 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 fill-amber-400" /> 모둠 1위 달리는 중!
                      </span>
                    </div>

                    {/* 인터랙티브 타겟 박스 */}
                    <div className="text-center py-6">
                      <div className="text-6xl mb-3 animate-bounce">🏃‍♂️</div>
                      <h3 className="text-xl font-black text-white mb-1">제자리 달리기 모션 체험</h3>
                      <p className="text-xs text-slate-400 mb-4">화면을 탭하거나 마우스를 클릭해 점수를 올려보세요!</p>

                      {/* 탭 인터랙션 버튼 */}
                      <button
                        onClick={handleSimTap}
                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Zap className="w-5 h-5 fill-white" />
                        탭해서 스텝 밟기! ({simSteps}보)
                      </button>

                      {/* 피드백 말풍선 */}
                      {simFeedback && (
                        <div className="mt-2 text-xs font-black text-yellow-300 animate-pulse">
                          {simFeedback}
                        </div>
                      )}
                    </div>

                    {/* 점수 & 센서 게이지 */}
                    <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">실시간 획득 점수</div>
                        <div className="text-2xl font-black text-cyan-300">+{simScore.toLocaleString()}점</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-bold">가속도 감도 (G-Force)</div>
                        <div className="text-sm font-black text-emerald-400">정상 (12.4 m/s²)</div>
                      </div>
                    </div>
                  </div>

                  {/* 하단 폰 홈 인디케이터 바 */}
                  <div className="w-32 h-1 bg-slate-600 rounded-full mx-auto mt-4"></div>
                </div>

                {/* 플로팅 배너 장식 */}
                <div className="absolute -bottom-6 -left-6 bg-slate-900 border border-slate-700/80 rounded-2xl p-3 shadow-xl flex items-center gap-3 backdrop-blur-md hidden sm:flex">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-xl">
                    🏆
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">모둠 전광판 실시간 동기화</div>
                    <div className="text-[10px] text-slate-400">교실 앞 대형 TV 딜레이 0.05초</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 🎯 3. 역할별 맞춤 기능 (선생님 vs 학생 인터랙티브 탭) */}
      <section id="features" className={`py-16 md:py-24 border-y transition-colors ${isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-100/70 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs sm:text-sm font-bold tracking-widest text-cyan-400 uppercase mb-2">
              DESIGNED FOR EDUCATION
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight mb-4 break-keep">
              선생님에게는 가장 편리한 수업 도구,<br />
              학생들에게는 가장 몰입도 높은 놀이터
            </h3>
            <p className={`text-sm sm:text-base break-keep ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              체육 수업을 혁신하는 스마트 지원 기능을 확인해보세요.
            </p>

            {/* 역할 선택 탭 버튼 */}
            <div className="inline-flex p-1.5 rounded-2xl bg-slate-800/80 border border-slate-700 mt-6 shadow-md">
              <button
                onClick={() => setActiveRole('teacher')}
                className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
                  activeRole === 'teacher'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                선생님을 위한 특별한 기능
              </button>
              <button
                onClick={() => setActiveRole('student')}
                className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
                  activeRole === 'student'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                학생들을 위한 신나는 경험
              </button>
            </div>
          </div>

          {/* 선생님 탭 컨텐츠 */}
          {activeRole === 'teacher' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: <QrCode className="w-6 h-6 text-cyan-400" />,
                  title: '1초 만에 수업 개설 & QR 공유',
                  desc: '복잡한 회원가입 없이 클릭 한 번으로 학급 방을 개설하고 4자리 PIN 코드 및 QR코드로 학생들을 즉시 입장시킵니다.',
                  tag: '간편한 시작',
                },
                {
                  icon: <Tv className="w-6 h-6 text-blue-400" />,
                  title: '실시간 대형 TV 전광판',
                  desc: '교실 앞 전자칠판이나 TV에 실시간 모둠 순위판을 띄워, 학생들의 움직임과 득점을 흥미진진한 라이브 중계로 연출합니다.',
                  tag: '몰입감 극대화',
                },
                {
                  icon: <Zap className="w-6 h-6 text-amber-400" />,
                  title: '교사용 무선 스마트 리모컨',
                  desc: '수업 중 걸어다니며 스마트폰으로 피버타임(점수 2배), 언더독 역전 보너스, 호루라기 정지 등을 원격 제어합니다.',
                  tag: '스마트 통제',
                },
                {
                  icon: <FileSpreadsheet className="w-6 h-6 text-emerald-400" />,
                  title: 'NEIS 세특 자동 생성 & CSV',
                  desc: '경기 참여 데이터와 성취기준을 분석하여 학교생활기록부 체육과 세부능력 및 특기사항 문구를 자동 완성하고 CSV로 내보냅니다.',
                  tag: '업무 경감',
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className={`p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    isDark ? 'bg-slate-900/70 border-slate-800 hover:border-cyan-500/50' : 'bg-white border-slate-200 hover:border-cyan-500 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center">
                      {card.icon}
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {card.tag}
                    </span>
                  </div>
                  <h4 className="text-lg font-black mb-2">{card.title}</h4>
                  <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 학생 탭 컨텐츠 */}
          {activeRole === 'student' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: <Flame className="w-6 h-6 text-rose-400" />,
                  title: '온몸으로 조작하는 피지컬 액션',
                  desc: '단순한 손가락 터치를 넘어 점프, 스쿼트, 제자리 달리기, 에어 펀치, 서핑 균형 잡기 등 온몸을 역동적으로 움직입니다.',
                  tag: '체력 증진',
                },
                {
                  icon: <Users className="w-6 h-6 text-purple-400" />,
                  title: '우리 모둠과 함께하는 협동 배틀',
                  desc: '내가 흘린 땀방울이 모둠의 점수로 쌓이고, 친구들과 함께 전략을 짜며 자연스럽게 배려와 협동심을 기릅니다.',
                  tag: '팀워크/인성',
                },
                {
                  icon: <Award className="w-6 h-6 text-amber-400" />,
                  title: '6대 성취 뱃지 & 성장 다마고치',
                  desc: '플레이할수록 누적되는 성취 뱃지와 레벨업 다마고치 캐릭터를 통해 운동을 습관화하고 성취감을 만끽합니다.',
                  tag: '동기 부여',
                },
                {
                  icon: <Star className="w-6 h-6 text-yellow-400" />,
                  title: '나만의 MVP 포토카드 발급',
                  desc: '경기 종료 후 오늘의 최고 기록과 나만의 닉네임이 새겨진 캔버스 포토카드를 스마트폰 갤러리에 저장할 수 있습니다.',
                  tag: '기념 소장',
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className={`p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    isDark ? 'bg-slate-900/70 border-slate-800 hover:border-purple-500/50' : 'bg-white border-slate-200 hover:border-purple-500 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center">
                      {card.icon}
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {card.tag}
                    </span>
                  </div>
                  <h4 className="text-lg font-black mb-2">{card.title}</h4>
                  <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 하단 퀵 액션 배너 */}
          <div className="mt-10 p-6 rounded-3xl bg-gradient-to-r from-blue-900/40 via-cyan-900/30 to-purple-900/40 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">📖</div>
              <div>
                <h4 className="font-black text-base text-white">수업 지도안이 고민이신가요?</h4>
                <p className="text-xs text-slate-300">2022 개정 체육과 교육과정에 맞춘 원클릭 교수학습 지도안 생성기를 무료로 이용해보세요.</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/manual?tab=lesson')}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black shrink-0 transition-all shadow-md flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" /> 수업 지도안 생성기 바로가기
            </button>
          </div>

        </div>
      </section>

      {/* 📚 4. 2022 개정 체육과 3대 핵심 영역 (Curriculum Section) */}
      <section id="curriculum" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs sm:text-sm font-bold tracking-widest text-emerald-400 uppercase mb-2">
              CURRICULUM MAPPING
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight mb-4 break-keep">
              2022 개정 초등 체육과 3대 핵심 영역 완벽 연계
            </h3>
            <p className={`text-sm sm:text-base break-keep ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              국가 교육과정 성취기준을 기반으로 세분화된 맞춤형 신체활동 미니게임을 제공합니다.
            </p>

            {/* 3대 영역 탭 */}
            <div className="flex justify-center gap-2 mt-6">
              {[
                { id: 'exercise', name: '🏃 운동 영역 (체력·자세)', color: 'border-emerald-500 text-emerald-400' },
                { id: 'sport', name: '⚽ 스포츠 영역 (기술·전술)', color: 'border-blue-500 text-blue-400' },
                { id: 'expression', name: '💃 표현 영역 (움직임·리듬)', color: 'border-purple-500 text-purple-400' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setCurriculumTab(t.id as any)}
                  className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black border transition-all ${
                    curriculumTab === t.id
                      ? `bg-slate-800 shadow-md ${t.color}`
                      : `${isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200' : 'bg-white border-slate-300 text-slate-600'}`
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* 영역별 세부 카드 */}
          <div className={`p-8 rounded-3xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-lg'}`}>
            {curriculumTab === 'exercise' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                  <div>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      신체활동 역량 : 건강 관리 능력
                    </span>
                    <h4 className="text-xl font-black mt-2">🏃 운동 영역 (Health & Physical Fitness)</h4>
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    주요 성취기준: <span className="text-emerald-400">[4체01-02]</span> <span className="text-emerald-400">[6체01-02]</span> <span className="text-emerald-400">[6체01-05]</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { name: '점프왕!', code: '[4체01-02]', desc: '순발력 체력운동 / 수직 점프 감지', emoji: '🦘', id: 'jump' },
                    { name: '스쿼트 챌린지', code: '[6체01-02]', desc: '근력·근지구력 운동 / 무릎 각도 판정', emoji: '🏋️', id: 'squat' },
                    { name: '제자리 달리기', code: '[4체01-02]', desc: '심폐지구력 달리기 / 스텝 보폭 감지', emoji: '🏃', id: 'run' },
                    { name: '플랭크 챌린지', code: '[6체01-05]', desc: '코어 근력 버티기 / 정적 유지력', emoji: '💪', id: 'plank' },
                  ].map(g => (
                    <div key={g.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="text-3xl mb-2">{g.emoji}</div>
                        <h5 className="font-black text-white text-base">{g.name}</h5>
                        <span className="text-[10px] text-emerald-400 font-bold">{g.code}</span>
                        <p className="text-xs text-slate-400 mt-1">{g.desc}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/play/${g.id}`)}
                        className="mt-4 w-full py-2 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                      >
                        체험하기 <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {curriculumTab === 'sport' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                  <div>
                    <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                      신체활동 역량 : 경기 수행 및 협동 능력
                    </span>
                    <h4 className="text-xl font-black mt-2">⚽ 스포츠 영역 (Sports & Games)</h4>
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    주요 성취기준: <span className="text-blue-400">[4체02-05]</span> <span className="text-blue-400">[6체02-05]</span> <span className="text-blue-400">[6체02-09]</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { name: '공 굴림 컬링 원정', code: '[4체02-05]', desc: '표적 힘 조절 / 스냅 릴리즈', emoji: '🥌', id: 'rolling-curling' },
                    { name: '오프사이드 브레이커', code: '[6체02-05]', desc: '공간 침투 전술 / 온사이드 스루패스', emoji: '⚽', id: 'open-space-tactician' },
                    { name: '슬링샷 양궁 퍼펙트 텐', code: '[6체02-04]', desc: '전략형 투사체 표적 / 조준 탄성', emoji: '🎯', id: 'slingshot-archery' },
                    { name: '급류 탈출 카약', code: '[4체02-07]', desc: '생태형 수상 모험 / 좌우 교차 패들링', emoji: '🛶', id: 'kayak-paddle' },
                  ].map(g => (
                    <div key={g.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="text-3xl mb-2">{g.emoji}</div>
                        <h5 className="font-black text-white text-base">{g.name}</h5>
                        <span className="text-[10px] text-blue-400 font-bold">{g.code}</span>
                        <p className="text-xs text-slate-400 mt-1">{g.desc}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/play/${g.id}`)}
                        className="mt-4 w-full py-2 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                      >
                        체험하기 <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {curriculumTab === 'expression' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                  <div>
                    <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                      신체활동 역량 : 신체 표현 및 심미적 감성
                    </span>
                    <h4 className="text-xl font-black mt-2">💃 표현 영역 (Expression & Movement)</h4>
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    주요 성취기준: <span className="text-purple-400">[4체03-02]</span> <span className="text-purple-400">[4체03-04]</span> <span className="text-purple-400">[6체03-06]</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { name: '파트너 로봇 연구소', code: '[4체03-02]', desc: '신체 요소 창의 표현 / 대칭 동작', emoji: '🤖', id: 'partner-robot-lab' },
                    { name: '감정 온도계', code: '[4체03-04]', desc: '감정 신체 표현 / 표정과 몸짓', emoji: '🌡️', id: 'emotion-thermometer' },
                    { name: '드리블 박자 공장', code: '[4체02-03]', desc: '리듬 조작 움직임 / 템포 동기화', emoji: '🥁', id: 'dribble-rhythm' },
                    { name: '동물 체조', code: '[4체03-03]', desc: '사물·자연 모방 표현 / 점핑과 크롤링', emoji: '🐾', id: 'animal' },
                  ].map(g => (
                    <div key={g.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="text-3xl mb-2">{g.emoji}</div>
                        <h5 className="font-black text-white text-base">{g.name}</h5>
                        <span className="text-[10px] text-purple-400 font-bold">{g.code}</span>
                        <p className="text-xs text-slate-400 mt-1">{g.desc}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/play/${g.id}`)}
                        className="mt-4 w-full py-2 bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                      >
                        체험하기 <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* 🎮 5. 인기 대표 미니게임 6선 (클릭 시 즉시 체험) */}
      <section id="minigames" className={`py-16 md:py-24 border-y transition-colors ${isDark ? 'bg-slate-900/30 border-slate-800/80' : 'bg-slate-100/60 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="text-xs sm:text-sm font-bold tracking-widest text-cyan-400 uppercase mb-2">
                FEATURED MINIGAMES
              </h2>
              <h3 className="text-2xl sm:text-4xl font-black tracking-tight break-keep">
                가장 인기 있는 대표 미니게임
              </h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                아이들이 가장 열광하는 6가지 게임을 지금 바로 클릭해서 체험해보세요.
              </p>
            </div>

            <button
              onClick={() => {
                sfxSuccess();
                navigate('/hub');
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-md transition-all self-start md:self-auto"
            >
              전체 50+ 게임 목록 보기
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURED_GAMES.map((game) => (
              <div
                key={game.id}
                onClick={() => navigate(`/play/${game.id}`)}
                className={`group p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer relative overflow-hidden ${
                  isDark ? 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/50' : 'bg-white border-slate-200 hover:border-cyan-500 shadow-sm'
                }`}
              >
                {/* 상단 뱃지 & 아이콘 */}
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${game.gradient} flex items-center justify-center text-3xl shadow-lg transition-transform group-hover:scale-110`}>
                    {game.emoji}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700">
                      {game.badge}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">{game.code}</span>
                  </div>
                </div>

                <h4 className="text-xl font-black text-white group-hover:text-cyan-400 transition-colors mb-2">
                  {game.name}
                </h4>
                <p className={`text-xs sm:text-sm leading-relaxed mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {game.desc}
                </p>

                <div className="flex items-center text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
                  1초 만에 바로 플레이 <ChevronRight className="w-4 h-4 ml-0.5" />
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ⏱️ 6. 체육 수업 3단계 활용 흐름 (How to Run a Class) */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs sm:text-sm font-bold tracking-widest text-cyan-400 uppercase mb-2">
              SIMPLE & POWERFUL WORKFLOW
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight mb-4 break-keep">
              단 3단계로 완성되는 스마트 체육 수업
            </h3>
            <p className={`text-sm sm:text-base break-keep ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              선생님도 학생도 복잡한 준비 없이 바로 신나게 뛰어놀 수 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {[
              {
                step: '01',
                title: '수업방 개설 & QR 접속',
                desc: '교실 앞 TV에 방을 띄우고 학생들이 스마트폰 카메라로 QR코드를 비추면 끝! 별도 앱 설치나 가입 없이 5초 만에 전원 입장 완료.',
                icon: '📱',
                gradient: 'from-cyan-500 to-blue-500',
              },
              {
                step: '02',
                title: '모둠별 미션 & 전광판 대결',
                desc: '선생님이 리모컨으로 게임을 선택하면 전광판 카운트다운 시작! 모둠원들의 땀방울이 실시간으로 집계되며 교실 전체가 환호성으로 가득 찹니다.',
                icon: '🔥',
                gradient: 'from-amber-500 to-orange-500',
              },
              {
                step: '03',
                title: '쿨다운 & NEIS 세특 완성',
                desc: '스트레칭으로 몸을 이완하고, 자동으로 생성된 NEIS 체육과 세특 평가 문구와 경기 결과 CSV를 다운로드하여 수업을 완벽히 정리합니다.',
                icon: '📝',
                gradient: 'from-emerald-500 to-teal-500',
              },
            ].map((s, idx) => (
              <div
                key={idx}
                className={`p-8 rounded-3xl border relative transition-all duration-300 hover:shadow-xl ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="text-4xl mb-4">{s.icon}</div>
                <div className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${s.gradient} mb-2`}>
                  STEP {s.step}
                </div>
                <h4 className="text-xl font-black mb-3">{s.title}</h4>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ❓ 7. 자주 묻는 질문 (FAQ Accordion) */}
      <section id="faq" className={`py-16 md:py-24 border-t transition-colors ${isDark ? 'bg-slate-900/30 border-slate-800/80' : 'bg-slate-100/60 border-slate-200'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-12">
            <h2 className="text-xs sm:text-sm font-bold tracking-widest text-cyan-400 uppercase mb-2">
              FREQUENTLY ASKED QUESTIONS
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight break-keep">
              선생님들이 자주 물어보시는 질문
            </h3>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-5 text-left flex justify-between items-center gap-4 focus:outline-none"
                  >
                    <span className="font-black text-base sm:text-lg flex items-center gap-3">
                      <HelpCircle className="w-5 h-5 text-cyan-400 shrink-0" />
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-cyan-400' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className={`px-5 pb-5 pt-1 text-sm sm:text-base leading-relaxed border-t ${isDark ? 'text-slate-300 border-slate-800/80' : 'text-slate-600 border-slate-100'}`}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 🏁 8. 하단 대형 Call To Action (Final CTA) */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/40 via-blue-950/60 to-purple-950/40 pointer-events-none" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <div className="text-5xl animate-bounce">💦</div>
          <h3 className="text-3xl sm:text-5xl font-black tracking-tight text-white break-keep">
            지금 바로 아이들과 함께<br />
            신나는 땀방울을 흘려보세요!
          </h3>
          <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto break-keep">
            설치 없이 브라우저에서 바로 시작하는 미래형 체육 플랫폼, 땀방울 원정대.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                sfxSuccess();
                navigate('/hub');
              }}
              className="w-full sm:w-auto px-9 py-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 hover:from-cyan-300 hover:to-purple-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-white" />
              게임 시작하기 (전체 게임 허브)
            </button>

            <button
              onClick={() => navigate('/manual')}
              className="w-full sm:w-auto px-7 py-4 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-bold text-base rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <BookOpen className="w-5 h-5 text-cyan-400" />
              교사용 체육 매뉴얼 보기
            </button>
          </div>
        </div>
      </section>

      {/* 📄 9. 푸터 (Footer) */}
      <footer className={`py-10 border-t text-xs font-medium transition-colors ${isDark ? 'bg-slate-950 border-slate-900 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">💦</span>
            <span className="font-bold text-slate-400">땀방울 원정대 (Sweat Expedition)</span>
            <span>·</span>
            <span>2022 개정 초등 체육과 교육과정 연계 스마트 피지컬 컴퓨팅</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/manual')} className="hover:text-cyan-400 transition-colors">
              사용 설명서
            </button>
            <button onClick={() => navigate('/manual?tab=lesson')} className="hover:text-cyan-400 transition-colors">
              수업 지도안
            </button>
            <button onClick={() => navigate('/lobby')} className="hover:text-cyan-400 transition-colors">
              교사용 로비
            </button>
            <button onClick={() => navigate('/hub')} className="text-cyan-400 font-bold hover:underline">
              게임 허브
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
};
