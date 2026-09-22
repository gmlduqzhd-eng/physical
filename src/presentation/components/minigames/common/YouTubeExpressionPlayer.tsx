import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RotateCcw, Video, Volume2, VolumeX, FlipHorizontal, ExternalLink, Repeat, Gauge } from 'lucide-react';

// YouTube IFrame Player API 타입
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface YouTubeExpressionPlayerProps {
  initialVideoId?: string;
  videoTitle?: string;
  defaultBpm?: number;
  enableMirror?: boolean;
}

// YouTube IFrame API 스크립트 로드 (앱 전체에서 1회만)
let ytApiLoaded = false;
let ytApiCallbacks: (() => void)[] = [];

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    ytApiCallbacks.push(resolve);
    if (!ytApiLoaded) {
      ytApiLoaded = true;
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      const firstScript = document.getElementsByTagName('script')[0];
      firstScript.parentNode?.insertBefore(tag, firstScript);
      window.onYouTubeIframeAPIReady = () => {
        ytApiCallbacks.forEach(cb => cb());
        ytApiCallbacks = [];
      };
    }
  });
}

export const YouTubeExpressionPlayer = ({
  initialVideoId = 'dQw4w9WgXcQ',
  videoTitle = '신체표현 동작 가이드 영상',
  defaultBpm = 100,
}: YouTubeExpressionPlayerProps) => {
  const [customUrl, setCustomUrl] = useState('');
  const [activeVideoId, setActiveVideoId] = useState(initialVideoId);
  const [isMirrored, setIsMirrored] = useState(false);
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [bpm] = useState(defaultBpm);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // 배속 & 구간 반복 상태
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [pointA, setPointA] = useState<number | null>(null);
  const [pointB, setPointB] = useState<number | null>(null);
  const [loopActive, setLoopActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Player refs
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loopIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerContainerId = useRef(`yt-player-${Math.random().toString(36).slice(2, 9)}`);

  // URL에서 Video ID 추출 헬퍼
  const extractVideoId = (input: string): string | null => {
    if (!input) return null;
    const trimmed = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];
    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];
    const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
    const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];
    return null;
  };

  // YouTube IFrame Player API 초기화
  useEffect(() => {
    let destroyed = false;

    const initPlayer = async () => {
      await loadYouTubeAPI();
      if (destroyed) return;

      // 기존 플레이어 제거
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(playerContainerId.current, {
        videoId: activeVideoId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          playsinline: 1,
        },
        events: {
          onReady: (event: any) => {
            event.target.setPlaybackRate(playbackRate);
          },
        },
      });
    };

    initPlayer();

    return () => {
      destroyed = true;
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }
    };
  }, [activeVideoId]);

  // 배속 변경 시 플레이어에 적용
  useEffect(() => {
    if (playerRef.current?.setPlaybackRate) {
      playerRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate]);

  // 구간 반복 로직
  useEffect(() => {
    if (loopIntervalRef.current) {
      clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = null;
    }

    if (loopActive && pointA !== null && pointB !== null && playerRef.current) {
      loopIntervalRef.current = setInterval(() => {
        if (!playerRef.current?.getCurrentTime) return;
        const ct = playerRef.current.getCurrentTime();
        setCurrentTime(ct);
        if (ct >= pointB) {
          playerRef.current.seekTo(pointA, true);
        }
      }, 200);
    } else {
      // 현재 시간 업데이트용 (구간 반복 미사용 시에도)
      loopIntervalRef.current = setInterval(() => {
        if (!playerRef.current?.getCurrentTime) return;
        setCurrentTime(playerRef.current.getCurrentTime());
      }, 500);
    }

    return () => {
      if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);
    };
  }, [loopActive, pointA, pointB]);

  // 배속 토글 핸들러
  const speeds = [1.0, 0.75, 0.5];
  const handleSpeedToggle = useCallback(() => {
    setPlaybackRate(prev => {
      const idx = speeds.indexOf(prev);
      return speeds[(idx + 1) % speeds.length];
    });
  }, []);

  // A/B 구간 설정 핸들러
  const handleSetA = useCallback(() => {
    if (playerRef.current?.getCurrentTime) {
      const t = playerRef.current.getCurrentTime();
      setPointA(t);
      if (pointB !== null && t >= pointB) setPointB(null);
    }
  }, [pointB]);

  const handleSetB = useCallback(() => {
    if (playerRef.current?.getCurrentTime) {
      const t = playerRef.current.getCurrentTime();
      if (pointA !== null && t > pointA) {
        setPointB(t);
      }
    }
  }, [pointA]);

  const handleToggleLoop = useCallback(() => {
    if (pointA !== null && pointB !== null) {
      setLoopActive(prev => {
        if (!prev && playerRef.current?.seekTo) {
          playerRef.current.seekTo(pointA, true);
          playerRef.current.playVideo();
        }
        return !prev;
      });
    }
  }, [pointA, pointB]);

  const handleResetLoop = useCallback(() => {
    setPointA(null);
    setPointB(null);
    setLoopActive(false);
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractVideoId(customUrl);
    if (id) {
      setActiveVideoId(id);
      setShowUrlInput(false);
      setCustomUrl('');
      handleResetLoop();
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
                YouTube IFrame API
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
              handleResetLoop();
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

      {/* 16:9 반응형 비디오 - YouTube IFrame Player API */}
      <div
        ref={containerRef}
        className={`relative w-full aspect-video bg-black overflow-hidden group transition-transform duration-300 ${isMirrored ? 'scale-x-[-1]' : ''}`}
      >
        <div id={playerContainerId.current} className="w-full h-full" />

        {/* 거울 모드 워터마크 표시 */}
        {isMirrored && (
          <div className={`absolute top-2 left-2 z-10 pointer-events-none bg-purple-900/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-purple-400 text-[10px] font-black text-purple-200 ${isMirrored ? 'scale-x-[-1]' : ''}`}>
            🪞 거울 모드 (좌우 반전 중)
          </div>
        )}
      </div>

      {/* ===== 배속 & 구간 반복 툴바 ===== */}
      <div className="p-3 bg-slate-900/95 border-t border-purple-500/20 space-y-2.5">
        {/* 배속 조절 */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold shrink-0">
            <Gauge className="w-3.5 h-3.5" />
            <span>배속:</span>
          </div>
          <div className="flex gap-1">
            {speeds.map(speed => (
              <button
                key={speed}
                type="button"
                onClick={() => setPlaybackRate(speed)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border ${
                  playbackRate === speed
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-900/50'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleSpeedToggle}
            className="ml-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
            title="배속 순환 토글"
          >
            순환 ⟳
          </button>
        </div>

        {/* 구간 반복 (A-B Loop) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold shrink-0">
            <Repeat className="w-3.5 h-3.5" />
            <span>구간 반복:</span>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleSetA}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border ${
                pointA !== null
                  ? 'bg-emerald-700 border-emerald-500 text-emerald-100 shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
              title="현재 재생 위치를 A구간(시작점)으로 설정"
            >
              A {pointA !== null ? formatTime(pointA) : '설정'}
            </button>
            <button
              type="button"
              onClick={handleSetB}
              disabled={pointA === null}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border ${
                pointB !== null
                  ? 'bg-orange-700 border-orange-500 text-orange-100 shadow-sm'
                  : pointA !== null
                    ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
              }`}
              title="현재 재생 위치를 B구간(끝점)으로 설정"
            >
              B {pointB !== null ? formatTime(pointB) : '설정'}
            </button>
            <button
              type="button"
              onClick={handleToggleLoop}
              disabled={pointA === null || pointB === null}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border flex items-center gap-1 ${
                loopActive
                  ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-900/50 animate-pulse'
                  : pointA !== null && pointB !== null
                    ? 'bg-slate-800 border-slate-700 text-purple-300 hover:bg-slate-700'
                    : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
              }`}
              title="A-B 구간 반복 켜기/끄기"
            >
              <Repeat className="w-3 h-3" />
              <span>{loopActive ? '반복 중 ■' : '반복 시작'}</span>
            </button>
          </div>
          {(pointA !== null || pointB !== null) && (
            <button
              type="button"
              onClick={handleResetLoop}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-red-900/60 text-red-400 border border-slate-700 transition-colors"
              title="A/B 구간 초기화"
            >
              초기화
            </button>
          )}
        </div>

        {/* 현재 재생 위치 & 구간 표시 바 */}
        {(pointA !== null || pointB !== null) && (
          <div className="bg-slate-950 rounded-xl px-3 py-2 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-3">
            <span>📍 현재: <strong className="text-cyan-300">{formatTime(currentTime)}</strong></span>
            {pointA !== null && <span>A: <strong className="text-emerald-300">{formatTime(pointA)}</strong></span>}
            {pointB !== null && <span>B: <strong className="text-orange-300">{formatTime(pointB)}</strong></span>}
            {loopActive && <span className="text-purple-300 font-bold animate-pulse">🔁 구간 반복 재생 중</span>}
          </div>
        )}
      </div>

      {/* 하단 팁 및 안내 */}
      <div className="p-2.5 bg-slate-950 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
        <span>💡 <strong>거울 모드:</strong> 강사의 왼손이 화면 왼쪽으로 보여 거울처럼 쉽게 따라 할 수 있습니다.</span>
        <span className="text-slate-500">
          ※ <strong>구간 반복:</strong> 영상을 재생하면서 원하는 시점에 A→B를 설정한 뒤 반복 시작 버튼을 누르세요.
        </span>
      </div>
    </div>
  );
};
