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
import musicSource from "../assets/expedition-theme.mp3";

const preferenceKey = "physical_background_music_v1";
const BackgroundMusicContext = createContext<{
  enabled: boolean;
  toggle: () => void;
  suppress: (value: boolean) => void;
} | null>(null);

export function BackgroundMusicProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [enabled, setEnabled] = useState(
    () => readStorage(preferenceKey) !== "off",
  );
  const audioRef = useRef<HTMLAudioElement>(null);
  const enabledRef = useRef(enabled);
  const eligibleRef = useRef(false);
  const suppressedRef = useRef(false);
  const eligible = ["/", "/hub", "/games"].includes(
    pathname.replace(/\/$/, "") || "/",
  );

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
    if (audio) audio.volume = 0.35;
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
    <BackgroundMusicContext.Provider value={{ enabled, toggle, suppress }}>
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
