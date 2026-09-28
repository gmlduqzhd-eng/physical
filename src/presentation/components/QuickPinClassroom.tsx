import React, { useState } from 'react';
import { X, Users, Play } from 'lucide-react';
import { useAudio } from '../../application/useAudio';

interface QuickPinClassroomProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (gameType: string) => void;
}

export const QuickPinClassroom: React.FC<QuickPinClassroomProps> = ({ isOpen, onClose, onStartGame }) => {
  const { playBeep } = useAudio();

  const [pin, setPin] = useState<string>('');
  const [inRoom, setInRoom] = useState<boolean>(false);
  const [roomPin, setRoomPin] = useState<string>('7788');
  const [selectedTeam, setSelectedTeam] = useState<'blue' | 'white'>('blue');

  // 학급 팀 스코어 (시뮬레이션 및 로컬 연동)
  const [blueScore, setBlueScore] = useState<number>(340);
  const [whiteScore, setWhiteScore] = useState<number>(315);
  const membersCount = 24;

  if (!isOpen) return null;

  const handleCreateRoom = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setRoomPin(randomPin);
    setInRoom(true);
    playBeep();
  };

  const handleJoinRoom = () => {
    if (pin.length !== 4) {
      alert('4자리 방 번호(PIN)를 입력해 주세요!');
      return;
    }
    setRoomPin(pin);
    setInRoom(true);
    playBeep();
  };

  const handleAddScore = (points: number) => {
    playBeep();
    if (selectedTeam === 'blue') {
      setBlueScore(prev => prev + points);
    } else {
      setWhiteScore(prev => prev + points);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-blue-500/40 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        {!inRoom ? (
          /* 방 생성 / PIN 번호 입장 뷰 */
          <div className="text-center py-2">
            <div className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/30">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-black mb-1">4자리 PIN 학급 배틀룸</h2>
            <p className="text-xs text-slate-400 mb-6">회원가입 없이 4자리 숫자만 치면 우리 반 대항전 시작!</p>

            {/* PIN 입력 폼 */}
            <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 mb-5">
              <label className="text-xs font-bold text-slate-300 block mb-2">선생님이 알려주신 PIN 입력</label>
              <input
                type="text"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="예: 7788"
                className="w-full py-3 text-center text-3xl font-mono font-black tracking-widest bg-slate-950 border border-slate-700 rounded-xl text-cyan-400 focus:outline-none focus:border-cyan-400 mb-3"
              />
              <button
                onClick={handleJoinRoom}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-sm transition-all"
              >
                방 입장하기
              </button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500">또는</span></div>
            </div>

            <button
              onClick={handleCreateRoom}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm border border-slate-700"
            >
              선생님: 새로운 학급 배틀방 개설하기
            </button>
          </div>
        ) : (
          /* 학급 배틀 룸 대기/진행 뷰 */
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold text-cyan-400">배틀 방 번호</span>
                <p className="text-2xl font-mono font-black tracking-wider text-white">#{roomPin}</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-xl text-xs font-bold text-slate-300">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                {membersCount}명 참가중
              </div>
            </div>

            {/* 청팀 vs 백팀 스코어보드 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div
                onClick={() => setSelectedTeam('blue')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedTeam === 'blue'
                    ? 'bg-blue-600/30 border-blue-400 shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800/50 border-slate-700 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-blue-300">청팀 (Blue)</span>
                  {selectedTeam === 'blue' && <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded">선택됨</span>}
                </div>
                <div className="text-3xl font-mono font-black text-blue-400">{blueScore} <span className="text-xs">점</span></div>
              </div>

              <div
                onClick={() => setSelectedTeam('white')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedTeam === 'white'
                    ? 'bg-slate-700/60 border-slate-300 shadow-lg shadow-white/10'
                    : 'bg-slate-800/50 border-slate-700 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-slate-200">백팀 (White)</span>
                  {selectedTeam === 'white' && <span className="text-[10px] bg-white text-slate-950 px-1.5 py-0.5 rounded">선택됨</span>}
                </div>
                <div className="text-3xl font-mono font-black text-white">{whiteScore} <span className="text-xs">점</span></div>
              </div>
            </div>

            {/* 승리 확률 막대그래프 */}
            <div className="bg-slate-800 p-3 rounded-2xl mb-4 border border-slate-700/60">
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex">
                <div
                  className="bg-blue-500 h-full transition-all duration-500"
                  style={{ width: `${(blueScore / (blueScore + whiteScore)) * 100}%` }}
                />
                <div
                  className="bg-slate-200 h-full transition-all duration-500"
                  style={{ width: `${(whiteScore / (blueScore + whiteScore)) * 100}%` }}
                />
              </div>
            </div>

            {/* 배틀 종목 즉시 도전 */}
            <div className="space-y-2 mb-4">
              <p className="text-xs font-bold text-slate-400">선택된 팀에 점수 기여하기</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    handleAddScore(25);
                    onStartGame('reaction');
                    onClose();
                  }}
                  className="py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> 반응속도 대결
                </button>
                <button
                  onClick={() => {
                    handleAddScore(25);
                    onStartGame('swipe');
                    onClose();
                  }}
                  className="py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> 방향 스와이프
                </button>
              </div>
            </div>

            <button
              onClick={() => setInRoom(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 font-bold rounded-xl"
            >
              다른 방으로 나가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
