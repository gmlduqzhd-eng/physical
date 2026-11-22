import {FlowShell} from './presentation/FlowShell';
import {PlayErrorBoundary} from './components/PlayErrorBoundary';
import {ClassroomErrorBoundary} from './components/ClassroomErrorBoundary';
import {lazyWithRetry} from './application/lazyWithRetry';
import { cleanClassroomStorage } from './application/storageRetention';
import { Suspense, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { syncServerTime } from './application/timeSync';
import { ThemeProvider } from './application/ThemeContext';
import { KakaoInAppNotice } from './presentation/components/KakaoInAppNotice';
import { RouteTitle } from './presentation/components/RouteTitle';
import { BackgroundMusicProvider } from './application/BackgroundMusicContext';

// 교사 인증·구글 로그인 화면은 필요할 때만 받는다(Supabase·zod가 첫 화면 묶음에 들어가지 않게).
const TeacherAuthGuard = lazyWithRetry(() => import('./presentation/components/TeacherAuthGuard'), m => m.TeacherAuthGuard);
const GoogleTeacherCallback = lazyWithRetry(() => import('./presentation/components/GoogleTeacherCallback'), m => m.GoogleTeacherCallback);
// 수업 화면(입장·점수판·모둠 폰·리모컨·관리)은 한 번 못 받아도 '다시 시도'로 새로 받는다.
const ScoreBoard = lazyWithRetry(() => import('./presentation/ScoreBoard'), m => m.ScoreBoard);
const MobileMissionView = lazyWithRetry(() => import('./presentation/MobileMissionView'), m => m.MobileMissionView);
const AdminControlPanel = lazyWithRetry(() => import('./presentation/AdminControlPanel'), m => m.AdminControlPanel);
const Lobby = lazyWithRetry(() => import('./presentation/Lobby'), m => m.Lobby);
const Manual = lazyWithRetry(() => import('./presentation/Manual'), m => m.Manual);
const KioskRelayView = lazyWithRetry(() => import('./presentation/KioskRelayView'), m => m.KioskRelayView);
const QuickJoin = lazyWithRetry(() => import('./presentation/QuickJoin'), m => m.QuickJoin);
const BoardEntry = lazyWithRetry(() => import('./presentation/BoardEntry'), m => m.BoardEntry);
const IntroLandingPage = lazyWithRetry(() => import('./presentation/IntroLandingPage'), m => m.IntroLandingPage);
const GameHub = lazyWithRetry(() => import('./presentation/GameHub'), m => m.GameHub);
// 놀이 화면 파일을 한 번 못 받아도, 다른 놀이를 열거나 '다시 열기'를 누르면 새로 받는다.
const GamePlayPage = lazyWithRetry(() => import('./presentation/GamePlayPage'), m => m.GamePlayPage);
const TeacherRemote = lazyWithRetry(() => import('./presentation/TeacherRemote'), m => m.TeacherRemote);
const TeacherStudioEntry = lazyWithRetry(() => import('./presentation/TeacherStudioEntry'), m => m.TeacherStudioEntry);
const PrivacyPage = lazyWithRetry(() => import('./presentation/PrivacyPage'), m => m.PrivacyPage);
const UnifiedHomePage = lazyWithRetry(() => import('./presentation/UnifiedHomePage'), m => m.UnifiedHomePage);
const ActivityLibrary = lazyWithRetry(() => import('./presentation/ActivityLibrary'), m => m.ActivityLibrary);
const PlayerRecords = lazyWithRetry(() => import('./presentation/PlayerRecords'), m => m.PlayerRecords);
const FlagshipCollection=lazyWithRetry(() => import('./presentation/flagship/FlagshipCollection'), m => m.FlagshipCollection);
const TeacherMembers=lazyWithRetry(() => import('./presentation/TeacherMembers'), m => m.TeacherMembers);
const ChecksPage = lazyWithRetry(() => import('./presentation/ChecksPage'), m => m.ChecksPage);
const ClassroomOperations = lazyWithRetry(() => import('./presentation/ClassroomOperations'), m => m.ClassroomOperations);
const TeacherHome = lazyWithRetry(() => import('./presentation/TeacherHome'), m => m.TeacherHome);
const ClassroomSetup = lazyWithRetry(() => import('./presentation/GuidedClassroom'), m => m.ClassroomSetup);
const GuidedClassroom = lazyWithRetry(() => import('./presentation/GuidedClassroom'), m => m.GuidedClassroom);
const DemoLesson = lazyWithRetry(() => import('./presentation/DemoLesson'), m => m.DemoLesson);
const PlayExperiencePage = lazyWithRetry(() => import('./presentation/PlayExperiencePage'), m => m.PlayExperiencePage);
const SharedScreenLesson = lazyWithRetry(() => import('./presentation/SharedScreenLesson'), m => m.SharedScreenLesson);
const SportsClassroom = lazyWithRetry(() => import('./presentation/SportsClassroom'), m => m.SportsClassroom);
const ClassTools = lazyWithRetry(() => import('./presentation/ClassTools'), m => m.ClassTools);
const ClassProgressPage = lazyWithRetry(() => import('./presentation/ClassProgressPage'), m => m.ClassProgressPage);
const FunRemotePage = lazyWithRetry(() => import('./presentation/FunRemotePage'), m => m.FunRemotePage);
const SafetyClassroom = lazyWithRetry(() => import('./presentation/SafetyClassroom'), m => m.SafetyClassroom);
const CrowdSafetyLesson = lazyWithRetry(() => import('./presentation/SafetyClassroom'), m => m.CrowdSafetyLesson);
const ClassJourney = lazyWithRetry(() => import('./presentation/ClassJourney'), m => m.ClassJourney);
const SportDeepDive = lazyWithRetry(() => import('./presentation/SportDeepDive'), m => m.SportDeepDive);
const AngleLab = lazyWithRetry(() => import('./presentation/AngleLab'), m => m.AngleLab);
const MoreApps = lazyWithRetry(() => import('./presentation/MoreApps'), m => m.MoreApps);
const TodayLesson = lazyWithRetry(() => import('./presentation/TodayLesson'), m => m.TodayLesson);
const TeacherGuidePage = lazyWithRetry(() => import('./presentation/TeacherGuidePage'), m => m.TeacherGuidePage);
const SignatureCardsPrint = lazyWithRetry(() => import('./presentation/SignatureCardsPrint'), m => m.SignatureCardsPrint);
const loadTodayLessonBar=()=>import('./presentation/components/TodayLessonBar');
const TodayLessonBar = lazyWithRetry(loadTodayLessonBar, m => m.TodayLessonBar);
/** 활동 화면(/play/…)과 활동 목록(/hub, /games)에서만 단계 막대를 그린다. '오늘 수업' 화면에서 미리 불러 두어 활동 화면에서 바로 뜬다. */
function TodayBarGate(){
  const {pathname}=useLocation();
  const shown=pathname.startsWith('/play/')||pathname==='/hub'||pathname.startsWith('/hub/')||pathname==='/games';
  useEffect(()=>{if(shown||pathname.startsWith('/today'))void loadTodayLessonBar().catch(()=>{});},[shown,pathname]);
  return shown?<Suspense fallback={null}><TodayLessonBar /></Suspense>:null;
}
const PrintCards = lazyWithRetry(() => import('./presentation/PrintCards'), m => m.PrintCards);
const SportLesson = lazyWithRetry(() => import('./presentation/SportsClassroom'), m => m.SportLesson);
const LessonRecipes = lazyWithRetry(() => import('./presentation/LessonRecipes'), m => m.LessonRecipes);

/** 화면 파일을 받는 동안 보이는 자리. 밝은 화면에서 검은 화면이 번쩍이지 않게 지금 테마의 바탕색을 쓴다. */
function RouteLoading() {
  return <div role="status" aria-live="polite" className="min-h-[100dvh] flex items-center justify-center text-base font-bold" style={{ background: 'var(--ui-bg, var(--forest-bg, #faf8f2))', color: 'var(--ui-muted, var(--forest-muted, #5d675f))', fontSize: 'var(--ui-text-3, 18px)' }}>화면을 불러오는 중…</div>;
}

/** 주소가 바뀐 화면: 붙어 있던 ?값과 #자리표를 그대로 들고 새 주소로 간다. */
function MovedTo({ to, set }: { to: string; set?: Record<string, string> }) {
  const { search, hash } = useLocation();
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(set ?? {})) params.set(key, value);
  const query = params.toString();
  return <Navigate to={`${to}${query ? `?${query}` : ''}${hash}`} replace />;
}

