import { useRef } from 'react';
import { X } from 'lucide-react';
import './IntroVideo.css';

/** 소개 영상 파일(public/media). 영상 안에 자막이 이미 들어 있다. */
const INTRO_VIDEO = { src: '/media/intro.mp4', poster: '/media/intro-poster.jpg' } as const;

/**
 * 처음 화면 하늘 배너 안의 '처음이라면? 소개 영상' 버튼.
 * 누르면 큰 창에서 재생하고, 닫으면 멈춘다. 영상은 누르기 전에는 받지 않는다(preload="none").
 */
export function IntroVideo() {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const open = () => {
    dialog.current?.showModal();
    void video.current?.play().catch(() => { /* 자동 재생이 막히면 재생 버튼을 누르면 된다. */ });
  };
  return <>
    <button type="button" className="entry-chip intro-video-link" onClick={open} aria-haspopup="dialog" aria-controls="intro-video-dialog" data-intro-video="link">▶ 처음이라면? 소개 영상 (4분)</button>
    <dialog id="intro-video-dialog" ref={dialog} className="intro-video-dialog" aria-label="땀방울 원정대 소개 영상"
      onClose={() => video.current?.pause()}
      onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <div className="intro-video-frame">
        <video ref={video} src={INTRO_VIDEO.src} poster={INTRO_VIDEO.poster} controls playsInline preload="none" width={1920} height={1080}/>
        <button type="button" className="intro-video-close" aria-label="소개 영상 닫기" onClick={() => dialog.current?.close()}><X aria-hidden="true"/></button>
      </div>
    </dialog>
  </>;
}
