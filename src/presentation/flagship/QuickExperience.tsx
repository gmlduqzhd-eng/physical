import {useCallback,useEffect,useRef,useState} from 'react';
import {MAP_GESTURES,mapBrief,mapAgreement,type MapGesture} from '../../domain/cooperativeMap';
import {initialShip,shipStep,STATIONS,STATION_NAMES,rhythmScore,type Station} from '../../domain/flagship';
import {type ExperienceId} from '../../domain/playRecipes';
import '../PlayExperiences.css';

export function QuickExperience({kind}:{kind:ExperienceId}){
 return <section className="quick-experience" aria-label="점수 없는 원리 체험"><p className="simulation-label">시뮬레이션 · 실제 수업·학생 기록·센서와 연결되지 않아요.</p>
  {kind==='map'?<MapExperience/>:kind==='ship'?<ShipExperience/>:<LoopExperience/>}
 </section>;
}
function MapExperience(){
 const [role,setRole]=useState(0),[seed,setSeed]=useState(8),[station,setStation]=useState<Station|null>(null),[gesture,setGesture]=useState<MapGesture|null>(null),[result,setResult]=useState<string>(''),[won,setWon]=useState(false);
 const brief=mapBrief(role,3,seed);
 return <><h3>세 모둠의 단서를 연결해 첫 관문을 열어요</h3><p>아래 모둠은 체험용 역할이에요. 하나씩 눌러 서로 다른 정보를 확인해요.</p><div className="flagship-row">{['첫 길 탐사단','도착지 연결단','운반 약속 설계단'].map((name,i)=><button key={name} aria-pressed={role===i} onClick={()=>setRole(i)}>{name}</button>)}</div><p className="map-secret" role="status">{brief.text}</p>
  <fieldset><legend>첫 길</legend><div className="flagship-row">{STATIONS.map(s=><button key={s} aria-pressed={station===s} disabled={won} onClick={()=>setStation(s)}>{STATION_NAMES[s]}</button>)}</div></fieldset>
  <fieldset><legend>첫 관문의 운반 약속</legend><div className="flagship-row">{MAP_GESTURES.map(g=><button key={g.id} aria-pressed={gesture===g.id} disabled={won} onClick={()=>setGesture(g.id)}><span aria-hidden="true">{g.icon}</span>{g.label}</button>)}</div></fieldset>
  <button className="primary" disabled={!station||!gesture||won} onClick={()=>{const ok=mapAgreement(station!,gesture!,0,seed);setWon(ok);setResult(ok?'길과 운반 약속이 연결됐어요. 첫 관문 개방!':'아직 단서가 맞지 않아요. 첫 길과 첫 관문 약속을 다시 물어봐요.');}}>두 정보를 합쳐 관문 열기</button>
  <div className="experience-gate" data-open={won} aria-label={won?'첫 관문 열림':'첫 관문 닫힘'}>{won?'◇ → ✦':'◇ · ◇'}</div><p role="status">{result}</p>{won&&<button onClick={()=>{setSeed(s=>s+1);setStation(null);setGesture(null);setWon(false);setResult('다른 길로 바뀌었어요. 세 단서를 다시 연결해요.');}}>다른 길로 한 번 더</button>}
 </>;
}
const TRIAL_TARGET={x:67,y:60};
function ShipExperience(){
 const [ship,setShip]=useState(initialShip),[x,setX]=useState(0),[y,setY]=useState(0),[running,setRunning]=useState(false),[touched,setTouched]=useState([false,false]);
 const inputs=useRef({x,y});inputs.current={x,y};const won=ship.checkpoint===1;
 useEffect(()=>{if(!running||won)return;let last=performance.now();const timer=setInterval(()=>{const now=performance.now(),dt=now-last;last=now;if(!document.hidden)setShip(s=>shipStep(s,inputs.current.x,inputs.current.y,dt,{radius:10,drag:.22,gain:26,speed:18},[TRIAL_TARGET]));},40);const hide=()=>{if(document.hidden){setRunning(false);setX(0);setY(0);}};document.addEventListener('visibilitychange',hide);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',hide);};},[running,won]);
 return <><h3>서로 다른 두 방향을 합쳐 정거장에 멈춰요</h3><p>한 방향만 움직이면 정거장에 닿기 어려워요. 체험에서는 한 사람이 두 가상 조종자를 바꾸어 맡아요.</p>
  <svg className="experience-ship" viewBox="0 0 100 100" role="img" aria-label={won?'정거장 도착':'두 축 신호로 움직이는 체험 우주선'}><circle cx="67" cy="60" r="10" fill="var(--forest-tint)" stroke="var(--forest-accent)"/><text x="67" y="62" textAnchor="middle" fill="var(--forest-ink)" fontSize="6">기지</text><path d={`M${ship.x} ${ship.y-4} l-4 7 h8 Z`} fill="var(--forest-accent)"/></svg>
  <label>가상 조종자 A · 좌우<input aria-label="가상 조종자 A 좌우" type="range" min="-1" max="1" step=".1" value={x} disabled={won} onChange={e=>{setX(Number(e.target.value));setTouched(t=>[true,t[1]]);}}/></label>
  <label>가상 조종자 B · 위아래<input aria-label="가상 조종자 B 위아래" type="range" min="-1" max="1" step=".1" value={y} disabled={won} onChange={e=>{setY(Number(e.target.value));setTouched(t=>[t[0],true]);}}/></label>
  <div className="flagship-row"><button className="primary" disabled={won} onClick={()=>setRunning(v=>!v)}>{running?'잠깐 멈추기':'두 신호로 조종 시작'}</button><button disabled={won} onClick={()=>{setX(0);setY(0);}}>두 신호 중립으로</button></div>
  <p role="status">{won?'기지에 멈췄어요! 서로의 입력이 하나의 움직임을 만들었어요.':touched.every(Boolean)?'정거장 근처에서는 두 신호를 0으로 줄여요.':'A와 B의 신호를 모두 바꾸어 보세요.'}</p><button onClick={()=>{setShip(initialShip());setX(0);setY(0);setRunning(false);setTouched([false,false]);}}>다시 조종해 보기</button>
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
