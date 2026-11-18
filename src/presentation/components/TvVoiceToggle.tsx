import {useState} from 'react';
import type {TvVoice} from '../../application/useTvVoice';
import './TvVoiceToggle.css';

/**
 * TV 화면의 🔊/🔇 음성 안내 단추. 누르면 켜기·끄기가 바뀌고, 옆의 ⚙로 속도·크기·목소리 확인을 고른다.
 * 이 기기가 음성 안내를 못 하면 그렇게 알려 주고, 게임은 소리 없이 그대로 진행한다.
 */
export function TvVoiceToggle({voice,className}:{voice:TvVoice;className?:string}){
 const [open,setOpen]=useState(false);
 const {prefs,status}=voice;
 const unsupported=status==='unsupported'||status==='no-korean';
 const on=prefs.on&&!unsupported;
 return <div className={`tv-voice${className?` ${className}`:''}`} data-open={open||undefined}>
  <button type="button" className="tv-voice-toggle" aria-pressed={on} disabled={unsupported}
   title={unsupported?'이 기기는 음성 안내를 지원하지 않아요':on?'음성 안내 끄기':'음성 안내 켜기'}
   onClick={()=>voice.setPrefs({...prefs,on:!prefs.on})}>
   <span aria-hidden="true">{on?'🔊':'🔇'}</span> 음성 안내 {on?'켜짐':'꺼짐'}
  </button>
  <button type="button" className="tv-voice-more" aria-expanded={open} aria-label="음성 안내 설정" onClick={()=>setOpen(o=>!o)}>⚙</button>
  {open&&<div className="tv-voice-panel" role="group" aria-label="음성 안내 설정">
   {unsupported?<p className="tv-voice-note" role="note">이 기기는 음성 안내를 지원하지 않아요. 화면 신호만으로 그대로 진행돼요.</p>:<>
    <fieldset><legend>빠르기</legend>
     {(['normal','slow'] as const).map(r=><label key={r}><input type="radio" name="tv-voice-rate" checked={prefs.rate===r} onChange={()=>voice.setPrefs({...prefs,rate:r})}/>{r==='normal'?'보통':'느리게'}</label>)}
    </fieldset>
    <fieldset><legend>크기</legend>
     {(['normal','soft'] as const).map(v=><label key={v}><input type="radio" name="tv-voice-volume" checked={prefs.volume===v} onChange={()=>voice.setPrefs({...prefs,volume:v})}/>{v==='normal'?'보통':'작게'}</label>)}
    </fieldset>
    <button type="button" className="tv-voice-test" onClick={()=>voice.test()}>🔈 목소리 확인</button>
    <p className="tv-voice-note">신호·깜짝 이벤트·마지막 10초·결과를 읽어 줘요. 일시정지하면 멈춰요.</p>
   </>}
  </div>}
 </div>;
}
