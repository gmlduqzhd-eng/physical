import {useEffect,useState} from 'react';
import {STUDENT_ACTIONS} from '../../domain/playRecipes';
import type {FlagshipId} from '../../domain/flagship';
export function StudentActionCue({game,disabled}:{game:FlagshipId;disabled:boolean}){
 const cue=STUDENT_ACTIONS[game],[voice,setVoice]=useState(false);
 useEffect(()=>{if(!voice||disabled||document.hidden||!window.speechSynthesis)return;const speech=new SpeechSynthesisUtterance(cue.text);speech.lang='ko-KR';window.speechSynthesis.cancel();window.speechSynthesis.speak(speech);const hide=()=>{if(document.hidden)window.speechSynthesis.cancel();};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);window.speechSynthesis.cancel();};},[voice,disabled,cue.text]);
 return <section className="student-action-cue" aria-label="한눈에 보는 지금 할 행동"><span aria-hidden="true">{cue.icon}</span><div><h3>{cue.title}</h3><p>{cue.text}</p></div><button disabled={disabled||!('speechSynthesis' in window)} aria-pressed={voice} onClick={()=>setVoice(v=>!v)}>{voice?'짧은 음성 끄기':'짧은 안내 읽기'}</button></section>;
}
