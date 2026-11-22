import { Download, Ellipsis, Share2, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TextScaleButton, ThemeButton, TvModeButton, VoiceGuideButton } from './DisplayButtons';
import { useDisplayPrefs } from '../../application/displayPrefs';
import { useId, useRef, useState } from 'react';
import { HeaderPopover } from './HeaderPopover';
import { BackgroundMusicButton } from './BackgroundMusicButton';
import { useBackgroundMusic } from '../../application/BackgroundMusicContext';
import { ShareLinkInput, useLinkShare } from './LinkShareButton';
import { useAppInstall } from './AppInstallButton';
import { TeacherStatusChip } from './TeacherStatusChip';
import './HeaderUtilities.css';

/**
 * 머리말의 '화면·소리' 설정 하나: 글씨 크기, 교실 TV 모드, 밝기, 음성 안내, 배경음악.
 * 이 기기에만 저장한다.
 */
export function HeaderSettings() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const music = useBackgroundMusic();
  const display = useDisplayPrefs();
  const displayOn = display.tvMode || display.textScale !== 'normal';
  // 켜 두었는데 브라우저가 음악을 막았으면(새로고침 직후 등) 누르는 순간 다시 내고, 설정도 함께 연다.
  const toggle = () => { if (music.blocked) music.resume(); setOpen(!open); };
  const label = music.blocked ? '화면·소리 설정 (음악 다시 켜기)' : '화면·소리 설정 (글씨 크기 · TV 모드 · 밝기 · 음성 · 음악)';
  return <div className="home-tools">
    <button ref={trigger} type="button" className="icon-toolbar-action settings-trigger" title={label} aria-label={label} data-display={displayOn ? 'on' : 'off'} data-music={music.blocked ? 'blocked' : music.enabled ? 'on' : 'off'} aria-expanded={open} aria-controls={open ? id : undefined} onClick={toggle}><SlidersHorizontal aria-hidden="true"/><span>화면·소리</span></button>
    <HeaderPopover open={open} onClose={() => setOpen(false)} anchor={trigger} id={id} label="화면·소리 설정" className="header-settings-popover">
      <div className="header-settings-panel">
        <section aria-labelledby={`${id}-screen`}><h3 id={`${id}-screen`}>화면</h3><p>교실 뒤에서도 잘 보이게 맞춰요.</p><TextScaleButton/><TvModeButton/><ThemeButton/><Link to="/display-check" onClick={() => setOpen(false)}>뒤에서 보여요? 확인하기 →</Link></section>
        <section aria-labelledby={`${id}-sound`}><h3 id={`${id}-sound`}>소리</h3><VoiceGuideButton/><BackgroundMusicButton/><Link to="/sound-check" onClick={() => setOpen(false)}>소리 미리 들어 보기 →</Link></section>
      </div>
    </HeaderPopover>
  </div>;
}

/** '⋯ 더보기': 자주 쓰지 않는 링크 공유와 앱 설치. */
export function HeaderMoreMenu() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const share = useLinkShare();
  const app = useAppInstall();
  const close = () => { setOpen(false); share.reset(); };
  return <div className="home-tools">
    <button ref={trigger} type="button" className="icon-toolbar-action more-trigger" title="더보기 (링크 공유 · 앱 설치)" aria-label="더보기 (링크 공유 · 앱 설치)" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => open ? close() : setOpen(true)}><Ellipsis aria-hidden="true"/><span>더보기</span></button>
    <HeaderPopover open={open} onClose={close} anchor={trigger} id={id} label="더보기" className="header-more-popover">
      <div className="header-more-panel">
        <button type="button" onClick={() => void share.shareLink()} disabled={share.sharing}><Share2 aria-hidden="true"/>{share.sharing ? '공유 중' : '링크 공유'}</button>
        {share.shareStatus && <div className="header-share-feedback" role="status"><p>{share.shareStatus}</p>{share.manualCopy && <ShareLinkInput/>}</div>}
        <button type="button" onClick={() => { setOpen(false); void app.install(); }} disabled={app.busy || app.installed}><Download aria-hidden="true"/>{app.label}</button>
      </div>
    </HeaderPopover>
    {app.guide}
  </div>;
}

export function HeaderUtilities() {
  return <div className="header-utilities header-tools">
    <HeaderSettings/>
    <TeacherStatusChip/>
  </div>;
}
