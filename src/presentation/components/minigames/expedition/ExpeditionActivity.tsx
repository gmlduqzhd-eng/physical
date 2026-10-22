import {useCallback,useEffect,useRef,useState} from 'react';
import type {ExpeditionSpec} from '../../../../domain/expeditionGames';
import {createExpeditionRound,checkExpeditionAnswer,expeditionScore,expeditionBingo,validateExpeditionRecord,type ExpeditionRecord,type ExpeditionRound} from '../../../../domain/expeditionRules';
import {isRevampedExpedition,paceExpedition,expeditionRehearsal} from '../../../../domain/expeditionRevamps';
import type {GameResultDetails} from '../../../../domain/gameResultDetails';
import {useVoiceCoach} from '../../../../application/useVoiceCoach';
import {useAudio} from '../../../../application/useAudio';
import './ExpeditionActivity.css';

interface Props { game:ExpeditionSpec;groupId:string;solo:boolean;enqueueAction:(action:{payload:{id:string;amount:number;details:GameResultDetails}})=>void; }
type Phase='ready'|'tutorial'|'countdown'|'preview'|'active'|'record';
const fourPlayers=new Set(['T01','T02','T07','T21','T22','T24','T33','T35','T36','T38','T40','T42','T44']);
const expeditionMinimumPlayers=(game:ExpeditionSpec)=>game.spec[0]==='T'?(fourPlayers.has(game.spec)?4:2):game.players;

