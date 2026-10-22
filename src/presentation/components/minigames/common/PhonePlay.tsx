import {useEffect,useRef,useState} from 'react';
import {phonePlayerRange,phoneRecordValid,phoneSafety,phoneSequence,phoneSetup,phoneTarget,type PhonePlay as Play,type PhoneRecord} from '../../../../domain/phonePlayCatalog';
import type {GameResultDetails} from '../../../../domain/gameResultDetails';
import {sfxTap,unlockAudio} from '../../../../application/soundEffects';
import './PhonePlay.css';
type Phase='intro'|'plan'|'countdown'|'active'|'record'|'done';
interface Props {play:Play;solo:boolean;groupId:string;onExit:()=>void;enqueueAction:(action:{payload:{amount:number;details:GameResultDetails}})=>void}
export function PhonePlay({play:p,solo,onExit,enqueueAction}:Props){
 const range=phonePlayerRange(p);
 const [phase,setPhase]=useState<Phase>('intro'),[round,setRound]=useState(0),[practice,setPractice]=useState(true),[rehearsed,setRehearsed]=useState(false);
 const [players,setPlayers]=useState(solo?1:range.min),[seated,setSeated]=useState(false),[level,setLevel]=useState('기본 방법'),[voice,setVoice]=useState(false),[sound,setSound]=useState(true);
 const [elapsed,setElapsed]=useState(0),[paused,setPaused]=useState(false),[moved,setMoved]=useState(false),[checked,setChecked]=useState(false);
 const [participants,setParticipants]=useState<number[]>([]),[count,setCount]=useState(''),[answer,setAnswer]=useState<string[]>([]),[choice,setChoice]=useState(''),[feeling,setFeeling]=useState('');
 const [records,setRecords]=useState<PhoneRecord[]>([]);
 const submitted=useRef(false),transition=useRef(false);
 const sequence=phoneSequence(p,round,level==='쉬운 방법'),duration=phase==='countdown'?4000:practice?8000:p.kind==='estimate'?60000:p.seconds*1000;
 const cueIndex=Math.floor(elapsed/6000),cue=p.cues[(cueIndex+round)%p.cues.length];
 const displayCue=p.kind==='create'?'정한 움직임을 몸으로 표현해요':p.kind==='team'?'서로의 차례와 신호를 살펴요':p.kind==='decision'?'고른 계획을 몸으로 실행해요':p.kind==='observe'?'작게 움직이고 느낌을 살펴요':cue;
 const options=p.options?Array.from({length:p.options.length},(_,i)=>p.options![(i+round)%p.options!.length]):[];
 const decisionReady=p.kind!=='decision'||choice===p.options?.[0];
 const accurate=p.kind==='memory'?JSON.stringify(answer)===JSON.stringify(sequence):p.kind==='estimate'?Math.abs(elapsed-phoneTarget(round)*1000)<=3500:true;
 const validCount=count===''||/^\d{1,2}$/.test(count);
 const completeReady=moved&&checked&&participants.length===players&&accurate&&(p.kind!=='count'||(/^\d{1,2}$/.test(count)&&Number(count)>0));
 useEffect(()=>{window.scrollTo(0,0);},[phase,round]);
 useEffect(()=>{
  const hide=()=>{if(document.hidden){setPaused(true);window.speechSynthesis?.cancel();}};
  document.addEventListener('visibilitychange',hide);
  return()=>{document.removeEventListener('visibilitychange',hide);window.speechSynthesis?.cancel();};
 },[]);
 useEffect(()=>{
  if(!['active','countdown'].includes(phase)||paused)return;
  let last=performance.now();
  const timer=window.setInterval(()=>{const now=performance.now();const delta=now-last;last=now;if(!document.hidden)setElapsed(n=>Math.min(duration,n+delta));},100);
  return()=>window.clearInterval(timer);
 },[phase,paused,duration]);
 useEffect(()=>{
  if(paused||elapsed<duration)return;
  if(phase==='countdown'){setElapsed(0);setPhase('active');}
  else if(phase==='active'){setPhase('record');window.speechSynthesis?.cancel();}
 },[phase,elapsed,duration,paused]);
 useEffect(()=>{
  if(phase!=='active'||paused||document.hidden)return;
  if(sound)sfxTap();
  if(voice&&p.kind!=='memory'&&p.kind!=='estimate'&&window.speechSynthesis){const text=new SpeechSynthesisUtterance(displayCue+(seated?' 앉은 대안으로 해요.':''));text.lang='ko-KR';window.speechSynthesis.cancel();window.speechSynthesis.speak(text);}
  return()=>window.speechSynthesis?.cancel();
 },[phase,paused,voice,sound,p.kind,displayCue,cueIndex,seated]);
 const resetRecord=()=>{setMoved(false);setChecked(false);setParticipants([]);setAnswer([]);setCount('');};
 const start=(isPractice:boolean)=>{
  if(transition.current||!decisionReady)return;transition.current=true;unlockAudio();resetRecord();setPractice(isPractice);setElapsed(0);setPaused(false);setPhase('countdown');queueMicrotask(()=>{transition.current=false;});
 };
 const save=(outcome:PhoneRecord['outcome'])=>{
  if(transition.current||submitted.current||practice||phase!=='record'||!moved||!participants.length||(outcome==='complete'&&!completeReady))return;
  const record:PhoneRecord={round,outcome,elapsedMs:Math.round(elapsed),count:Number(count)||0,answer,participants,easy:level==='쉬운 방법'};
  if(!phoneRecordValid(p,record,players))return;
  transition.current=true;
  const next=[...records,record];
  if(round<2){setRecords(next);setRound(n=>n+1);setChoice('');setPhase('plan');resetRecord();setElapsed(0);}
  else{
   submitted.current=true;setRecords(next);setPhase('done');
   const amount=next.reduce((total,r)=>total+(r.outcome==='complete'?100:50),0);
   const metrics:Record<string,string>={'놀이 분류':p.category,'참여 방식':solo&&range.min>1?'혼자 규칙 연습':`${players}명 · 스마트폰 1대`,'수행 확인':players>1?'함께한 사람이 직접 확인 · 자동 측정 아님':'본인이 직접 확인 · 자동 측정 아님','참여 동작':`${seated?'앉은 동작':'서서 움직임'} · ${level}`};
   next.forEach(r=>{metrics[`${r.round+1}차 과제`]=`${p.rounds[r.round]} · ${r.outcome==='complete'?'목표 확인':'도전 기록'}${p.kind==='count'?` · 완성 ${r.count}묶음`:''}${p.kind==='memory'?` · 기억 순서 ${r.answer.join(' → ')}`:''}${p.kind==='estimate'?` · 추정 ${(r.elapsedMs/1000).toFixed(1)}초 / 목표 ${phoneTarget(r.round)}초`:''} · 참여 ${r.participants.join(',')}번`;});
   enqueueAction({payload:{amount,details:{metrics,criteria:next.map(r=>p.rounds[r.round]),totalTime:Math.round(next.reduce((n,r)=>n+r.elapsedMs,0)/1000),selfReflection:feeling||undefined}}});
  }
  queueMicrotask(()=>{transition.current=false;});
 };
 return <section className="phone-play" data-phone-play={p.id} data-phase={phase} data-active-ms={Math.floor(elapsed)} aria-label={p.name}>
  <header><p className="pp-eyebrow">준비물 없는 몸 놀이 · {p.category}</p><h1>{p.name}</h1><p>{phase==='intro'?'연습하고 세 가지 과제를 해요.':`${round+1} / 3 과제 · ${practice&&phase!=='plan'?'연습':p.players}`}</p></header>
  {phase==='intro'&&<>
   <p className="pp-lead">{p.goal}</p><div className="pp-badges"><span>약 {p.minutes}분</span><span>{p.intensity} 강도</span><span>{p.players} · {range.min===range.max?range.min:`${range.min}~${range.max}`}명</span><span>스마트폰 1대</span></div>
   <section className="pp-panel"><h2>이렇게 준비해요</h2><p>{phoneSetup(p)}</p><ol>{p.rules.map(rule=><li key={rule}>{rule}</li>)}</ol><p><strong>완료 기준</strong> · {p.check}</p><p>화면 점수는 직접 확인한 참여 기록이에요. 기기가 동작이나 체력을 판정하지 않아요.</p></section>
   <section className="pp-panel"><h2>내게 맞게 골라요</h2>
    {!solo&&range.max>1&&<label>함께할 인원<select value={players} onChange={e=>setPlayers(Number(e.target.value))}>{Array.from({length:range.max-range.min+1},(_,i)=>range.min+i).map(n=><option key={n} value={n}>{n}명</option>)}</select></label>}
    {solo&&range.min>1&&<p className="pp-notice">혼자 규칙을 연습해요. 친구와 한 활동으로 기록되지 않아요. 함께 하려면 활동 목록에서 ‘활동 열기’를 선택해요.</p>}
    <label><input type="checkbox" checked={seated} onChange={e=>setSeated(e.target.checked)}/>앉아서 참여하기</label><p>{seated?p.seated:'서로 닿지 않는 간격에서 움직여요.'}</p>
    <label>도전 방법<select value={level} onChange={e=>setLevel(e.target.value)}><option>쉬운 방법</option><option>기본 방법</option><option>추가 도전</option></select></label><p>{level==='쉬운 방법'?p.easy:level==='추가 도전'?p.hard:p.rules[1]}</p>
    <label><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/>시작·전환 소리</label><label><input type="checkbox" checked={voice} disabled={!('speechSynthesis' in window)} onChange={e=>setVoice(e.target.checked)}/>신호 읽어 주기 (선택)</label><p>소리 없이도 시작 전에 순서를 익히거나 고정된 큰 화면으로 진행할 수 있어요. 짝은 신호를 읽은 뒤 역할을 바꿔요.</p>
   </section><details className="pp-panel"><summary>안전과 역할</summary><ul>{phoneSafety.map(s=><li key={s}>{s}</li>)}</ul><p>모둠에서는 1번부터 돌아가며 이끌고, 나머지 친구도 자기 공간에서 동작을 따라 해요. 탈락이나 오래 기다리기는 없어요.</p></details>
   <button className="pp-primary" onClick={()=>setPhase('plan')}>놀이 방법 익히기</button>
  </>}
  {phase==='plan'&&<>
   <h2>{p.rounds[round]}</h2><p>{seated?p.seated:level==='쉬운 방법'?p.easy:level==='추가 도전'?p.hard:p.rules.join(' ')}</p>
   <section className="pp-panel"><h3>{p.kind==='memory'?'기억할 동작 순서':'이번에 할 동작'}</h3><ol>{sequence.map(c=><li key={c}>{c}</li>)}</ol><p>{p.kind==='memory'?'활동 중에는 순서가 가려져요. 몸으로 해 본 뒤 순서를 기록해요.':p.check}</p>{p.kind==='estimate'&&<strong>목표: {phoneTarget(round)}초 · 먼저 멈춘 뒤 버튼을 눌러요.</strong>}{players>1&&<p>함께할 {players}명 모두 실제로 움직여요. 먼저 이끄는 사람은 {round%players+1}번이에요.</p>}</section>
   {p.kind==='decision'&&<fieldset><legend>안전하게 실행할 계획은?</legend>{options.map(option=><button key={option} aria-pressed={choice===option} onClick={()=>setChoice(option)}>{option}</button>)}{choice&&!decisionReady&&<p role="alert">서로의 통로와 역할을 다시 확인해요. {p.options?.[0]} 계획이 이번 조건에 맞아요.</p>}</fieldset>}
   <p>{rehearsed?'기기는 활동 구역 밖에 놓고 시작해요.':'처음은 8초 연습이에요. 연습에는 점수가 없어요.'}</p>
   <button className="pp-primary" disabled={!decisionReady} onClick={()=>start(!rehearsed)}>{rehearsed?'폰 내려놓고 활동 시작':'짧게 연습하기'}</button>
  </>}
  {(phase==='countdown'||phase==='active')&&<>
   <div className="pp-signal" role="status" aria-live={phase==='countdown'?'polite':'off'}>
    <p>{paused?'잠깐 쉬고 있어요':phase==='countdown'?'기기를 내려놓고 주변을 확인해요':p.rounds[round]}</p>
    <strong>{paused?'일시정지':phase==='countdown'?Math.max(1,Math.ceil((duration-elapsed)/1000)):p.kind==='memory'?'기억한 순서로 몸을 움직여요':p.kind==='estimate'?'걸음으로 시간을 가늠해요':displayCue}</strong>
    <p>{phase==='active'&&p.kind!=='estimate'?`${Math.ceil((duration-elapsed)/1000)}초 남음`:phase==='active'?'시간 표시는 가렸어요.':'4초 뒤 시작해요.'}</p>
   </div><p>{seated?p.seated:p.goal}</p><p>화면 조작 없이 동작에 집중해요.</p>
   {phase==='active'&&p.kind==='estimate'&&!practice&&<button className="pp-primary" disabled={paused||elapsed<1000} onClick={()=>{setPhase('record');window.speechSynthesis?.cancel();}}>멈췄어요 · 시간 확인</button>}
   <button onClick={()=>{setPaused(v=>!v);window.speechSynthesis?.cancel();}}>{paused?'이어서 하기':'잠깐 쉬기'}</button>
  </>}
  {phase==='record'&&(practice?<section className="pp-panel"><h2>연습을 마쳤어요</h2><p>동작과 공간을 확인했나요? 연습은 기록과 점수에 포함되지 않아요.</p><button className="pp-primary" onClick={()=>{setRehearsed(true);setPractice(false);setElapsed(0);setPhase('plan');}}>연습 마치고 첫 과제로</button></section>:<>
   <h2>몸으로 해 본 뒤 확인해요</h2><p>{p.check}</p>
   <label><input type="checkbox" checked={moved} onChange={e=>setMoved(e.target.checked)}/>실제로 몸을 움직였어요</label>
   <fieldset><legend>실제로 참여한 사람</legend>{Array.from({length:players},(_,i)=>i+1).map(n=><label key={n}><input type="checkbox" checked={participants.includes(n)} onChange={e=>setParticipants(list=>e.target.checked?[...list,n].sort((a,b)=>a-b):list.filter(v=>v!==n))}/>{players===1?'나':`${n}번 친구`}</label>)}</fieldset>
   {p.kind==='count'&&<label>완성한 묶음 수 (0~99)<input type="number" inputMode="numeric" min="0" max="99" value={count} onChange={e=>setCount(e.target.value)}/></label>}
   {p.kind==='memory'&&<fieldset><legend>실행한 동작 순서</legend><p aria-live="polite">{answer.length?answer.join(' → '):'동작 순서대로 선택해요.'}</p>{p.cues.map(c=><button key={c} disabled={answer.length>=sequence.length} onClick={()=>setAnswer(a=>[...a,c])}>{c}</button>)}<button onClick={()=>setAnswer([])}>순서 지우기</button>{answer.length===sequence.length&&!accurate&&<p role="alert">기억 순서를 다시 확인하거나 도전 기록으로 남겨요.</p>}</fieldset>}
   {p.kind==='estimate'&&<p>실행 시간: {(elapsed/1000).toFixed(1)}초 · 목표: {phoneTarget(round)}초 · 오차: {(Math.abs(elapsed-phoneTarget(round)*1000)/1000).toFixed(1)}초{!accurate?' · 다시 해 보거나 도전 기록으로 남겨요.':''}</p>}
   <label><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>{p.check} 확인했어요</label>
   {round===2&&<label>오늘의 느낌 (선택)<select value={feeling} onChange={e=>setFeeling(e.target.value)}><option value="">선택하지 않음</option><option>새로운 방법을 해 봤어요</option><option>친구와 맞추는 게 즐거웠어요</option><option>다음에는 더 천천히 해 보고 싶어요</option></select></label>}
   <button className="pp-primary" disabled={!completeReady} onClick={()=>save('complete')}>{round===2?'목표 확인 · 놀이 마치기':'목표 확인 · 다음 과제로'}</button>
   <button disabled={!moved||!participants.length||!validCount} onClick={()=>save('partial')}>{round===2?'도전한 만큼 기록 · 마치기':'도전한 만큼 기록 · 다음 과제로'}</button>
   <button onClick={()=>{setElapsed(0);resetRecord();setPhase('plan');}}>같은 과제 다시 해보기</button><p>목표 확인 100점, 도전 기록 50점이에요. 실제 참여 여부는 직접 확인하며 체력 순위를 뜻하지 않아요.</p>
  </>)}
  {phase==='done'&&<p role="status">세 과제의 참여 기록을 저장했어요.</p>}
  {phase!=='done'&&<button className="pp-exit" onClick={onExit}>활동 목록으로 돌아가기</button>}
 </section>;
}
