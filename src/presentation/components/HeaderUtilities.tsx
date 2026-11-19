import { Music2 } from 'lucide-react';
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
  // 꺼져 있을 때는 한 번 눌러 바로 켜고, 소리 크기를 고칠 수 있게 설정도 함께 연다.
  const openMusic = () => { if (!music.enabled && !musicOpen) music.toggle(); setMusicOpen(!musicOpen); };
  const musicLabel = music.enabled ? '음악 설정 (켜져 있어요)' : '음악 켜기';
  return <div className="header-utilities header-tools">
    <div className="home-tools">
      <button ref={musicTrigger} type="button" className="music-trigger" title={musicLabel} aria-label={musicLabel} data-music={music.enabled ? 'on' : 'off'} aria-expanded={musicOpen} aria-controls={musicOpen ? musicId : undefined} onClick={openMusic}><Music2 aria-hidden="true"/><span>{music.enabled ? '음악 설정' : '음악 켜기'}</span></button>
      <HeaderPopover open={musicOpen} onClose={() => setMusicOpen(false)} anchor={musicTrigger} id={musicId} label="음악 설정" className="header-music-popover"><BackgroundMusicButton/></HeaderPopover>
    </div>
    <LinkShareButton/>
  </div>;
}
