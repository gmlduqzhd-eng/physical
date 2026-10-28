import { Music2 } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { HeaderPopover } from './HeaderPopover';
import { BackgroundMusicButton } from './BackgroundMusicButton';
import { LinkShareButton } from './LinkShareButton';
import { AppInstallButton } from './AppInstallButton';
import './HeaderUtilities.css';

export function HeaderUtilities() {
  const [musicOpen, setMusicOpen] = useState(false);
  const musicTrigger = useRef<HTMLButtonElement>(null);
  const musicId = useId();
  return <div className="header-utilities header-tools">
    <div className="home-tools">
      <button ref={musicTrigger} type="button" className="music-trigger" title="음악" aria-label="음악" aria-expanded={musicOpen} aria-controls={musicOpen ? musicId : undefined} onClick={() => setMusicOpen(!musicOpen)}><Music2 aria-hidden="true"/><span>음악</span></button>
      <HeaderPopover open={musicOpen} onClose={() => setMusicOpen(false)} anchor={musicTrigger} id={musicId} label="음악 설정" className="header-music-popover"><BackgroundMusicButton/></HeaderPopover>
    </div>
    <LinkShareButton/>
    <AppInstallButton/>
  </div>;
}
