import {useEffect,useRef,useState} from 'react';
import type {TvVoice} from '../../application/useTvVoice';
import './TvVoiceToggle.css';

/** 글꼴에 따라 ⚙가 ☼처럼 보이는 일이 있어, 톱니바퀴를 그림으로 그린다. */
function GearIcon(){
 return <svg className="tv-voice-gear" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.59-.22l-2.39.96a7 7 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.48-.41h-3.84a.5.5 0 0 0-.47.41l-.36 2.54a7 7 0 0 0-1.62.94l-2.39-.96a.5.5 0 0 0-.59.22L2.74 8.87a.5.5 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54a7 7 0 0 0 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.5.5 0 0 0-.12-.61zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"/>
 </svg>;
}

/**
 * TV 화면의 🔊/🔇 음성 안내 단추. 누르면 켜기·끄기가 바뀌고, 옆의 설정(톱니바퀴)으로 속도·크기·목소리 확인을 고른다.
 * 이 기기가 음성 안내를 못 하면 그렇게 알려 주고, 게임은 소리 없이 그대로 진행한다.
 * 설정 판은 Esc·바깥 누르기로 닫히고, 닫히면 초점이 톱니바퀴 단추로 돌아간다(게임 단축키는 판이 열려 있어도 그대로 동작).
 */
export function TvVoiceToggle({voice,className}:{voice:TvVoice;className?:string}){
 const [open,setOpen]=useState(false);
 const rootRef=useRef<HTMLDivElement>(null),moreRef=useRef<HTMLButtonElement>(null);
 const {prefs,status}=voice;
 // 목소리 목록이 비어 있는 기기(no-voices)는 켜고 끄기는 막되 '목소리 확인'은 남긴다: 소리가 나면 그때부터 쓸 수 있다.
 const noVoices=status==='no-voices';
 const unsupported=status==='unsupported'||status==='no-korean'||noVoices;
 const on=prefs.on&&!unsupported;
 useEffect(()=>{
  if(!open)return;
  const close=(refocus:boolean)=>{setOpen(false);if(refocus)moreRef.current?.focus();};
  // Esc는 이 판만 닫는다(게임 쪽으로 새지 않게 capture 단계에서 멈춘다).
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();close(true);}};
  const onDown=(e:PointerEvent)=>{if(rootRef.current&&!rootRef.current.contains(e.target as Node))close(false);};
  window.addEventListener('keydown',onKey,true);window.addEventListener('pointerdown',onDown,true);
  return ()=>{window.removeEventListener('keydown',onKey,true);window.removeEventListener('pointerdown',onDown,true);};
 },[open]);
 return <div ref={rootRef} className={`tv-voice${className?` ${className}`:''}`} data-open={open||undefined}>
  <button type="button" className="tv-voice-toggle" aria-pressed={on} disabled={unsupported}
   title={unsupported?'이 기기는 음성 안내가 안 돼요':on?'음성 안내 끄기':'음성 안내 켜기'}
   onClick={()=>voice.setPrefs({...prefs,on:!prefs.on})}>
   <span aria-hidden="true">{on?'🔊':'🔇'}</span> <span className="tv-voice-label">음성 안내 {unsupported?'안 돼요':on?'켜짐':'꺼짐'}</span>
  </button>
  <button ref={moreRef} type="button" className="tv-voice-more" aria-expanded={open} aria-label="음성 안내 설정" onClick={()=>setOpen(o=>!o)}><GearIcon/></button>
  {open&&<div className="tv-voice-panel" role="group" aria-label="음성 안내 설정">
   {noVoices?<>
    <p className="tv-voice-note" role="note">이 기기에서 목소리를 찾지 못했어요. 아래 단추를 눌러 소리가 나면 음성 안내를 쓸 수 있어요.</p>
    <button type="button" className="tv-voice-test" onClick={()=>voice.test()}>🔈 목소리 확인</button>
   </>:unsupported?<p className="tv-voice-note" role="note">이 기기는 음성 안내가 안 돼요. 화면 신호만으로 그대로 진행돼요.</p>:<>
    <fieldset><legend>빠르기</legend>
     {(['normal','slow'] as const).map(r=><label key={r}><input type="radio" name="tv-voice-rate" checked={prefs.rate===r} onChange={()=>voice.setPrefs({...prefs,rate:r})}/>{r==='normal'?'보통':'느리게'}</label>)}
    </fieldset>
    <fieldset><legend>크기</legend>
     {(['normal','soft'] as const).map(v=><label key={v}><input type="radio" name="tv-voice-volume" checked={prefs.volume===v} onChange={()=>voice.setPrefs({...prefs,volume:v})}/>{v==='normal'?'보통':'작게'}</label>)}
    </fieldset>
    <button type="button" className="tv-voice-test" onClick={()=>voice.test()}>🔈 목소리 확인</button>
    <p className="tv-voice-name">목소리: {voice.voiceName??'이 기기의 기본 목소리'}</p>
    <a className="tv-voice-link" href="/sound-check" target="_blank" rel="noopener noreferrer">소리 미리듣기(새 창) ↗</a>
    <p className="tv-voice-note">신호·깜짝 이벤트·마지막 10초·결과를 읽어 줘요. 일시정지하면 멈춰요. 닫으려면 Esc나 바깥을 눌러요.</p>
   </>}
  </div>}
 </div>;
}
