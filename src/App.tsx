import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ScoreBoard } from './presentation/ScoreBoard';
import { MobileMissionView } from './presentation/MobileMissionView';
import { AdminControlPanel } from './presentation/AdminControlPanel';
import { Lobby } from './presentation/Lobby';
import { Manual } from './presentation/Manual';
import { KioskRelayView } from './presentation/KioskRelayView';
import { QuickJoin } from './presentation/QuickJoin';
import { BoardEntry } from './presentation/BoardEntry';
import { GameHub } from './presentation/GameHub';
import { GamePlayPage } from './presentation/GamePlayPage';
import { syncServerTime } from './application/timeSync';
import { KakaoInAppNotice } from './presentation/components/KakaoInAppNotice';

function App() {
  useEffect(() => {
    if (import.meta.env.VITE_SUPABASE_URL) {
      syncServerTime(import.meta.env.VITE_SUPABASE_URL);
    }
  }, []);

  // Supabase 미설정 시 — 게임 허브와 독립 플레이는 여전히 작동
  const hasSupabase = !!import.meta.env.VITE_SUPABASE_URL;

  return (
    <BrowserRouter>
      <KakaoInAppNotice />
      <Routes>
        {/* 메인: 게임 허브 */}
        <Route path="/" element={<GameHub />} />
        <Route path="/play/:gameType" element={<GamePlayPage />} />

        {/* 교사 관리 & 수업용 (Supabase 필요) */}
        <Route path="/lobby" element={hasSupabase ? <Lobby /> : <SupabaseRequired />} />
        <Route path="/join" element={hasSupabase ? <QuickJoin /> : <SupabaseRequired />} />
        <Route path="/manual" element={<Manual />} />
        <Route path="/board" element={hasSupabase ? <BoardEntry /> : <SupabaseRequired />} />
        <Route path="/board/:roomId" element={hasSupabase ? <ScoreBoard /> : <SupabaseRequired />} />
        <Route path="/mobile/:roomId/:groupId" element={hasSupabase ? <MobileMissionView /> : <SupabaseRequired />} />
        <Route path="/admin" element={hasSupabase ? <AdminControlPanel /> : <SupabaseRequired />} />
        <Route path="/kiosk" element={hasSupabase ? <KioskRelayView /> : <SupabaseRequired />} />
      </Routes>
    </BrowserRouter>
  );
}

const SupabaseRequired = () => (
  <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-8 font-sans">
    <h1 className="text-3xl text-red-500 font-bold mb-4">🚨 환경 변수가 누락되었습니다!</h1>
    <p className="text-lg mb-6 text-slate-600 text-center">
      이 기능은 Supabase 연결이 필요합니다.<br/>
      Vercel 대시보드(Settings {'>'} Environment Variables)에서<br/>다음 환경변수를 설정하고 <b>재배포(Redeploy)</b> 해주세요.
    </p>
    <ul className="bg-white p-8 rounded-xl text-left list-disc list-inside border border-slate-200 shadow-sm font-mono text-cyan-600">
      <li className="mb-2">VITE_SUPABASE_URL</li>
      <li>VITE_SUPABASE_ANON_KEY</li>
    </ul>
  </div>
);

export default App;
