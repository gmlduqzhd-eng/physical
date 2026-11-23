import { useRef } from 'react';
import { X } from 'lucide-react';
import './IntroVideo.css';

/** 소개 영상 파일(public/media). 영상 안에 자막이 이미 들어 있다. */
const INTRO_VIDEO = { src: '/media/intro.mp4', poster: '/media/intro-poster.jpg', length: '4:11' } as const;

/**
 * 처음 화면 '무엇을 할까요?' 옆의 소개 영상.
 * 넓은 화면은 썸네일 카드, 폰은 버튼 한 줄(폰은 주로 학생이 들어오는 화면이라 작게 둔다).
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
    <button type="button" className="intro-video-card" onClick={open} aria-haspopup="dialog" aria-controls="intro-video-dialog" data-intro-video="card">
      <span className="intro-video-poster"><img src={INTRO_VIDEO.poster} alt="" width={1280} height={720} loading="lazy" decoding="async"/><span className="intro-video-play" aria-hidden="true"/><span className="intro-video-time">{INTRO_VIDEO.length}</span></span>
      <span className="intro-video-label">▶ 처음이라면? 4분 소개 영상</span>
    </button>
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
