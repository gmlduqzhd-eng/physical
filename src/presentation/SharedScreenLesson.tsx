import {useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {SCREEN_LESSONS,SCREEN_ROUND_MS,sharedScreenCue,type ScreenLessonId} from '../domain/sharedScreen';
import {useBackgroundMusic} from '../application/BackgroundMusicContext';
import {MovePictogram} from './components/MovePictogram';
import './PlayExperiences.css';

type ScreenPhase='intro'|'countdown'|'playing'|'between'|'finished';
export function SharedScreenLesson(){
 const [params,setParams]=useSearchParams(),requested=SCREEN_LESSONS.find(l=>l.id===params.get('lesson'))?.id??'signals';
 const [lesson,setLesson]=useState<ScreenLessonId>(requested),[phase,setPhase]=useState<ScreenPhase>('intro'),[checked,setChecked]=useState(false),[seated,setSeated]=useState(false),[voice,setVoice]=useState(false),[paused,setPaused]=useState(false),[round,setRound]=useState(0),[elapsed,setElapsed]=useState(0),[presenting,setPresenting]=useState(false),[message,setMessage]=useState('');
 const root=useRef<HTMLElement>(null),transition=useRef(false),{suppress}=useBackgroundMusic();
 const meta=SCREEN_LESSONS.find(l=>l.id===lesson)!,cue=sharedScreenCue(lesson,round,elapsed,seated),live=phase==='playing'||phase==='countdown';
 useEffect(()=>{suppress(live);return()=>suppress(false);},[live,suppress]);
 useEffect(()=>{const hide=()=>{if(document.hidden){setPaused(true);window.speechSynthesis?.cancel();}},escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setPresenting(false);},fs=()=>setPresenting(document.fullscreenElement===root.current);document.addEventListener('visibilitychange',hide);document.addEventListener('keydown',escape);document.addEventListener('fullscreenchange',fs);return()=>{document.removeEventListener('visibilitychange',hide);document.removeEventListener('keydown',escape);document.removeEventListener('fullscreenchange',fs);window.speechSynthesis?.cancel();};},[]);
 useEffect(()=>{if(!live||paused)return;let last=performance.now();const timer=setInterval(()=>{const now=performance.now(),delta=now-last;last=now;if(!document.hidden)setElapsed(n=>Math.min(phase==='countdown'?3000:SCREEN_ROUND_MS,n+delta));},80);return()=>clearInterval(timer);},[live,phase,paused]);
 useEffect(()=>{if(paused)return;if(phase==='countdown'&&elapsed>=3000){setElapsed(0);setPhase('playing');}if(phase==='playing'&&elapsed>=SCREEN_ROUND_MS){setElapsed(0);setPhase(round===2?'finished':'between');}},[elapsed,phase,paused,round]);
 useEffect(()=>{if(!voice||phase!=='playing'||paused||document.hidden||!window.speechSynthesis)return;window.speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(cue.title);speech.lang='ko-KR';window.speechSynthesis.speak(speech);return()=>window.speechSynthesis?.cancel();},[cue.title,voice,phase,paused]);
 const start=()=>{if(!checked||transition.current)return;transition.current=true;setPaused(false);setElapsed(0);setPhase('countdown');queueMicrotask(()=>{transition.current=false;});};
 const fullscreen=async()=>{if(presenting){if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});setPresenting(false);return;}try{await root.current?.requestFullscreen();}catch{setMessage('브라우저 전체화면 대신 발표용 화면으로 넓혔어요.');}setPresenting(true);};
 const reset=()=>{setPhase('intro');setRound(0);setElapsed(0);setPaused(false);setChecked(false);};
 return <FlowShell utilities><section ref={root} className={`play-experiences shared-screen ${presenting?'screen-presentation':''}`} aria-label="공용 화면 몸 놀이">
  <div className="screen-toolbar"><p className="eyebrow">공용 화면 한 대 · 개별 학생 입장 없음</p><button onClick={()=>void fullscreen()}>{presenting?'일반 화면으로':'발표용 전체화면'}</button></div><h1>{meta.title}</h1><p>수업방·명단·점수·개인 기록을 만들지 않아요. 학생 번호·별명을 받는 기존 PIN·QR 수업과 별개인 공용 화면 진행입니다.</p>
  {phase==='intro'?<section className="screen-intro"><h2>학생은 기기 없이 함께해요</h2><label>놀이 고르기<select value={lesson} onChange={e=>{const id=e.target.value as ScreenLessonId;setLesson(id);setChecked(false);setParams({lesson:id},{replace:true});}}>{SCREEN_LESSONS.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select></label><p>{meta.goal}</p><p>{meta.role}</p><p>기기를 고정하고 서로 닿지 않는 공간에서 작은 동작으로 해요. 불편하면 멈추거나 쉬어도 좋아요.</p><label><input type="checkbox" checked={seated} onChange={e=>setSeated(e.target.checked)}/>앉은 동작으로 안내</label><label><input type="checkbox" checked={voice} disabled={!('speechSynthesis' in window)} onChange={e=>setVoice(e.target.checked)}/>신호를 음성으로도 읽기</label><label className="flagship-check"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>주변 공간·기기 거치·편한 참여 방법을 확인했어요.</label><button className="primary" disabled={!checked} onClick={start}>함께 시작하기</button><p>한 라운드는 20초이며, 다음 라운드는 진행자가 준비를 확인한 뒤 시작해요.</p></section>:<section className="screen-activity" aria-live="off">
   <p>{round+1}/3라운드 · {seated?'앉은 작은 동작':'편한 크기의 동작'}</p>
   {phase==='countdown'?<><h2>주변을 보고 준비해요</h2><strong className="screen-symbol">{Math.max(1,Math.ceil((3000-elapsed)/1000))}</strong></>:phase==='playing'?<><div className="screen-figure" data-active={cue.active}><MovePictogram move={cue.move} className="screen-pictogram"/><span className="screen-badge" aria-hidden="true">{cue.symbol}</span></div><h2 className="screen-cue">{cue.title}</h2><p className="screen-instruction">{cue.instruction}</p><progress value={elapsed} max={SCREEN_ROUND_MS} aria-label="이번 라운드 안내 시간"/></>:phase==='between'?<><h2>신호를 주고받는 역할을 바꿔요</h2><p>진행자가 준비·공간·쉬고 싶은 친구를 확인해 주세요. 시간이 지난 것이 동작 성공을 뜻하지는 않아요.</p><button className="primary" onClick={()=>{setRound(n=>n+1);start();}}>다음 라운드 준비됐어요</button></>:<><h2>세 번의 신호를 함께 나눴어요</h2><p>친구의 어떤 신호가 도움이 됐나요? 이 화면은 안내만 진행했으며 신체 수행을 측정하지 않았어요.</p><button className="primary" onClick={reset}>다른 놀이로 다시 준비</button><Link to="/try/map">모둠 협동 원리도 체험하기 →</Link></>}
   {live&&<button onClick={()=>setPaused(v=>!v)}>{paused?'계속하기':'잠깐 멈추기'}</button>}{paused&&live&&<p role="status">안내 시간과 음성을 멈췄어요. 준비되면 계속하기를 눌러요.</p>}<button onClick={reset}>놀이를 멈추고 준비로</button>
  </section>}
  <p role="status">{message}</p><details className="screen-print-guide"><summary>진행 안내와 인쇄</summary><ol><li>TV·PC 화면을 고정하고 안전한 개인 공간을 정해요.</li><li>시작 신호를 함께 보고 작은 동작으로 참여해요.</li><li>라운드 사이에 역할·편안함을 확인하고 교대해요.</li><li>화면 없이도 같은 규칙을 구호·박자로 진행할 수 있어요.</li></ol><button onClick={()=>window.print()}>진행 안내 인쇄</button></details>
 </section></FlowShell>;
}
