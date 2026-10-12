import { Music2, Music } from "lucide-react";
import { useBackgroundMusic } from "../../application/BackgroundMusicContext";
import "./BackgroundMusicButton.css";

export function BackgroundMusicButton() {
  const { enabled, toggle } = useBackgroundMusic();
  const label = enabled ? "배경음악 끄기" : "배경음악 켜기";
  return (
    <button
      type="button"
      className="background-music-button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={label}
      title={label}
    >
      {enabled ? <Music2 aria-hidden="true" /> : <Music aria-hidden="true" />}
      <span>음악 {enabled ? "ON" : "OFF"}</span>
    </button>
  );
}
