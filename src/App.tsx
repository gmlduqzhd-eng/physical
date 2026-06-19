import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ScoreBoard } from './presentation/ScoreBoard';
import { MobileMissionView } from './presentation/MobileMissionView';
import { AdminControlPanel } from './presentation/AdminControlPanel';
import { Lobby } from './presentation/Lobby';
import { Manual } from './presentation/Manual';
import { KioskRelayView } from './presentation/KioskRelayView';
import { syncServerTime } from './application/timeSync';

function App() {
  useEffect(() => {
    if (import.meta.env.VITE_SUPABASE_URL) {
      syncServerTime(import.meta.env.VITE_SUPABASE_URL);
    }
  }, []);

  if (!import.meta.env.VITE_SUPABASE_URL) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-8 font-sans">
        <h1 className="text-3xl text-red-500 font-bold mb-4">🚨 환경 변수가 누락되었습니다!</h1>
        <p className="text-lg mb-6 text-slate-600 text-center">
          Vercel 대시보드(Settings {'>'} Environment Variables)에서<br/>다음 환경변수를 설정하고 <b>재배포(Redeploy)</b> 해주세요.
        </p>
        <ul className="bg-white p-8 rounded-xl text-left list-disc list-inside border border-slate-200 shadow-sm font-mono text-cyan-600">
          <li className="mb-2">VITE_SUPABASE_URL</li>
          <li>VITE_SUPABASE_ANON_KEY</li>
        </ul>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/manual" element={<Manual />} />
        <Route path="/board/:roomId" element={<ScoreBoard />} />
        <Route path="/mobile/:roomId/:groupId" element={<MobileMissionView />} />
        <Route path="/admin" element={<AdminControlPanel />} />
        <Route path="/kiosk" element={<KioskRelayView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
