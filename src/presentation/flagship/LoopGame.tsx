import {useEffect,useRef,useState} from 'react';
import {LOOP_PATTERNS,rhythmScore,type ExpeditionSnapshot} from '../../domain/flagship';
import type {ExpeditionAction} from './MapGame';
function note(context:AudioContext,index:number,when=context.currentTime){const o=context.createOscillator(),g=context.createGain();o.type=index%2?'triangle':'sine';o.frequency.setValueAtTime(140+index*90,when);g.gain.setValueAtTime(.12,when);g.gain.exponentialRampToValueAtTime(.001,when+.12);o.connect(g);g.connect(context.destination);o.start(when);o.stop(when+.14);}
export function LoopGame({snapshot:s,send,disabled}:{snapshot:ExpeditionSnapshot;send:ExpeditionAction;disabled:boolean}){
 const index=Math.max(0,s.groups.findIndex(g=>g.id===s.groupId)),pattern=LOOP_PATTERNS[index%4],me=s.groups[index];
 const [sound,setSound]=useState(false),[beat,setBeat]=useState(0),[recording,setRecording]=useState(false),[time,setTime]=useState(-2400),[taps,setTaps]=useState<number[]>([]),[confirmed,setConfirmed]=useState(false),[audioError,setAudioError]=useState('');
 const offset=useRef(0),context=useRef<AudioContext|null>(null),start=useRef(0),latest=useRef({s,sound,disabled,recording});latest.current={s,sound,disabled,recording};
 useEffect(()=>{offset.current=s.serverTime-Date.now();},[s.serverTime]);
 useEffect(()=>()=>{void context.current?.close();},[]);
 useEffect(()=>{let last=-1;const timer=setInterval(()=>{const c=latest.current;if(c.disabled||document.hidden){if(c.recording)setRecording(false);return;}
  const recordingTime=performance.now()-start.current,clock=c.recording?recordingTime:Date.now()+offset.current-c.s.startedAt;
  const step=((Math.floor(clock/600)%8)+8)%8;setBeat(step);
  if(c.recording){setTime(recordingTime);if(recordingTime>=4800)setRecording(false);}
  if(c.sound&&context.current&&step!==last){if(c.recording)note(context.current,step===0?4:0);else c.s.groups.forEach((g,i)=>{if(g.loop[step])note(context.current!,i);});}last=step;
 },40);return()=>clearInterval(timer);},[]);
 const enableAudio=async()=>{try{if(!context.current)context.current=new AudioContext();await context.current.resume();setSound(true);setAudioError('');return true;}catch{setSound(false);setAudioError('소리를 켜지 못했어요. 소리 없이도 불빛을 보고 박자를 기록할 수 있어요.');return false;}};
 const score=rhythmScore(taps,pattern),loop=Array.from({length:8},(_,i)=>taps.some(t=>Math.round(t/600)===i)?1:0);
 return <><p>우리 모둠의 불이 켜진 박자에 발 디딤·손뼉·작은 팔 동작을 연결해요. 한 사람은 박자 버튼을 맡고 다음 시도에 교대해요.</p><div className="flagship-city" aria-label="모둠의 리듬 발전 도시">{s.groups.map((g,i)=><div key={g.id} className={g.done?'lit':''} style={{height:80+(i%3)*25}}><span>{g.name}</span><i>{g.loop.length?'♫':'·'}</i></div>)}</div>
 <div className="flagship-beats" aria-label="8박자 패턴">{pattern.map((v,i)=><span key={i} className={`${v?'on':''} ${beat===i?'current':''}`}>{i+1}{v?' ●':' ·'}</span>)}</div>
 <p>●에서 움직임과 입력, ·에서 쉬어요. 100 BPM · 8박자</p><button disabled={disabled} onClick={()=>{if(sound)setSound(false);else void enableAudio();}}>리듬 소리 {sound?'끄기':'켜기'}</button>
 {audioError&&<p role="status">{audioError}</p>}
 <button disabled={disabled||recording} onClick={async()=>{await enableAudio();setTaps([]);setConfirmed(false);setTime(-2400);start.current=performance.now()+2400;setRecording(true);}}>4박 준비 후 박자 기록</button><p role="status">{recording?(time<0?`준비 ${Math.ceil(-time/600)}`:`기록 중 ${Math.min(8,Math.floor(time/600)+1)} / 8`):taps.length?`입력 맞음 ${score.hits}/${score.expected} · 박자 정확도 ${score.accuracy}%`:'모둠의 동작을 먼저 연습한 뒤 기록해요.'}</p>
 {!recording&&taps.length>0&&<p>입력 시점: {taps.map(t=>Math.round(t)).join(' · ')} ms (첫 박자부터)</p>}
 <button className="flagship-tap" disabled={disabled||!recording||time<0} onClick={()=>{const t=performance.now()-start.current;if(t>=0&&t<4800)setTaps(old=>old.length<24?[...old,t]:old);}}>박자 입력 · 손뼉/동작 후 누르기</button>
 <label className="flagship-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>모둠이 몸으로 리듬을 표현했고 다음에는 역할을 바꿔요.</span></label><button disabled={disabled||recording||!confirmed||!taps.length} onClick={()=>void send('loop',{taps,loop,quality:score.accuracy,movementConfirmed:true})}>우리 리듬을 도시에 연결</button><p>박자 입력의 시간만 계산해요. 몸 동작은 모둠·교사가 확인하며 음성이나 마이크 소리를 녹음하지 않아요. 50% 이상이면 다음 관문에 기여하고 다시 연습해 바꿀 수 있어요.</p><p className="flagship-progress">연결된 모둠 {s.groups.filter(g=>g.done).length} / {s.groups.length} · 우리 모둠 {me.quality}%</p></>;
}
