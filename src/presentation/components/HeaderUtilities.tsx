import { MonitorCog, Music2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TextScaleButton, TvModeButton } from './DisplayButtons';
import { useDisplayPrefs } from '../../application/displayPrefs';
import { useId, useRef, useState } from 'react';
import { HeaderPopover } from './HeaderPopover';
import { BackgroundMusicButton } from './BackgroundMusicButton';
import { useBackgroundMusic } from '../../application/BackgroundMusicContext';
import { LinkShareButton } from './LinkShareButton';
import './HeaderUtilities.css';

export function HeaderUtilities() {
  const [musicOpen, setMusicOpen] = useState(false);
  const musicTrigger = useRef<HTMLButtonElement>(null);
  const musicId = useId();
  const music = useBackgroundMusic();
  // 화면 보기: 글씨 크기와 교실 TV 모드. 이 기기에만 저장한다.
  const [displayOpen, setDisplayOpen] = useState(false);
  const displayTrigger = useRef<HTMLButtonElement>(null);
  const displayId = useId();
  const display = useDisplayPrefs();
  const displayOn = display.tvMode || display.textScale !== 'normal';
  // 꺼져 있을 때는 한 번 눌러 바로 켜고, 소리 크기를 고칠 수 있게 설정도 함께 연다.
  // 켜 두었는데 브라우저가 소리를 막았으면(새로고침 직후 등) 누르는 순간 다시 낸다.
  const openMusic = () => { if (music.blocked) { music.resume(); return; } if (!music.enabled && !musicOpen) music.toggle(); setMusicOpen(!musicOpen); };
  const musicLabel = music.blocked ? '음악 다시 켜기' : music.enabled ? '음악 설정 (켜져 있어요)' : '음악 켜기';
  return <div className="header-utilities header-tools">
    <div className="home-tools">
      <button ref={musicTrigger} type="button" className="music-trigger" title={musicLabel} aria-label={musicLabel} data-music={music.blocked ? 'blocked' : music.enabled ? 'on' : 'off'} aria-expanded={musicOpen} aria-controls={musicOpen ? musicId : undefined} onClick={openMusic}><Music2 aria-hidden="true"/><span>{music.blocked ? '음악 다시 켜기' : music.enabled ? '음악 설정' : '음악 켜기'}</span></button>
      <HeaderPopover open={musicOpen} onClose={() => setMusicOpen(false)} anchor={musicTrigger} id={musicId} label="음악 설정" className="header-music-popover"><BackgroundMusicButton/></HeaderPopover>
    </div>
    <div className="home-tools">
      <button ref={displayTrigger} type="button" className="icon-toolbar-action display-trigger" title="화면 보기 설정" aria-label="화면 보기 설정 (글씨 크기 · TV 모드)" data-display={displayOn ? 'on' : 'off'} aria-expanded={displayOpen} aria-controls={displayOpen ? displayId : undefined} onClick={() => setDisplayOpen(!displayOpen)}><MonitorCog aria-hidden="true"/><span>화면 보기</span></button>
      <HeaderPopover open={displayOpen} onClose={() => setDisplayOpen(false)} anchor={displayTrigger} id={displayId} label="화면 보기 설정" className="header-display-popover">
        <div className="header-display-panel"><p>교실 뒤에서도 잘 보이게 맞춰요.</p><TextScaleButton/><TvModeButton/><Link to="/display-check" onClick={() => setDisplayOpen(false)}>뒤에서 보여요? 확인하기 →</Link></div>
      </HeaderPopover>
    </div>
    <LinkShareButton/>
  </div>;
}
