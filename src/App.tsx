import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ScoreBoard } from './presentation/ScoreBoard';
import { MobileMissionView } from './presentation/MobileMissionView';
import { AdminControlPanel } from './presentation/AdminControlPanel';
import { Lobby } from './presentation/Lobby';

function App() {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 font-sans">
        <h1 className="text-3xl text-red-500 font-bold mb-4">🚨 환경 변지가 누락되었습니다!</h1>
        <p className="text-lg mb-6 text-slate-300 text-center">
          Vercel 대시보드(Settings {'>'} Environment Variables)에서<br/>다음 환경변수를 설정하고 <b>재배포(Redeploy)</b> 해주세요.
        </p>
        <ul className="bg-slate-800 p-8 rounded-xl text-left list-disc list-inside border border-slate-700 font-mono text-cyan-400">
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
        <Route path="/board/:roomId" element={<ScoreBoard />} />
        <Route path="/mobile/:roomId/:groupId" element={<MobileMissionView />} />
        <Route path="/admin" element={<AdminControlPanel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
