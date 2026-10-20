import { Music2 } from 'lucide-react';
import { BackgroundMusicButton } from './BackgroundMusicButton';
import { LinkShareButton } from './LinkShareButton';
import { AppInstallButton } from './AppInstallButton';
import './HeaderUtilities.css';

export function HeaderUtilities() {
  return <div className="header-utilities header-tools">
    <details className="home-tools">
      <summary><Music2 aria-hidden="true"/>음악</summary>
      <div className="tools-panel"><BackgroundMusicButton/></div>
    </details>
    <LinkShareButton/>
    <AppInstallButton/>
  </div>;
}
