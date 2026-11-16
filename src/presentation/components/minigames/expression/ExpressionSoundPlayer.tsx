import {useEffect,useRef,useState} from 'react';
import {sfxBeat,sfxSoundColor,sfxWhistle,unlockAudio} from '../../../../application/soundEffects';
import type {ExpressionSound} from './expressionClarity';

const TONE_LABEL={drop:'물방울',drum:'북',wind:'바람',rain:'비',thunder:'천둥',sun:'햇살'} as const;
/**
 * 표현 활동에 앱이 직접 내는 소리. 음원이나 영상 없이도 박자·신호에 맞춰 할 수 있게 한다.
 * beat: 단계마다 정한 빠르기의 박자 · freeze: 박자가 멈추면 얼음 · tones: 단계마다 다른 소리 색깔.
 * 단계가 바뀌면 호루라기를 한 번 분다.
 */
export function ExpressionSoundPlayer({sound,step,running}:{sound:ExpressionSound;step:number;running:boolean}){
 const [on,setOn]=useState(true),[pulse,setPulse]=useState(0),[frozen,setFrozen]=useState(false),[hidden,setHidden]=useState(()=>typeof document!=='undefined'&&document.hidden);
 // 다른 탭이나 화면을 보는 동안에는 소리를 내지 않는다.
 useEffect(()=>{const sync=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',sync);return()=>document.removeEventListener('visibilitychange',sync);},[]);
 const playing=on&&running&&!hidden;
 const lastStep=useRef(step);
 useEffect(()=>{if(step!==lastStep.current){lastStep.current=step;if(playing)sfxWhistle();}},[step,playing]);
 useEffect(()=>{
  if(!playing){setFrozen(false);return;}
  let beat=0,timer:ReturnType<typeof setTimeout>;
  if(sound.kind==='tones'){
   const kind=sound.tones[Math.min(step,sound.tones.length-1)];
   const play=()=>{sfxSoundColor(kind);setPulse(p=>p+1);timer=setTimeout(play,kind==='thunder'||kind==='sun'?3200:kind==='drum'?1400:1800);};
   play();return()=>clearTimeout(timer);
  }
  const bpm=sound.kind==='beat'?sound.bpm[Math.min(step,sound.bpm.length-1)]:sound.bpm,gap=60000/bpm;
  // 얼음 놀이: 6~10초 박자를 낸 뒤 3초 쉬고, 다시 이어 간다.
  const hold=sound.kind==='freeze'&&sound.holdStep===step;
  let until=sound.kind==='freeze'?performance.now()+6000+Math.random()*4000:Infinity,silentUntil=hold?performance.now()+5000:0;
  if(hold)setFrozen(true);
  const tick=()=>{
   const now=performance.now();
   if(sound.kind==='freeze'){
    if(now>=until&&!silentUntil){silentUntil=now+3000;setFrozen(true);}
    if(silentUntil&&now>=silentUntil){silentUntil=0;until=now+6000+Math.random()*4000;setFrozen(false);}
   }
   if(!silentUntil){sfxBeat(beat%4===0);setPulse(p=>p+1);beat++;}
   timer=setTimeout(tick,gap);
  };
  tick();return()=>{clearTimeout(timer);setFrozen(false);};
 },[playing,sound,step]);
 const label=sound.kind==='tones'?`${TONE_LABEL[sound.tones[Math.min(step,sound.tones.length-1)]]} 소리`:sound.kind==='beat'?`박자 ${sound.bpm[Math.min(step,sound.bpm.length-1)]}`:frozen?'멈춤! 얼음':`박자 ${sound.bpm} · 소리가 멈추면 얼음`;
 return <div className="expression-sound" data-frozen={frozen?'yes':'no'}>
  <span className="expression-sound-dot" key={pulse} aria-hidden="true"/>
  <strong>{label}</strong>
  {sound.kind==='freeze'&&<span className="expression-sound-sr" role="status">{frozen?'멈춤! 얼음':''}</span>}
  <button type="button" aria-pressed={on} onClick={()=>{unlockAudio();setOn(!on);}}>{on?'소리 끄기':'소리 켜기'}</button>
  <small>앱이 내는 {sound.kind==='tones'?'소리':'박자 소리'}예요. 단계가 바뀌면 호루라기가 울려요.</small>
 </div>;
}
