import { useState, useMemo, useEffect } from 'react';
import { RotateCcw, Video, Volume2, VolumeX, FlipHorizontal, ExternalLink } from 'lucide-react';

interface YouTubeExpressionPlayerProps {
  initialVideoId?: string;
  videoTitle?: string;
  defaultBpm?: number;
  enableMirror?: boolean;
}

export const YouTubeExpressionPlayer = ({
  initialVideoId = 'dQw4w9WgXcQ',
  videoTitle = '신체표현 동작 가이드 영상',
  defaultBpm = 100,
}: YouTubeExpressionPlayerProps) => {
  const [customUrl, setCustomUrl] = useState('');
  const [activeVideoId, setActiveVideoId] = useState(initialVideoId);
  const [isMirrored, setIsMirrored] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [bpm] = useState(defaultBpm);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // URL에서 Video ID 추출 헬퍼
  const extractVideoId = (input: string): string | null => {
    if (!input) return null;
    const trimmed = input.trim();
    // 1. 순수 ID인 경우 (11자리)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    // 2. youtu.be/xxx
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];
    // 3. youtube.com/watch?v=xxx
    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];
    // 4. youtube.com/embed/xxx
    const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
    // 5. youtube.com/shorts/xxx
    const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];
    return null;
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractVideoId(customUrl);
    if (id) {
      setActiveVideoId(id);
      setIsPlaying(true);
      setShowUrlInput(false);
      setCustomUrl('');
    } else {
      alert('올바른 유튜브 링크 또는 동영상 ID를 입력해 주세요.\n(예: https://www.youtube.com/watch?v=...)');
    }
  };

  // 메트로놈 박자 인터벌
  const beatIntervalMs = useMemo(() => Math.round(60000 / bpm), [bpm]);

  useEffect(() => {
    if (!isMetronomeOn) return;
    const interval = setInterval(() => {
      setCurrentBeat(b => (b % 8) + 1);
    }, beatIntervalMs);
    return () => clearInterval(interval);
  }, [isMetronomeOn, beatIntervalMs]);

  // 메트로놈 시작/종료 효과
  const toggleMetronome = () => {
    if (!isMetronomeOn) {
      setIsMetronomeOn(true);
    } else {
      setIsMetronomeOn(false);
      setCurrentBeat(1);
    }
  };

  return (
    <div className="bg-slate-950/90 rounded-2xl border border-purple-500/30 overflow-hidden shadow-xl">
      {/* 플레이어 상단 컨트롤 바 */}
      <div className="p-3 bg-slate-900/90 border-b border-purple-500/20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30">
            <Video className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-white truncate flex items-center gap-1.5">
              <span>{videoTitle}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                YouTube 연계
              </span>
            </div>
          </div>
        </div>

        {/* 조작 액션 버튼들 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 거울 모드 (좌우 반전) 토글 */}
          <button
            type="button"
            onClick={() => setIsMirrored(prev => !prev)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 ${
              isMirrored
                ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-900/40'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="영상을 좌우 반전하여 거울처럼 마주보고 쉽게 안무를 따라 합니다."
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>거울 모드 {isMirrored ? 'ON' : 'OFF'}</span>
          </button>

          {/* 박자 메트로놈 토글 */}
          <button
            type="button"
            onClick={toggleMetronome}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 ${
              isMetronomeOn
                ? 'bg-amber-600 border-amber-400 text-white shadow-md shadow-amber-900/40 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="박자 메트로놈 (BPM)"
          >
            {isMetronomeOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>리듬 비트 {bpm}BPM</span>
          </button>

          {/* 링크 직접 입력 토글 */}
          <button
            type="button"
            onClick={() => setShowUrlInput(prev => !prev)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>영상 변경</span>
          </button>

          {/* 유튜브 새 탭에서 열기 */}
          <a
            href={`https://www.youtube.com/watch?v=${activeVideoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 transition-colors flex items-center gap-1"
            title="유튜브 웹사이트에서 큰 화면으로 열기"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>YouTube에서 열기</span>
          </a>
        </div>
      </div>

      {/* 커스텀 URL 입력 폼 (토글 시 노출) */}
      {showUrlInput && (
        <form onSubmit={handleApplyUrl} className="p-3 bg-purple-950/40 border-b border-purple-500/20 flex gap-2 animate-in fade-in duration-150">
          <input
            type="text"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="수업에 사용할 유튜브 영상 링크를 붙여넣으세요 (예: https://youtu.be/...)"
            className="flex-1 px-3 py-1.5 bg-slate-900 border border-purple-500/40 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black shadow transition-all shrink-0"
          >
            적용
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveVideoId(initialVideoId);
              setShowUrlInput(false);
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-bold transition-all shrink-0"
            title="추천 기본 영상으로 초기화"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* 비트 카운터 인디케이터 (8박자) */}
      {isMetronomeOn && (
        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="font-bold text-amber-400 flex items-center gap-1">
            🎵 8박자 리듬 가이드:
          </span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(beat => (
              <span
                key={beat}
                className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs transition-all ${
                  currentBeat === beat
                    ? 'bg-amber-400 text-slate-950 scale-110 shadow-lg shadow-amber-400/50'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {beat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 16:9 반응형 비디오 임베드 컨테이너 */}
      <div className="relative w-full aspect-video bg-black overflow-hidden group">
        <iframe
          key={`${activeVideoId}-${isMirrored}`}
          src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=${isPlaying ? 1 : 0}&rel=0&modestbranding=1&enablejsapi=1`}
          title={videoTitle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className={`w-full h-full border-0 transition-transform duration-300 ${isMirrored ? 'scale-x-[-1]' : ''}`}
        />

        {/* 거울 모드 워터마크 표시 */}
        {isMirrored && (
          <div className="absolute top-2 left-2 z-10 pointer-events-none bg-purple-900/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-purple-400 text-[10px] font-black text-purple-200">
            🪞 거울 모드 (좌우 반전 중)
          </div>
        )}
      </div>

      {/* 하단 팁 및 안내 */}
      <div className="p-2.5 bg-slate-950 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <span>💡 <strong>거울 모드:</strong> 강사의 왼손이 화면 왼쪽으로 보여 거울처럼 쉽게 따라 할 수 있습니다.</span>
        <span className="text-slate-500">
          ※ 외부 재생이 제한된 영상은 <strong>[영상 변경]</strong>으로 다른 링크를 입력하거나 <strong>[YouTube에서 열기]</strong>를 누르세요.
        </span>
      </div>
    </div>
  );
};
