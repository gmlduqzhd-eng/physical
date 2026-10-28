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
  volume: number;
  setVolume: (value: number) => void;
  toggle: () => void;
  suppress: (value: boolean) => void;
} | null>(null);

export function BackgroundMusicProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [enabled, setEnabled] = useState(
    () => readStorage(preferenceKey) !== "off",
  );
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, updateVolume] = useState(loadVolume);
  const enabledRef = useRef(enabled);
  const eligibleRef = useRef(false);
  const suppressedRef = useRef(false);
  const eligible = allowsBackgroundMusic(pathname);

  const attemptPlay = useCallback(() => {
    const audio = audioRef.current;
    if (
      !audio ||
      !enabledRef.current ||
      !eligibleRef.current ||
      suppressedRef.current ||
      document.hidden
    )
      return;
    if (!audio.src) audio.src = musicSource;
    // Audible autoplay can be denied; retry only on a real user interaction.
    void audio.play().catch(() => {});
  }, []);

  const suppress = useCallback(
    (value: boolean) => {
      suppressedRef.current = value;
      if (value) audioRef.current?.pause();
      else attemptPlay();
    },
    [attemptPlay],
  );

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    writeStorage(preferenceKey, next ? "on" : "off");
    setEnabled(next);
    if (next) attemptPlay();
    else audioRef.current?.pause();
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
    else audio?.pause();
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
    window.addEventListener("pointerdown", attemptPlay, { passive: true });
    window.addEventListener("keydown", attemptPlay);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", attemptPlay);
      window.removeEventListener("keydown", attemptPlay);
      document.removeEventListener("visibilitychange", onVisibility);
      audio?.pause();
    };
  }, [attemptPlay]);

  return (
    <BackgroundMusicContext.Provider value={{ enabled, volume, setVolume, toggle, suppress }}>
      <audio
        ref={audioRef}
        data-background-music="expedition"
        preload="auto"
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