function RouteScrollReset() {
  const { pathname } = useLocation();
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

function App() {
  useEffect(() => {
    cleanClassroomStorage();
    syncServerTime();
  }, []);

  // Supabase 미설정 시 — 게임 허브와 독립 플레이는 여전히 작동
  const hasSupabase = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  return (
    <ThemeProvider>
    <BrowserRouter>
      <RouteScrollReset />
      <RouteTitle />
      <BackgroundMusicProvider>
      <KakaoInAppNotice />
      <Suspense fallback={<RouteLoading />}>
      <Routes>
        {/* 소개·역할 선택·활동 탐색을 한 메인 화면에서 시작 */}
        <Route path="/" element={<UnifiedHomePage />} />
        <Route path="/start" element={<UnifiedHomePage />} />
        <Route path="/expeditions" element={<FlagshipCollection/>} />
        <Route path="/try" element={<PlayExperiencePage/>} />
        <Route path="/try/:kind" element={<PlayExperiencePage/>} />
        <Route path="/together" element={<SharedScreenLesson/>} />
        <Route path="/lessons" element={<LessonRecipes/>} />
        <Route path="/sports" element={<SportsClassroom/>} />
        <Route path="/sports/:sportId" element={<SportLesson/>} />
        <Route path="/sports/:sportId/deep" element={<SportDeepDive/>} />
        <Route path="/lab/angle" element={<AngleLab/>} />
        <Route path="/more" element={<MoreApps/>} />
        <Route path="/tools" element={<ClassTools/>} />
        <Route path="/class-progress" element={<ClassProgressPage/>} />
        <Route path="/fun-remote" element={<FunRemotePage/>} />
        <Route path="/print" element={<PrintCards/>} />
        <Route path="/print/signature-cards" element={<SignatureCardsPrint/>} />
        <Route path="/today" element={<TodayLesson/>} />
        <Route path="/guide" element={<TeacherGuidePage/>} />
        {/* 수업 전 확인은 한 화면(/checks)의 세 갈래다. 예전 주소는 맞는 갈래로 이어 준다. */}
        <Route path="/checks" element={<ChecksPage/>} />
        <Route path="/sound-check" element={<MovedTo to="/checks" set={{tab:'sound'}}/>} />
        <Route path="/display-check" element={<MovedTo to="/checks" set={{tab:'display'}}/>} />
        <Route path="/safety" element={<SafetyClassroom/>} />
        <Route path="/journey" element={<ClassJourney/>} />
        <Route path="/safety/crowd" element={<CrowdSafetyLesson/>} />
        <Route path="/hub" element={<ActivityLibrary />} />
        {/* 기록·즐겨찾기·뽑기 모음. 수업 도구(/tools)와 헷갈리지 않게 주소를 바꿨다(예전 주소는 이어 준다). */}
        <Route path="/hub/extras" element={<GameHub />} />
        <Route path="/hub/tools" element={<MovedTo to="/hub/extras"/>} />
        <Route path="/about" element={<IntroLandingPage />} />
        <Route path="/teacher" element={<TeacherHome />} />
        <Route path="/teacher/google-callback" element={<FlowShell><GoogleTeacherCallback endpoint="teacher"/></FlowShell>} />
        <Route path="/teacher/members" element={hasSupabase?<TeacherAuthGuard><TeacherMembers/></TeacherAuthGuard>:<SupabaseRequired/>} />
        <Route path="/teacher/account-confirmed" element={<Navigate to="/teacher/manage" replace/>} />
        <Route path="/teacher/manage" element={hasSupabase ? <TeacherAuthGuard><ClassroomOperations /></TeacherAuthGuard> : <SupabaseRequired />} />
        <Route path="/teacher/setup" element={hasSupabase ? <TeacherAuthGuard><ClassroomSetup /></TeacherAuthGuard> : <SupabaseRequired />} />
        <Route path="/teacher/room/:roomId" element={hasSupabase ? <TeacherAuthGuard><GuidedClassroom /></TeacherAuthGuard> : <SupabaseRequired />} />
        <Route path="/demo" element={<DemoLesson />} />
        <Route path="/teacher-ai" element={<TeacherStudioEntry />} />
        <Route path="/device-check" element={<MovedTo to="/checks" set={{tab:'device'}}/>} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/games" element={<ActivityLibrary />} />
        <Route path="/solo" element={<ActivityLibrary key="solo" solo />} />
        <Route path="/records" element={<PlayerRecords />} />
        <Route path="/solo/play/:gameType" element={<PlayErrorBoundary><GamePlayPage /></PlayErrorBoundary>} />
        <Route path="/play/:gameType" element={<PlayErrorBoundary><GamePlayPage /></PlayErrorBoundary>} />

        {/* 교사 관리 & 수업용 (Supabase 필요 & 교사 PIN 인증) */}
        <Route path="/lobby" element={hasSupabase ? <Lobby /> : <SupabaseRequired />} />
        <Route path="/join" element={hasSupabase ? <QuickJoin /> : <SupabaseRequired />} />
        <Route path="/manual" element={<Manual />} />
        <Route path="/board" element={hasSupabase ? <BoardEntry /> : <SupabaseRequired />} />
        <Route path="/board/:roomId" element={hasSupabase ? <ClassroomErrorBoundary back="/board" backLabel="TV 점수판 연결" title="점수판을 못 열었어요"><ScoreBoard /></ClassroomErrorBoundary> : <SupabaseRequired />} />
        <Route path="/mobile/:roomId/:groupId" element={hasSupabase ? <ClassroomErrorBoundary back="/lobby" backLabel="학생 입장" title="모둠 화면을 못 열었어요"><MobileMissionView /></ClassroomErrorBoundary> : <SupabaseRequired />} />
        <Route path="/admin" element={hasSupabase ? <ClassroomErrorBoundary back="/teacher" backLabel="수업 준비" title="관리 화면을 못 열었어요"><TeacherAuthGuard><AdminControlPanel /></TeacherAuthGuard></ClassroomErrorBoundary> : <SupabaseRequired />} />
        <Route path="/remote" element={hasSupabase ? <ClassroomErrorBoundary back="/teacher" backLabel="수업 준비" title="리모컨을 못 열었어요"><TeacherAuthGuard><TeacherRemote /></TeacherAuthGuard></ClassroomErrorBoundary> : <SupabaseRequired />} />
        <Route path="/remote/:roomId" element={hasSupabase ? <ClassroomErrorBoundary back="/teacher" backLabel="수업 준비" title="리모컨을 못 열었어요"><TeacherAuthGuard><TeacherRemote /></TeacherAuthGuard></ClassroomErrorBoundary> : <SupabaseRequired />} />
        <Route path="/kiosk" element={hasSupabase ? <ClassroomErrorBoundary back="/teacher" backLabel="수업 준비" title="공용 패드 화면을 못 열었어요"><TeacherAuthGuard><KioskRelayView /></TeacherAuthGuard></ClassroomErrorBoundary> : <SupabaseRequired />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      {/* '오늘 수업' 단계 막대·처음 안내: 활동 화면 위에 겹쳐 띄운다 */}
      <TodayBarGate />
      </BackgroundMusicProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

const SupabaseRequired = () => (
  <div className="min-h-screen bg-[var(--ui-bg,var(--forest-bg,#faf8f2))] text-[var(--ui-ink,var(--forest-ink,#303d35))] flex flex-col items-center justify-center p-8 font-sans">
    <h1 className="text-[28px] font-black mb-4">수업 연결을 준비하고 있습니다</h1>
    <p className="text-lg mb-6 text-center">
      지금은 실시간 수업에 연결할 수 없습니다.<br/>
      잠시 후 다시 시도해 주세요. 개인 게임은 바로 이용할 수 있습니다.
    </p>
    <a href="/hub" className="inline-flex items-center justify-center min-h-[64px] px-8 rounded-full text-[22px] font-bold no-underline bg-[var(--ui-action,var(--forest-action,#566d4d))] text-[var(--ui-on-action,var(--forest-on,#ffffff))]">활동 고르기 열기</a>
  </div>
);

const NotFound = () => (
  <div className="min-h-[100dvh] bg-[var(--ui-bg,var(--forest-bg,#faf8f2))] text-[var(--ui-ink,var(--forest-ink,#303d35))] flex flex-col items-center justify-center gap-4 p-6 text-center font-sans">
    <div className="text-6xl" aria-hidden="true">🧭</div>
    <h1 className="text-[28px] font-black">페이지를 찾을 수 없어요</h1>
    <p className="text-lg">주소를 다시 확인하거나 활동 고르기로 돌아가 주세요.</p>
    <a href="/hub" className="inline-flex items-center justify-center min-h-[64px] px-8 rounded-full text-[22px] font-bold no-underline bg-[var(--ui-action,var(--forest-action,#566d4d))] text-[var(--ui-on-action,var(--forest-on,#ffffff))]">
      활동 고르기로 이동
    </a>
  </div>
);

export default App;
