import { useState, useEffect } from 'react';
import { Volume2, EyeOff } from 'lucide-react';
import { sfxTap, sfxSuccess, sfxPop, sfxFail, sfxWhoosh } from '../../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

type Direction = 'left' | 'center' | 'right';

export const SoundGoalball = ({ groupId, enqueueAction }: Props) => {
  const [round, setRound] = useState(1);
  const [targetDir, setTargetDir] = useState<Direction>('center');
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [canBlock, setCanBlock] = useState(false);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string>('소리에 귀를 기울이세요!');
  const [finished, setFinished] = useState(false);

  const dirs: Direction[] = ['left', 'center', 'right'];

  useEffect(() => {
    startSoundRound();
  }, [round]);

  const startSoundRound = () => {
    setCanBlock(false);
    setIsPlayingSound(true);
    setFeedback('방울 소리가 굴러오는 방향을 들으세요...');

    const chosen = dirs[Math.floor(Math.random() * 3)];
    setTargetDir(chosen);

    // 가상 방울 소리 발생 (삐- 삐- 삐-)
    const timer1 = setTimeout(() => {
      sfxPop();
      if (chosen === 'left') sfxTap();
      else if (chosen === 'right') sfxWhoosh();
      else sfxPop();

      setIsPlayingSound(false);
      setCanBlock(true);
      setFeedback('방향이 감지되었습니다! 막을 방향을 빠르게 터치하세요!');
    }, 1200);

    return () => clearTimeout(timer1);
  };

  const finishGame = (finalScore?: number) => {
    setFinished(true);
    sfxSuccess();
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: finalScore !== undefined ? finalScore : score },
      timestamp: Date.now(),
    });
  };

  const handleBlock = (dir: Direction) => {
    if (!canBlock || finished) return;
    setCanBlock(false);

    if (dir === targetDir) {
      // 블로킹 성공!
      sfxSuccess();
      const add = 50;
      setScore(s => s + add);
      setFeedback(`🎯 나이스 세이브! ${dir === 'left' ? '왼쪽' : dir === 'center' ? '중앙' : '오른쪽'} 방울공 방어 성공! (+50점)`);
    } else {
      sfxFail();
      setFeedback(`골 허용! 실제 공 방향: ${targetDir === 'left' ? '왼쪽' : targetDir === 'center' ? '중앙' : '오른쪽'}`);
    }

    setTimeout(() => {
      if (round >= 4) {
        finishGame(score + (dir === targetDir ? 50 : 0));
      } else {
        setRound(r => r + 1);
      }
    }, 1200);
  };

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <EyeOff className="w-6 h-6 text-purple-400" />
          <span className="text-white font-bold text-lg">골볼 소리 탐지 캐치</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">세트 {round}/4</span>
          <span className="text-purple-400 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      {/* 암전 골볼 경기장 시각화 */}
      <div className="relative w-full h-72 bg-slate-950 rounded-2xl overflow-hidden border-2 border-purple-500/40 p-4 flex flex-col items-center justify-between shadow-2xl">
        <div className="text-xs text-purple-300 flex items-center gap-1 font-bold">
          <Volume2 className={`w-4 h-4 ${isPlayingSound ? 'animate-ping' : ''}`} />
          <span>시각장애인 스포츠 체험 (청각 집중 모드)</span>
        </div>

        {/* 중앙 청각 음파 펄스 */}
        <div className="relative flex items-center justify-center my-auto">
          <div className={`w-28 h-28 rounded-full border-4 border-purple-500/30 flex items-center justify-center ${isPlayingSound ? 'scale-125 duration-500 animate-pulse' : ''}`}>
            <span className="text-4xl">🔔</span>
          </div>
          {isPlayingSound && (
            <div className="absolute text-xs text-yellow-300 font-mono font-bold mt-28 animate-bounce">
              딩-동-댕 굴러오는 소리 탐지 중...
            </div>
          )}
        </div>

        <div className="text-xs font-bold text-center text-purple-200">
          {feedback}
        </div>
      </div>

      {/* 3방향 다이빙 블로킹 버튼 */}
      <div className="grid grid-cols-3 gap-3 w-full mt-4">
        <button
          onClick={() => handleBlock('left')}
          disabled={!canBlock || finished}
          className="py-6 bg-gradient-to-b from-purple-700 to-indigo-800 hover:brightness-110 active:scale-95 text-white font-black text-base rounded-2xl shadow-lg border border-purple-400/40 flex flex-col items-center justify-center gap-1"
        >
          <span className="text-2xl">◀️</span>
          <span>왼쪽 막기</span>
        </button>

        <button
          onClick={() => handleBlock('center')}
          disabled={!canBlock || finished}
          className="py-6 bg-gradient-to-b from-purple-600 to-purple-800 hover:brightness-110 active:scale-95 text-white font-black text-base rounded-2xl shadow-lg border border-purple-400/40 flex flex-col items-center justify-center gap-1"
        >
          <span className="text-2xl">🛡️</span>
          <span>중앙 막기</span>
        </button>

        <button
          onClick={() => handleBlock('right')}
          disabled={!canBlock || finished}
          className="py-6 bg-gradient-to-b from-purple-700 to-indigo-800 hover:brightness-110 active:scale-95 text-white font-black text-base rounded-2xl shadow-lg border border-purple-400/40 flex flex-col items-center justify-center gap-1"
        >
          <span className="text-2xl">▶️</span>
          <span>오른쪽 막기</span>
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center mt-2">
        눈을 감고 소리에 귀를 기울인 뒤, 방울공이 굴러온 방향을 순간적으로 선택하세요!
      </p>
    </div>
  );
};
