import { Music2, Music } from "lucide-react";
import { useId } from "react";
import { useBackgroundMusic } from "../../application/BackgroundMusicContext";
import "./BackgroundMusicButton.css";

export function BackgroundMusicButton() {
  const { enabled, volume, setVolume, toggle } = useBackgroundMusic();
  const sliderId = useId();
  const percent = Math.round(volume * 1000) / 10;
  const label = enabled ? "배경음악 끄기" : "배경음악 켜기";
  return (
    <div className="background-music-controls">
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
      <label htmlFor={sliderId} className="background-music-volume">
        <span className="sr-only">배경음악 볼륨</span>
        <input id={sliderId} type="range" min="0" max="100" step="0.5" value={percent}
          aria-valuetext={`${percent}%`} onChange={event => setVolume(Number(event.target.value) / 100)} />
        <span className="background-music-percent" aria-hidden="true">{percent}%</span>
      </label>
    </div>
  );
}
