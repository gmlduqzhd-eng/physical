import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { syncServerTime } from './application/timeSync';
import { ThemeProvider } from './application/ThemeContext';
import { KakaoInAppNotice } from './presentation/components/KakaoInAppNotice';
import { TeacherAuthGuard } from './presentation/components/TeacherAuthGuard';
import { BackgroundMusicProvider } from './application/BackgroundMusicContext';

const ScoreBoard = lazy(() => import('./presentation/ScoreBoard').then(m => ({ default: m.ScoreBoard })));
const MobileMissionView = lazy(() => import('./presentation/MobileMissionView').then(m => ({ default: m.MobileMissionView })));
const AdminControlPanel = lazy(() => import('./presentation/AdminControlPanel').then(m => ({ default: m.AdminControlPanel })));
const Lobby = lazy(() => import('./presentation/Lobby').then(m => ({ default: m.Lobby })));
const Manual = lazy(() => import('./presentation/Manual').then(m => ({ default: m.Manual })));
const KioskRelayView = lazy(() => import('./presentation/KioskRelayView').then(m => ({ default: m.KioskRelayView })));
const QuickJoin = lazy(() => import('./presentation/QuickJoin').then(m => ({ default: m.QuickJoin })));
const BoardEntry = lazy(() => import('./presentation/BoardEntry').then(m => ({ default: m.BoardEntry })));
const IntroLandingPage = lazy(() => import('./presentation/IntroLandingPage').then(m => ({ default: m.IntroLandingPage })));
const GameHub = lazy(() => import('./presentation/GameHub').then(m => ({ default: m.GameHub })));
const GamePlayPage = lazy(() => import('./presentation/GamePlayPage').then(m => ({ default: m.GamePlayPage })));
const TeacherRemote = lazy(() => import('./presentation/TeacherRemote').then(m => ({ default: m.TeacherRemote })));
const TeacherStudioEntry = lazy(() => import('./presentation/TeacherStudioEntry').then(m => ({ default: m.TeacherStudioEntry })));
const PrivacyPage = lazy(() => import('./presentation/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const RoleLandingPage = lazy(() => import('./presentation/RoleLandingPage').then(m => ({ default: m.RoleLandingPage })));
const ActivityLibrary = lazy(() => import('./presentation/ActivityLibrary').then(m => ({ default: m.ActivityLibrary })));
const TeacherHome = lazy(() => import('./presentation/TeacherHome').then(m => ({ default: m.TeacherHome })));
const ClassroomSetup = lazy(() => import('./presentation/GuidedClassroom').then(m => ({ default: m.ClassroomSetup })));
const GuidedClassroom = lazy(() => import('./presentation/GuidedClassroom').then(m => ({ default: m.GuidedClassroom })));
const DemoLesson = lazy(() => import('./presentation/DemoLesson').then(m => ({ default: m.DemoLesson })));

function App() {
  useEffect(() => {
    syncServerTime();
  }, []);

  // Supabase 미설정 시 — 게임 허브와 독립 플레이는 여전히 작동
  const hasSupabase = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  return (
    <ThemeProvider>
    <BrowserRouter>
      <BackgroundMusicProvider>
      <KakaoInAppNotice />
      <Suspense fallback={<div role="status" className="min-h-[100dvh] flex items-center justify-center bg-slate-950 text-white">화면을 불러오는 중…</div>}>
      <Routes>
        {/* 메인: 소개 페이지가 먼저 노출되고, '게임하기' 클릭 시 게임 허브(/hub)로 이동 */}
        <Route path="/" element={<RoleLandingPage />} />
        <Route path="/hub" element={<ActivityLibrary />} />
        <Route path="/hub/tools" element={<GameHub />} />
        <Route path="/about" element={<IntroLandingPage />} />
        <Route path="/teacher" element={<TeacherHome />} />
        <Route path="/teacher/setup" element={hasSupabase ? <TeacherAuthGuard><ClassroomSetup /></TeacherAuthGuard> : <SupabaseRequired />} />
        <Route path="/teacher/room/:roomId" element={hasSupabase ? <TeacherAuthGuard><GuidedClassroom /></TeacherAuthGuard> : <SupabaseRequired />} />
        <Route path="/demo" element={<DemoLesson />} />
        <Route path="/teacher-ai" element={<TeacherStudioEntry />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/games" element={<ActivityLibrary />} />
        <Route path="/play/:gameType" element={<GamePlayPage />} />

        {/* 교사 관리 & 수업용 (Supabase 필요 & 교사 PIN 인증) */}
        <Route path="/lobby" element={hasSupabase ? <Lobby /> : <SupabaseRequired />} />
        <Route path="/join" element={hasSupabase ? <QuickJoin /> : <SupabaseRequired />} />
        <Route path="/manual" element={<Manual />} />
        <Route path="/board" element={hasSupabase ? <BoardEntry /> : <SupabaseRequired />} />
        <Route path="/board/:roomId" element={hasSupabase ? <ScoreBoard /> : <SupabaseRequired />} />
        <Route path="/mobile/:roomId/:groupId" element={hasSupabase ? <MobileMissionView /> : <SupabaseRequired />} />
        <Route path="/admin" element={hasSupabase ? <TeacherAuthGuard><AdminControlPanel /></TeacherAuthGuard> : <SupabaseRequired />} />
        <Route path="/remote" element={hasSupabase ? <TeacherAuthGuard><TeacherRemote /></TeacherAuthGuard> : <SupabaseRequired />} />
        <Route path="/remote/:roomId" element={hasSupabase ? <TeacherAuthGuard><TeacherRemote /></TeacherAuthGuard> : <SupabaseRequired />} />
        <Route path="/kiosk" element={hasSupabase ? <TeacherAuthGuard><KioskRelayView /></TeacherAuthGuard> : <SupabaseRequired />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      </BackgroundMusicProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

const SupabaseRequired = () => (
  <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-8 font-sans">
    <h1 className="text-2xl font-bold mb-4">수업 연결을 준비하고 있습니다</h1>
    <p className="text-lg mb-6 text-slate-600 text-center">
      지금은 실시간 수업에 연결할 수 없습니다.<br/>
      잠시 후 다시 시도해 주세요. 개인 게임은 바로 이용할 수 있습니다.
    </p>
    <a href="/hub" className="px-6 py-3 rounded-xl bg-cyan-600 text-white font-bold">개인 게임 열기</a>
  </div>
);

const NotFound = () => (
  <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center gap-4 p-6 text-center font-sans">
    <div className="text-6xl" aria-hidden="true">🧭</div>
    <h1 className="text-3xl font-black">페이지를 찾을 수 없습니다</h1>
    <p className="text-slate-300">주소를 다시 확인하거나 게임 허브로 돌아가 주세요.</p>
    <a href="/hub" className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold transition-colors">
      게임 허브로 이동
    </a>
  </div>
);

export default App;
