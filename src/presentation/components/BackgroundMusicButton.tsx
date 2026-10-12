import { Music2, Volume2 } from "lucide-react";
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
      <div className="background-music-heading">
        <div className="background-music-title">
          <span className="background-music-icon"><Music2 aria-hidden="true" /></span>
          <span><strong>배경음악</strong><small>{enabled ? "음악이 켜져 있어요" : "음악이 꺼져 있어요"}</small></span>
        </div>
        <button
      type="button"
      className="background-music-button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={label}
      title={label}
    >
          <span className="background-music-switch-knob" />
        </button>
      </div>
      <label htmlFor={sliderId} className="background-music-volume">
        <span className="sr-only">배경음악 볼륨</span>
        <Volume2 aria-hidden="true" />
        <input id={sliderId} type="range" min="0" max="100" step="0.5" value={percent}
          style={{ backgroundImage: `linear-gradient(to right, var(--music-accent) 0% ${percent}%, var(--music-track) ${percent}% 100%)` }}
          aria-valuetext={`${percent}%`} onChange={event => setVolume(Number(event.target.value) / 100)} />
        <span className="background-music-percent" aria-hidden="true">{percent}%</span>
      </label>
    </div>
  );
}