export function ExpeditionActivity({game,groupId,solo,enqueueAction}:Props){
  const revamped=isRevampedExpedition(game.id);
  const [gentle,setGentle]=useState(false),[alternative,setAlternative]=useState(false),[practicing,setPracticing]=useState(false);
  const [practicePlan,setPracticePlan]=useState<ExpeditionRound>();
  const [phase,setPhase]=useState<Phase>('ready');
  const [classroomPlayers,setPlayers]=useState(game.players);
  const players=solo?game.players:classroomPlayers;
  const [plans,setPlans]=useState<ExpeditionRound[]>([]);
  const [round,setRound]=useState(0),[step,setStep]=useState(0);
  const [seconds,setSeconds]=useState(0),[beat,setBeat]=useState(0),[paused,setPaused]=useState(false),[sound,setSound]=useState(true);
  const [records,setRecords]=useState<ExpeditionRecord[]>([]);
  const [participants,setParticipants]=useState<number[]>([]),[checks,setChecks]=useState<string[]>([]),[counts,setCounts]=useState<string[]>([]),[answer,setAnswer]=useState<string[]>([]);
  const [source,setSource]=useState<'self-report'|'peer-report'>('self-report');
  const [revealed,setRevealed]=useState(false),[error,setError]=useState(''),[arrivals,setArrivals]=useState<(number|null)[]>([]);
  const remaining=useRef(0),elapsed=useRef(0),last=useRef(0),completed=useRef(false);
  const {speak,stop}=useVoiceCoach();const {playBeep}=useAudio();
  useEffect(()=>{window.scrollTo(0,0);},[phase,round]);
  const plan=(practicing?practicePlan:plans[round])!,current=plan?.steps[step];
  const resetRecord=useCallback((next:ExpeditionRound)=>{setParticipants([]);setChecks([]);setCounts(next.targets.map(()=>''));setAnswer(next.allocation?next.allocation.labels.map(()=>''):[]);setArrivals(Array(players).fill(null));setRevealed(false);setError('');},[players]);
  const beginRound=useCallback((index:number,all:ExpeditionRound[])=>{
    elapsed.current=0;remaining.current=all[index].secret?5:3;setSeconds(remaining.current);setRound(index);setStep(0);setBeat(0);setPaused(false);resetRecord(all[index]);setPhase(all[index].secret?'preview':'countdown');
  },[resetRecord]);
  const start=()=>{completed.current=false;const all=paceExpedition(Array.from({length:game.rounds},(_,i)=>createExpeditionRound(game,i,players)),revamped&&gentle);setPlans(all);setRecords([]);if(revamped){setPracticePlan(expeditionRehearsal(all[0]));setPracticing(true);setPhase('tutorial');}else beginRound(0,all);};
  const stopActivity=()=>{if(phase!=='active'||paused)return;elapsed.current+=Math.max(0,performance.now()-last.current);last.current=performance.now();stop();setPhase('record');};

  useEffect(()=>{
    if(!['countdown','preview','active'].includes(phase)||paused||!plan)return;
    last.current=performance.now();
    const timer=setInterval(()=>{
      const now=performance.now(),delta=Math.max(0,now-last.current);last.current=now;
      remaining.current=Math.max(0,Math.round((remaining.current-delta/1000)*1000)/1000);
      setSeconds(Math.ceil(remaining.current));
      if(phase==='active'){
        elapsed.current+=delta;
        const duration=current.seconds;
        setBeat(Math.floor((duration-remaining.current)/(60/((game.bpm||80)/(revamped&&gentle?1.3:1))))%8);
      }
      if(remaining.current>0)return;
      if(phase==='preview'||phase==='countdown'){
        remaining.current=plan.steps[0].seconds;setStep(0);setSeconds(Math.ceil(remaining.current));setPhase('active');
      }else if(step+1<plan.steps.length){
        remaining.current=plan.steps[step+1].seconds;setSeconds(Math.ceil(remaining.current));setStep(step+1);setBeat(0);
      }else{stop();setPhase('record');}
    },100);
    return()=>clearInterval(timer);
  },[phase,paused,plan,current,step,game.bpm,stop,revamped,gentle]);
  useEffect(()=>{
    const onVisibility=()=>{if(document.hidden&&phase!=='ready'&&phase!=='record'){setPaused(true);stop();}};
    document.addEventListener('visibilitychange',onVisibility);return()=>document.removeEventListener('visibilitychange',onVisibility);
  },[phase,stop]);
  useEffect(()=>{if(!sound||paused)return;if(phase==='active'&&current)speak(alternative?game.alternative:current.instruction,true);else if(phase==='record')speak('라운드가 끝났어요. 직접 확인한 기록을 입력해 주세요.',true);},[phase,current,paused,sound,speak,alternative,game.alternative]);
  useEffect(()=>{if(sound&&!paused&&phase==='active'&&current?.beats)playBeep();},[beat,phase,current,sound,paused,playBeep]);
  useEffect(()=>{if(sound&&!paused&&phase==='active'&&current&&!current.beats)playBeep();},[phase,current,sound,paused,playBeep]);
  useEffect(()=>()=>stop(),[stop]);

  const toggleNumber=(n:number)=>setParticipants(previous=>previous.includes(n)?previous.filter(x=>x!==n):[...previous,n]);
  const save=(allConfirmed=false)=>{
    if(completed.current||!plan||practicing)return;
    if(plan.secret&&!revealed){setError('기억해서 수행한 순서를 먼저 기록하고 정답을 확인해 주세요.');return;}
    const record:ExpeditionRecord={round:round+1,kind:plan.kind,source,participants:allConfirmed?Array.from({length:players},(_,i)=>i+1):[...participants].sort((a,b)=>a-b),counts:allConfirmed?plan.targets.map(t=>t.goal):counts.map(v=>v.trim()===''?NaN:Number(v)),checks:allConfirmed?[...plan.checks]:checks,answer:[...answer],correct:checkExpeditionAnswer(game,plan,answer,players),elapsedMs:Math.round(elapsed.current),...(plan.timing==='arrival'?{arrivals:arrivals.map(t=>t??-1)}:{})};
    const problem=validateExpeditionRecord(plan,record,players);if(problem){setError(problem);return;}
    if(plan.timing==='arrival'&&arrivals.some(t=>t===null)){setError('도착하지 않은 번호가 있어요. 다음 라운드에서 다시 시도할 수 있도록 미도착을 직접 확인해 주세요.');return;}
    const next=[...records,record];setRecords(next);setError('');
    if(round+1<plans.length){beginRound(round+1,plans);return;}
    if(game.spec==='T41'&&Array.from({length:players},(_,i)=>i+1).some(n=>new Set(next.filter(r=>r.participants.includes(n)).map(r=>r.kind)).size<2)){setError('각 번호가 서로 다른 두 종류 이상에 참여해야 빙고를 마칠 수 있어요.');return;}
    completed.current=true;stop();
    const time=Math.round(next.reduce((sum,r)=>sum+r.elapsedMs,0)/1000);
    const times=next.map(r=>Math.round(r.elapsedMs/100)/10);
    enqueueAction({payload:{id:groupId,amount:expeditionScore(next,plans),details:{totalTime:time,metrics:{'기록 방식':source==='peer-report'?'짝과 함께 확인해 직접 입력':'스스로 확인해 직접 입력','참여 방식':solo?'혼자 진행을 체험한 기록 · 실제 모둠 참여 미확인':`${players}명 참여 확인 · 직접 입력`,'라운드':`${next.length}/${plans.length} 완료`,...(revamped?{'진행 선택':`${gentle?'여유 있게':'기본 속도'} · ${alternative?'대체 동작':'기본 동작'} · 사전 연습 완료`}:{}),...(plan.bingoCells?{'직접 확인한 빙고':`${expeditionBingo(next,plans).lines}줄`}:{}),'점수 기준':'직접 입력한 성공과 화면 문제 비교 · 실제 신체 활동량 미측정',...(game.spec==='S30'?{'왕복 기록':times.map((t,i)=>`${i+1}차 ${t}초`).join(' / '),'기록 간 차이':`${Math.round((Math.max(...times)-Math.min(...times))*10)/10}초 · 속도나 거리 미측정`}:{})},activity:{gameId:game.id,specId:game.spec,soloPreview:solo,rounds:next}}}});
  };
  const addAnswer=(value:string)=>{
    if(revealed)return;
    const count=plan.kind==='unique'?players:plan.kind==='choice'?1:plan.question!.answer.length;
    if(answer.length>=count)return;
    if(plan.kind==='unique'&&answer.includes(value)){setError('이번 라운드에서 이미 사용한 받기 표식이에요. 다른 표식을 골라 주세요.');return;}
    setError('');setAnswer([...answer,value]);
  };
  const arrival=(index:number)=>{
    if(paused||arrivals[index]!==null)return;
    const next=[...arrivals];next[index]=Math.round(elapsed.current+Math.max(0,performance.now()-last.current));setArrivals(next);
    if(next.every(t=>t!==null))stopActivity();
  };

  return <section className="expedition-activity" aria-label={game.name} data-expedition={game.spec} data-phase={phase} data-revamped={revamped} data-practice={practicing}>
    <div className="expedition-heading"><span>🧭 {game.name}</span><small>{phase==='ready'?'준비':`${round+1}/${game.rounds} 라운드`}</small></div>
    {phase==='ready'?<>
      <p className="expedition-lead">{game.desc}</p>
      {!solo&&<label>참여 인원<select aria-label="참여 인원" value={players} onChange={e=>setPlayers(Number(e.target.value))}>{Array.from({length:(game.spec[0]==='T'?4:game.players)-expeditionMinimumPlayers(game)+1},(_,i)=>i+expeditionMinimumPlayers(game)).map(n=><option key={n} value={n}>{n}명</option>)}</select></label>}
      {solo&&players>1&&<p className="expedition-note">혼자 해보기에서는 여러 역할의 진행을 체험해요. 번호 확인은 실제 모둠원이 참여했다는 자동 인증이 아니에요.</p>}
      <p>기기는 거치하고 몸 활동을 해요. 라운드가 끝난 뒤 수행한 기록을 직접 입력해요.</p>
      <details><summary>준비물·안전·대체 동작</summary><p>{game.equipment.join(' · ')} · {game.space}</p><p>{game.safety}</p><p>{game.alternative}</p></details>
      {revamped&&<fieldset><legend>우리에게 맞는 방법</legend><button aria-pressed={gentle} onClick={()=>setGentle(!gentle)}>여유 있는 안내 {gentle?'켜짐':'꺼짐'}</button><button aria-pressed={alternative} onClick={()=>setAlternative(!alternative)}>대체 동작 {alternative?'켜짐':'꺼짐'}</button><p>{alternative?game.alternative:'원래 규칙과 역할을 유지하고, 먼저 짧게 연습해요.'}</p></fieldset>}
      <button className="expedition-primary" onClick={start}>원정 시작</button>
    </>:phase==='tutorial'?<div className="expedition-signal">
      <h2>먼저 8초만 연습해요</h2><ol><li>기기를 거치하고 준비물을 놓아요.</li><li>{plans[0].steps[0].instruction}</li><li>신호가 끝나면 돌아와 직접 기록해요. 실수해도 다시 참여해요.</li></ol>
      <p>이번 목표: {plans[0].targets.map(t=>`${t.label} ${t.goal}`).join(' · ')||'표시된 시간과 역할을 비교하기'}</p><p>{game.safety}</p>
      <button className="expedition-primary" onClick={()=>beginRound(0,[practicePlan!])}>점수 없는 연습 시작</button>
    </div>:<>
      <div className="expedition-round-title"><h2>{plan.title}</h2><p className="expedition-note">{source==='peer-report'?'짝과 함께 확인한 기록':'직접 확인한 기록'} · 센서나 카메라를 사용하지 않아요.</p></div>
      <details className="expedition-roles" open={phase==='active'}><summary>이번 라운드 역할</summary><ul>{plan.roles.map(role=><li key={role}>{role}</li>)}</ul><p>번호는 이 게임 안에서 역할을 나누기 위한 번호예요.</p></details>
      {phase==='preview'&&<div className="expedition-signal"><h3>기억할 순서 · {seconds}초 뒤 가려져요</h3><ol className="expedition-pattern">{plan.secret!.map((item,i)=><li key={i}>{i+1}. {item}</li>)}</ol><p>기기는 두고 실제 표식으로 이동해요.</p></div>}
      {phase==='countdown'&&<div className="expedition-signal"><h3>주변을 확인하고 준비해요</h3><strong className="expedition-timer">{seconds}</strong></div>}
      {phase==='active'&&<>
        {plan.wordCue&&<div className="expedition-signal"><p>현재 규칙: {plan.wordCue.rule}</p><strong data-game-color="expedition-word" style={{color:plan.wordCue.color,fontSize:48}}>{plan.wordCue.text}</strong><p>글자와 색이 달라요. 현재 규칙을 따라가요.</p></div>}
        {plan.bingoCells&&<div><p>직접 확인한 빙고: {expeditionBingo(records,plans).lines}줄</p><div className="expedition-bingo">{Array.from({length:9},(_,i)=><span key={i} data-active={plan.bingoCells!.includes(i)}>{i+1} {expeditionBingo(records,plans).cells.includes(i)?'✓':''}</span>)}</div></div>}
        {plan.board&&<div className="expedition-board" role="img" aria-label="실제 바닥 코스를 위한 안내 지도">{Array.from({length:16},(_,i)=><span key={i} data-blocked={plan.board!.blocked.includes(i)}>{i===plan.board!.start?'출발':i===plan.board!.destination?'도착':plan.board!.blocked.includes(i)?'금지 ×':`${Math.floor(i/4)+1}-${i%4+1}`}</span>)}</div>}
        <div className="expedition-signal" role="status" aria-live="polite">
          <span>{step+1}/{plan.steps.length} 구간</span><h3>{current.title}</h3><p>{alternative?game.alternative:current.instruction}</p>{alternative&&<small>같은 순서·표식을 대체 동작으로 연결해요.</small>}
          {current.beats&&<><strong className="expedition-beat">{beat+1}박 · {alternative?'양팔 번갈아 움직이기':current.beats[beat]}</strong><div className="expedition-beats" aria-hidden="true">{Array.from({length:8},(_,i)=><span key={i} className={i===beat?'selected':''}>{i+1}</span>)}</div></>}
          {plan.timing==='estimate'?<p>시간 표시는 가려져 있어요. 느낌으로 걸어 보세요.</p>:<strong className="expedition-timer">{plan.timing?Math.floor(elapsed.current/1000):seconds}<small>초</small></strong>}
        </div>
        {plan.timing==='arrival'?<div className="expedition-participants">{arrivals.map((t,i)=><button key={i} disabled={paused||t!==null} onClick={()=>arrival(i)}>{i+1}번 {t===null?'도착 확인':`${Math.round(t/100)/10}초 도착`}</button>)}</div>:plan.timing&&<button className="expedition-primary" disabled={paused} onClick={stopActivity}>{plan.timing==='estimate'?'지금 끝내기':'왕복 도착 기록'}</button>}
      </>}
      {phase!=='record'&&<div className="expedition-controls"><button aria-pressed={paused} onClick={()=>{setPaused(!paused);stop();}}>{paused?'계속하기':'일시정지'}</button><button aria-pressed={!sound} onClick={()=>{setSound(!sound);stop();}}>{sound?'소리 끄기':'소리 켜기'}</button><button onClick={()=>{stop();setPaused(false);setPhase('ready');}}>준비로 돌아가기</button></div>}
      {paused&&<p role="status" className="expedition-note">잠시 멈췄어요. 주변을 확인한 뒤 계속하기를 눌러 주세요.</p>}
      {phase==='record'&&practicing&&<div className="expedition-record"><h3>연습을 마쳤어요</h3><p>내 공간과 도구가 준비됐나요? 어려우면 준비 화면에서 대체 동작을 골라도 돼요. 연습은 기록과 점수에 넣지 않아요.</p><button onClick={()=>{setPracticing(false);setPhase('ready');}}>준비 다시 하기</button><button className="expedition-primary" onClick={()=>{setPracticing(false);beginRound(0,plans);}}>첫 작전 시작</button></div>}
      {phase==='record'&&!practicing&&<div className="expedition-record">
        <h3>라운드가 끝났어요. 수행을 직접 확인해요.</h3><p>시간이 끝난 것과 몸 동작을 성공한 것은 달라요. 실제로 확인한 기록만 입력해요. 실패한 구간은 다음 라운드에서 다시 참여해요.</p>
        {plan.secret&&revealed&&<div className="expedition-note"><strong>공개한 정답: {plan.secret.join(' → ')}</strong><p>{checkExpeditionAnswer(game,plan,answer,players)?'기록한 순서가 같아요.':'기록한 순서와 달라요. 다음 라운드에서 다시 시도해요.'}</p></div>}
        {plan.question&&<fieldset><legend>{plan.question.prompt}</legend><p aria-live="polite">기록: {answer.join(' → ')||'아직 입력하지 않았어요.'}</p><div className="expedition-choices">{plan.question.options.map(option=><button key={option} disabled={revealed||(plan.kind==='unique'&&answer.includes(option))} onClick={()=>addAnswer(option)}>{option}</button>)}</div><button disabled={revealed} onClick={()=>setAnswer([])}>기록 지우기</button></fieldset>}
        {plan.secret&&!revealed&&<button className="expedition-primary" disabled={answer.length!==plan.question!.answer.length} onClick={()=>setRevealed(true)}>정답 확인</button>}
        {plan.allocation&&<fieldset><legend>직접 확인한 섬별 인원</legend>{plan.allocation.labels.map((label,i)=><label key={label}>{label}<input aria-label={label+' 인원'} type="number" min={0} max={players} value={answer[i]||''} onChange={e=>setAnswer(previous=>previous.map((v,j)=>i===j?e.target.value:v))}/></label>)}</fieldset>}
        {plan.timing&&<p>앱에 기록한 시간: {Math.round(elapsed.current/100)/10}초{plan.timing==='estimate'&&` · 목표 ${plan.targetSeconds}초 · 차이 ${Math.round(Math.abs(elapsed.current/1000-plan.targetSeconds!)*10)/10}초`}. 실제 거리·속도·운동량은 측정하지 않았어요.</p>}
        {plan.timing==='arrival'&&arrivals.some(t=>t===null)&&<button onClick={()=>setArrivals(previous=>previous.map(t=>t===null?-1:t))}>미도착 번호를 확인하고 다음에 다시 시도</button>}
        {revamped&&<div className="expedition-note"><strong>직접 확인할 목표</strong><ul>{plan.targets.map(t=><li key={t.label}>{t.label}: {t.goal}회</li>)}{plan.checks.map(c=><li key={c}>{c}</li>)}</ul><p>{solo?'혼자 체험한 모든 역할':'실제 전원 참여'}과 위 목표를 모두 확인했다면 한 번에 신고할 수 있어요. 일부만 성공했으면 세부 기록을 입력해요. 화면 문제 답과 도착 기록은 별도로 확인해요.</p><button className="expedition-primary" onClick={()=>save(true)}>모든 목표와 역할을 직접 확인했어요</button></div>}
        <details open={!revamped}><summary>세부 기록 직접 입력 · 일부 성공도 기록</summary>
        {plan.targets.map((target,i)=><label key={target.label}>{target.label} (0~{target.goal})<input aria-label={target.label} type="number" inputMode="numeric" min={0} max={target.goal} value={counts[i]||''} onChange={e=>setCounts(previous=>previous.map((v,j)=>i===j?e.target.value:v))}/></label>)}
        <fieldset><legend>{solo&&players>1?'체험에서 진행한 역할 번호':'실제로 참여한 번호'}</legend><div className="expedition-participants">{Array.from({length:players},(_,i)=>i+1).map(n=><button key={n} aria-pressed={participants.includes(n)} onClick={()=>toggleNumber(n)}>{n}번 {participants.includes(n)?'확인 ✓':'확인 전'}</button>)}</div></fieldset>
        {plan.checks.map(check=><label className="expedition-check" key={check}><input type="checkbox" checked={checks.includes(check)} onChange={e=>setChecks(previous=>e.target.checked?[...previous,check]:previous.filter(c=>c!==check))}/>{check}</label>)}
        <label>누가 확인했나요?<select aria-label="기록 확인 방식" value={source} onChange={e=>setSource(e.target.value as typeof source)}><option value="self-report">스스로 확인해 입력</option><option value="peer-report">짝과 함께 확인해 입력</option></select></label>
        <button className="expedition-primary" onClick={()=>save()}>{round+1<plans.length?'기록하고 다음 라운드':'기록하고 원정 마치기'}</button></details>
        <p className="expedition-note">입력한 내용은 수행 신고이며, 교사 인증이나 자동 측정 기록이 아니에요.</p>
        {error&&<p role="alert" className="expedition-error">{error}</p>}
        <button onClick={()=>beginRound(round,plans)}>이번 라운드 다시 하기</button>
      </div>}
    </>}
  </section>;
}
