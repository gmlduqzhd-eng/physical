/* eslint-disable react-refresh/only-export-components -- Provider and its consumer hook share one context. */
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { readStorage, writeStorage } from "./browserStorage";
import { allowsBackgroundMusic } from "./backgroundMusicRoutes";
import musicSource from "../assets/expedition-theme.mp3";

const preferenceKey = "physical_background_music_v1";
const volumeKey = "physical_background_music_volume_v1";
const defaultVolume = 0.175;
// Keep the user's slider/storage value independent of playback output gain.
const outputGain = 0.35;
const loadVolume = () => {
  const saved = readStorage(volumeKey);
  const parsed = saved?.trim() ? Number(saved) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : defaultVolume;
};
const BackgroundMusicContext = createContext<{
  enabled: boolean;
  /** 켜 두었지만 브라우저가 소리를 막아 아직 나지 않는 상태(새로고침 직후 등). 한 번 누르면 다시 난다. */
  blocked: boolean;
  volume: number;
  setVolume: (value: number) => void;
  toggle: () => void;
  suppress: (value: boolean) => void;
  suspendLesson: (value: boolean) => void;
  /** 막혔던 소리를 사용자의 손동작에 맞춰 다시 낸다. */
  resume: () => void;
} | null>(null);

export function BackgroundMusicProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  // Off until someone turns it on: a classroom TV must not start playing on the first click.
  // The audio file is fetched only when playback starts.
  const [enabled, setEnabled] = useState(
    () => readStorage(preferenceKey) === "on",
  );
  const audioRef = useRef<HTMLAudioElement>(null);
  const [blocked, setBlocked] = useState(false);
  const [volume, updateVolume] = useState(loadVolume);
  const enabledRef = useRef(enabled);
  const eligibleRef = useRef(false);
  const suppressedRef = useRef(false);
  const lessonPausedRef=useRef(false);
  const eligible = allowsBackgroundMusic(pathname);

  const attemptPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !enabledRef.current) return;
    // 음악을 틀지 않는 화면·멈춘 수업·숨은 탭에서는 '막힘'도 아니다: 남아 있던 막힘 표시를 지워
    // '음악 다시 켜기'가 아무 일도 하지 않는 단추로 남지 않게 한다.
    if (!eligibleRef.current || suppressedRef.current || lessonPausedRef.current || document.hidden) {
      setBlocked(false);
      return;
    }
    if (!audio.src) audio.src = musicSource;
    // Audible autoplay can be denied; retry only on a real user interaction.
    // Remember the refusal so the button can say "음악 다시 켜기" instead of claiming music is playing.
    void audio.play().then(() => setBlocked(false), (error: unknown) => {
      if (error instanceof DOMException && error.name === "NotAllowedError") setBlocked(true);
    });
  }, []);

  const suppress = useCallback(
    (value: boolean) => {
      suppressedRef.current = value;
      if (value) { audioRef.current?.pause(); setBlocked(false); }
      else attemptPlay();
    },
    [attemptPlay],
  );
  const suspendLesson=useCallback((value:boolean)=>{lessonPausedRef.current=value;if(value){audioRef.current?.pause();setBlocked(false);}else attemptPlay();},[attemptPlay]);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    writeStorage(preferenceKey, next ? "on" : "off");
    setEnabled(next);
    if (next) attemptPlay();
    else { audioRef.current?.pause(); setBlocked(false); }
  }, [attemptPlay]);

  const setVolume = useCallback((value: number) => {
    if (!Number.isFinite(value)) return;
    const next = Math.max(0, Math.min(1, value));
    if (audioRef.current) audioRef.current.volume = next * outputGain;
    writeStorage(volumeKey, String(next));
    updateVolume(next);
  }, []);

  useLayoutEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume * outputGain;
  }, [volume]);

  useLayoutEffect(() => {
    const audio = audioRef.current;
    eligibleRef.current = eligible;
    if (eligible) attemptPlay();
    else { audio?.pause(); setBlocked(false); }
    return () => {
      eligibleRef.current = false;
      audio?.pause();
    };
  }, [eligible, attemptPlay]);

  useLayoutEffect(() => {
    const audio = audioRef.current;
    const onVisibility = () => {
      if (document.hidden) audio?.pause();
      else attemptPlay();
    };
    const onPlaying = () => setBlocked(false);
    audio?.addEventListener("playing", onPlaying);
    window.addEventListener("pointerdown", attemptPlay, { passive: true });
    window.addEventListener("keydown", attemptPlay);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", attemptPlay);
      window.removeEventListener("keydown", attemptPlay);
      document.removeEventListener("visibilitychange", onVisibility);
      audio?.removeEventListener("playing", onPlaying);
      audio?.pause();
    };
  }, [attemptPlay]);

  return (
    <BackgroundMusicContext.Provider value={{ enabled, blocked: enabled && eligible && blocked, volume, setVolume, toggle, suppress,suspendLesson, resume: attemptPlay }}>
      <audio
        ref={audioRef}
        data-background-music="expedition"
        preload="none"
        loop
        hidden
      />
      {children}
    </BackgroundMusicContext.Provider>
  );
}

export function useBackgroundMusic() {
  const context = useContext(BackgroundMusicContext);
  if (!context)
    throw new Error(
      "Background music controls require BackgroundMusicProvider",
    );
  return context;
}
