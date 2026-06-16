import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ScoreBoard } from './presentation/ScoreBoard';
import { MobileMissionView } from './presentation/MobileMissionView';

import { AdminControlPanel } from './presentation/AdminControlPanel';

// 임시 로비 컴포넌트 (모둠 선택)
const Lobby = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 gap-6 text-white font-sans">
      <h1 className="text-3xl font-bold text-cyan-400 mb-8">역할 선택</h1>
      
      <Link to="/board" className="w-full max-w-sm py-4 bg-slate-800 rounded-xl text-center font-bold hover:bg-slate-700 border border-slate-600 transition-colors">
        🖥️ 전광판 뷰 (참관객용)
      </Link>

      <Link to="/admin" className="w-full max-w-sm py-4 bg-red-900/40 rounded-xl text-center font-bold hover:bg-red-900/60 text-red-400 border border-red-800 transition-colors">
        ⚙️ 교사 제어 패널 (관리자)
      </Link>
      
      <div className="w-full max-w-sm bg-slate-800 rounded-xl p-6 border border-slate-600 mt-4">
        <h2 className="text-xl font-bold mb-4">📱 진행요원 뷰 (모둠 선택)</h2>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map(num => (
            <Link key={num} to={`/mobile/group-${num}`} className="py-3 bg-cyan-900/50 hover:bg-cyan-800 rounded-lg text-center font-medium border border-cyan-700">
              {num}모둠
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/board" element={<ScoreBoard />} />
        <Route path="/mobile/:id" element={<MobileMissionView />} />
        <Route path="/admin" element={<AdminControlPanel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
