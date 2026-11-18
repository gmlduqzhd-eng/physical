import {useCallback,useEffect,useRef,useState} from 'react';
import {MAP_GESTURES,mapBrief,mapAgreement,type MapGesture} from '../../domain/cooperativeMap';
import {STATIONS,STATION_NAMES,rhythmScore,type Station} from '../../domain/flagship';
import {type ExperienceId} from '../../domain/playRecipes';
import '../PlayExperiences.css';

export function QuickExperience({kind}:{kind:ExperienceId}){
 return <section className="quick-experience" aria-label="점수 없는 원리 체험"><p className="simulation-label">미리 해 보기 · 점수와 기록은 남지 않아요. 혼자 눌러 보며 놀이 방법을 익혀요.</p>
  {kind==='map'?<MapExperience/>:<LoopExperience/>}
 </section>;
}
function MapExperience(){
 const [role,setRole]=useState(0),[seed,setSeed]=useState(8),[station,setStation]=useState<Station|null>(null),[gesture,setGesture]=useState<MapGesture|null>(null),[result,setResult]=useState<string>(''),[won,setWon]=useState(false);
 const brief=mapBrief(role,3,seed);
 return <><h3>세 모둠의 힌트를 모아 첫 문을 열어요</h3><p>아래 모둠을 하나씩 눌러, 모둠마다 다른 힌트를 읽어 봐요.</p><div className="flagship-row">{['첫 길 모둠','마지막 길 모둠','몸짓 약속 모둠'].map((name,i)=><button key={name} aria-pressed={role===i} onClick={()=>setRole(i)}>{name}</button>)}</div><p className="map-secret" role="status">{brief.text}</p>
  <fieldset><legend>첫 길</legend><div className="flagship-row">{STATIONS.map(s=><button key={s} aria-pressed={station===s} disabled={won} onClick={()=>setStation(s)}>{STATION_NAMES[s]}</button>)}</div></fieldset>
  <fieldset><legend>첫 문의 몸짓 약속</legend><div className="flagship-row">{MAP_GESTURES.map(g=><button key={g.id} aria-pressed={gesture===g.id} disabled={won} onClick={()=>setGesture(g.id)}><span aria-hidden="true">{g.icon}</span>{g.label}</button>)}</div></fieldset>
  <button className="primary" disabled={!station||!gesture||won} onClick={()=>{const ok=mapAgreement(station!,gesture!,0,seed);setWon(ok);setResult(ok?'길과 몸짓 약속이 맞았어요. 첫 문이 열렸어요!':'아직 힌트와 맞지 않아요. 첫 길과 첫 문의 몸짓 약속을 다시 물어봐요.');}}>두 힌트를 모아 문 열기</button>
  <div className="experience-gate" data-open={won} aria-label={won?'첫 문 열림':'첫 문 닫힘'}>{won?'◇ → ✦':'◇ · ◇'}</div><p role="status">{result}</p>{won&&<button onClick={()=>{setSeed(s=>s+1);setStation(null);setGesture(null);setWon(false);setResult('다른 길로 바뀌었어요. 세 힌트를 다시 모아요.');}}>다른 길로 한 번 더</button>}
 </>;
}
function LoopExperience(){
 const [recording,setRecording]=useState(false),[elapsed,setElapsed]=useState(-2400),[taps,setTaps]=useState<number[]>([]),[listening,setListening]=useState(false),[audioError,setAudioError]=useState('');
 const start=useRef(0),audio=useRef<AudioContext|null>(null),nodes=useRef<OscillatorNode[]>([]);const pattern=[1,0,1,0,1,0,1,0],other=[0,1,0,1,0,1,0,1],score=rhythmScore(taps,pattern);
 const stop=useCallback(()=>{nodes.current.forEach(n=>{try{n.stop();}catch{/* already ended */}});nodes.current=[];void audio.current?.close();audio.current=null;setListening(false);},[]);
 useEffect(()=>{if(!recording)return;const timer=setInterval(()=>{if(document.hidden){setRecording(false);return;}const ms=performance.now()-start.current;setElapsed(ms);if(ms>=4800)setRecording(false);},40);return()=>clearInterval(timer);},[recording]);
 useEffect(()=>{const hide=()=>{if(document.hidden){setRecording(false);stop();}};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);nodes.current.forEach(n=>{try{n.stop();}catch{/* already ended */}});void audio.current?.close();};},[stop]);
 const play=async()=>{stop();try{const c=new AudioContext();audio.current=c;await c.resume();if(audio.current!==c)return;setListening(true);setAudioError('');const own=Array.from({length:8},(_,i)=>taps.some(t=>Math.round(t/600)===i));for(let i=0;i<8;i++)for(const [on,freq] of [[own[i],220],[other[i],440]] as const){if(!on)continue;const o=c.createOscillator(),gain=c.createGain();o.frequency.value=freq;gain.gain.setValueAtTime(.08,c.currentTime+i*.6);gain.gain.exponentialRampToValueAtTime(.001,c.currentTime+i*.6+.16);o.connect(gain);gain.connect(c.destination);o.start(c.currentTime+i*.6);o.stop(c.currentTime+i*.6+.18);nodes.current.push(o);}const last=nodes.current.at(-1);if(last)last.onended=()=>{if(audio.current===c){setListening(false);void c.close();audio.current=null;nodes.current=[];}};}catch{stop();setAudioError('소리를 켜지 못했어요. 아래 박자 불빛으로도 비교할 수 있어요.');}};
 return <><h3>내 입력과 가상 모둠의 박자를 합쳐 들어요</h3><p>●에서 작은 손뼉·팔 동작을 해 보고 박자 버튼을 눌러요. 동작은 자동 측정하지 않아요.</p><div className="flagship-beats">{pattern.map((v,i)=><span key={i} className={`${v?'on':''} ${recording&&Math.floor(elapsed/600)===i?'current':''}`}>{i+1} {v?'●':'·'}</span>)}</div>
  <button className="primary" disabled={recording} onClick={()=>{stop();setTaps([]);start.current=performance.now()+2400;setElapsed(-2400);setRecording(true);}}>4박 준비 후 8박 체험</button><p role="status">{recording?elapsed<0?`준비 ${Math.ceil(-elapsed/600)}`:`입력 ${Math.min(8,Math.floor(elapsed/600)+1)}/8`:taps.length?`입력 맞음 ${score.hits}/${score.expected} · 입력 정확도 ${score.accuracy}%`:'가상 모둠은 내 박자 사이에 다른 박자를 넣어요.'}</p>
  <button className="flagship-tap" disabled={!recording||elapsed<0} onClick={()=>{const t=performance.now()-start.current;if(t>=0&&t<4800)setTaps(a=>a.length<24?[...a,t]:a);}}>내 박자 입력</button>
  {!recording&&taps.length>0&&<><p>낮은 소리: 내 입력 · 높은 소리: 가상 모둠</p><button onClick={()=>{if(listening)stop();else void play();}}>{listening?'합주 멈추기':'두 모둠의 합주 듣기'}</button></>}<p role="status">{audioError}</p>
 </>;
}
