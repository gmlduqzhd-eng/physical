import {LayoutDiagram} from '../../LayoutDiagram';
import {ActivityCueControls} from '../common/ActivityCueControls';
import {StartLabel} from '../../StartLabel';
import {useActivityPause} from '../../../../application/ActivityPauseContext';
import {paceExpeditionSteps} from '../../../../domain/fourthGameRules';
import {ActivityProgress} from '../common/ActivityProgress';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {ExpeditionSpec} from '../../../../domain/expeditionGames';
import {SOLO_ROLE,createExpeditionRound,expeditionRuleCard,checkExpeditionAnswer,expeditionScore,expeditionBingo,validateExpeditionRecord,type ExpeditionRecord,type ExpeditionRound} from '../../../../domain/expeditionRules';
import {isRevampedExpedition,paceExpedition,expeditionRehearsal} from '../../../../domain/expeditionRevamps';
import type {GameResultDetails} from '../../../../domain/gameResultDetails';
import {useVoiceCoach} from '../../../../application/useVoiceCoach';
import {useAudio} from '../../../../application/useAudio';
import {ExpeditionDemo} from './ExpeditionDemo';
import './ExpeditionActivity.css';
import '../common/GameWordCue.css';
import {stickyTopBottom} from '../../../stickyTop';

interface Props { game:ExpeditionSpec;groupId:string;solo:boolean;enqueueAction:(action:{payload:{id:string;amount:number;details:GameResultDetails}})=>void; }
type Phase='ready'|'tutorial'|'countdown'|'preview'|'active'|'record';
const fourPlayers=new Set(['T01','T02','T07','T21','T22','T24','T33','T35','T36','T38','T40','T42','T44']);
const expeditionMinimumPlayers=(game:ExpeditionSpec)=>game.spec[0]==='T'?(fourPlayers.has(game.spec)?4:2):game.players;

export function ExpeditionActivity({game,groupId,solo,enqueueAction}:Props){
  const classroomPaused=useActivityPause();
  const [pace,setPace]=useState(1),[compact,setCompact]=useState(false);
  const revamped=isRevampedExpedition(game.id);
  const [resumeAvailable,setResumeAvailable]=useState(false),[resetRequested,setResetRequested]=useState(false);
  const [gentle,setGentle]=useState(false),[alternative,setAlternative]=useState(false),[practicing,setPracticing]=useState(false);
  const [practicePlan,setPracticePlan]=useState<ExpeditionRound>();
  const [detailOpen,setDetailOpen]=useState(false),[seed,setSeed]=useState(0);
  const [phase,setPhase]=useState<Phase>('ready');
  const [classroomPlayers,setPlayers]=useState(game.players);
  const players=solo?game.players:classroomPlayers;
  const [plans,setPlans]=useState<ExpeditionRound[]>([]);
  const [round,setRound]=useState(0),[step,setStep]=useState(0);
  // E6: draft the rounds once per start so the ready-screen demo shows the route that is really played.
  // A memory round keeps its own demo so the secret order is not revealed in advance.
  const drafted=useMemo(()=>{void seed;return Array.from({length:game.rounds},(_,i)=>createExpeditionRound(game,i,players));},[game,players,seed]);
  const demo=useMemo(()=>{const real=drafted[Math.min(round,drafted.length-1)];return real.secret?createExpeditionRound(game,round,players):real;},[drafted,round,game,players]);
  const [seconds,setSeconds]=useState(0),[beat,setBeat]=useState(0),[paused,setPaused]=useState(false),[sound,setSound]=useState(true);
  const [records,setRecords]=useState<ExpeditionRecord[]>([]);
  const [participants,setParticipants]=useState<number[]>([]),[checks,setChecks]=useState<string[]>([]),[counts,setCounts]=useState<string[]>([]),[answer,setAnswer]=useState<string[]>([]);
  const [source,setSource]=useState<'self-report'|'peer-report'>('self-report');
  const [revealed,setRevealed]=useState(false),[error,setError]=useState(''),[arrivals,setArrivals]=useState<(number|null)[]>([]);
  const rules=useMemo(()=>expeditionRuleCard(game.desc),[game.desc]);
  const saving=useRef(false);
  const remaining=useRef(0),elapsed=useRef(0),last=useRef(0),completed=useRef(false);
  const {speak,stop}=useVoiceCoach();const {playBeep}=useAudio();
  const sectionRef=useRef<HTMLElement>(null);
  // 하는 중에는 지금 할 지시가 화면 맨 위에 오게 하고, 그 밖의 단계는 처음부터 읽게 맨 위로 올린다.
  useEffect(()=>{
    const now=['active','countdown','preview'].includes(phase)?sectionRef.current?.querySelector('.expedition-now'):null;
    if(now&&typeof now.scrollIntoView==='function'){now.scrollIntoView({block:'start'});window.scrollBy(0,-(stickyTopBottom()+8));}else window.scrollTo(0,0);
  },[phase,round]);
  const plan=(practicing?practicePlan:plans[round])!,current=plan?.steps[step];
  const resetRecord=useCallback((next:ExpeditionRound)=>{setParticipants([]);setChecks([]);setCounts(next.targets.map(()=>''));setAnswer(next.allocation?next.allocation.labels.map(()=>''):[]);setArrivals(Array(players).fill(null));setRevealed(false);setError('');setDetailOpen(false);},[players]);
  const beginRound=useCallback((index:number,all:ExpeditionRound[])=>{
    elapsed.current=0;remaining.current=all[index].secret?Math.max(5,all[index].secret!.length*2):3;setSeconds(remaining.current);setRound(index);setStep(0);setBeat(0);setPaused(false);resetRecord(all[index]);setPhase(all[index].secret?'preview':'countdown');
  },[resetRecord]);
  const start=()=>{setResumeAvailable(false);setResetRequested(false);completed.current=false;const all=paceExpeditionSteps(paceExpedition(drafted,revamped&&gentle),pace);setSeed(n=>n+1);setPlans(all);setRecords([]);if(revamped&&gentle){setPracticePlan(expeditionRehearsal(all[0]));setPracticing(true);setPhase('tutorial');}else{setPracticing(false);beginRound(0,all);}};
  const stopActivity=()=>{if(phase!=='active'||paused)return;elapsed.current+=Math.max(0,performance.now()-last.current);last.current=performance.now();stop();setPhase('record');};

  useEffect(()=>{
    if(!['countdown','preview','active'].includes(phase)||paused||classroomPaused||!plan)return;
    last.current=performance.now();
    const timer=setInterval(()=>{
      const now=performance.now(),delta=Math.max(0,now-last.current);last.current=now;
      remaining.current=Math.max(0,Math.round((remaining.current-delta/1000)*1000)/1000);
      setSeconds(Math.ceil(remaining.current));
      if(phase==='active'){
        elapsed.current+=delta;
        const duration=current.seconds;
        setBeat(Math.floor((duration-remaining.current)/(duration/((current.bars??1)*8)))%8);
      }
      if(remaining.current>0)return;
      if(phase==='preview'||phase==='countdown'){
        remaining.current=plan.steps[0].seconds;setStep(0);setSeconds(Math.ceil(remaining.current));setPhase('active');
      }else if(step+1<plan.steps.length){
        remaining.current=plan.steps[step+1].seconds;setSeconds(Math.ceil(remaining.current));setStep(step+1);setBeat(0);
      }else{stop();setPhase('record');}
    },100);
    return()=>clearInterval(timer);
  },[phase,paused,plan,current,step,game.bpm,stop,revamped,gentle,classroomPaused]);
  useEffect(()=>{
    const onVisibility=()=>{if(document.hidden&&phase!=='ready'&&phase!=='record'){setPaused(true);stop();}};
    document.addEventListener('visibilitychange',onVisibility);return()=>document.removeEventListener('visibilitychange',onVisibility);
  },[phase,stop]);
  useEffect(()=>{if(!sound||paused||classroomPaused)return;if(phase==='active'&&current)speak(alternative?`${current.instruction} ${game.alternative}`:current.instruction,true);else if(phase==='record')speak('라운드가 끝났어요. 직접 확인한 기록을 입력해 주세요.',true);},[phase,current,paused,sound,speak,alternative,game.alternative,classroomPaused]);
  useEffect(()=>{if(sound&&!paused&&!classroomPaused&&phase==='active'&&current?.beats)playBeep();},[beat,phase,current,sound,paused,playBeep,classroomPaused]);
  useEffect(()=>{if(sound&&!paused&&!classroomPaused&&phase==='active'&&current&&!current.beats)playBeep();},[phase,current,sound,paused,playBeep,classroomPaused]);
  useEffect(()=>()=>stop(),[stop]);

  const toggleNumber=(n:number)=>setParticipants(previous=>previous.includes(n)?previous.filter(x=>x!==n):[...previous,n]);
  const save=(allConfirmed:boolean|'rest'|'observe'|'partial'=false)=>{
    const quiet=allConfirmed==='rest'||allConfirmed==='observe',full=allConfirmed===true;
    if(completed.current||saving.current||!plan||practicing)return;
    if(!quiet&&allConfirmed!=='partial'&&plan.secret&&!revealed){setError('기억해서 수행한 순서를 먼저 기록하고 정답을 확인해 주세요.');return;}
    const record:ExpeditionRecord={round:round+1,kind:plan.kind,source,participants:quiet?[]:full?Array.from({length:players},(_,i)=>i+1):[...participants].sort((a,b)=>a-b),counts:quiet?plan.targets.map(()=>0):full?plan.targets.map(t=>t.goal):counts.map(v=>v.trim()===''?NaN:Number(v)),checks:quiet?[]:full?[...plan.checks]:checks,answer:quiet?[]:[...answer],correct:!quiet&&checkExpeditionAnswer(game,plan,answer,players),outcome:quiet?allConfirmed as 'rest'|'observe':allConfirmed==='partial'?'partial':(full||participants.length===players&&plan.checks.every(c=>checks.includes(c)))&&(!plan.question||checkExpeditionAnswer(game,plan,answer,players))?'complete':'partial',alternative,gentle,elapsedMs:Math.round(elapsed.current),...(plan.timing==='arrival'?{arrivals:arrivals.map(t=>t??-1)}:{})};
    const problem=validateExpeditionRecord(plan,record,players);if(problem){setDetailOpen(true);setError(allConfirmed==='partial'?`아래 세부 기록을 먼저 입력해 주세요. ${problem}`:problem);return;}
    if(!quiet&&plan.timing==='arrival'&&arrivals.some(t=>t===null)){setError('도착하지 않은 번호가 있어요. 다음 라운드에서 다시 시도할 수 있도록 미도착을 직접 확인해 주세요.');return;}
    saving.current=true;const next=[...records.filter(r=>r.round!==record.round),record];setRecords(next);setError('');queueMicrotask(()=>{saving.current=false;});
    if(round+1<plans.length){beginRound(round+1,plans);return;}
    completed.current=true;stop();
    const time=Math.round(next.reduce((sum,r)=>sum+r.elapsedMs,0)/1000);
    const times=next.map(r=>Math.round(r.elapsedMs/100)/10);
    enqueueAction({payload:{id:groupId,amount:expeditionScore(next,plans),details:{completion:next.every(r=>r.outcome==='complete')?'complete':'partial',participation:next.some(r=>r.outcome==='complete'||r.outcome==='partial')?'performed':next.some(r=>r.outcome==='observe')?'observed':'rested',totalTime:time,metrics:{'기록 방식':source==='peer-report'?'짝과 함께 확인해 직접 입력':'스스로 확인해 직접 입력','참여 방식':solo?'혼자 진행을 체험한 기록 · 실제 모둠 참여 미확인':`설정 인원 ${players}명 · 실제 참여 번호는 라운드별 기록 확인`,'라운드':`${next.length}/${plans.length} 기록 · ${next.filter(r=>r.outcome==='rest').length}회 휴식 · ${next.filter(r=>r.outcome==='observe').length}회 관찰`,'라운드별 선택':next.map(r=>`${r.round}차 ${r.alternative?'대체 동작':'기본 동작'} · ${r.gentle?'여유 안내':'기본 안내'}`).join(' / '),...(revamped?{'진행 선택':`${gentle?'여유 있게':'기본 속도'} · ${alternative?'대체 동작':'기본 동작'} · 사전 안내 확인 (연습 선택)`}:{}),...(plan.bingoCells?{'직접 확인한 빙고':`${expeditionBingo(next,plans).lines}줄`}:{}),'점수 기준':'직접 입력한 성공과 화면 문제 비교 · 실제 신체 활동량 미측정',...(game.spec==='S30'?{'왕복 기록':times.map((t,i)=>`${i+1}차 ${t}초`).join(' / '),'기록 간 차이':`${Math.round((Math.max(...times)-Math.min(...times))*10)/10}초 · 속도나 거리 미측정`}:{})},activity:{gameId:game.id,specId:game.spec,soloPreview:solo,rounds:next}}}});
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

  return <section ref={sectionRef} className="expedition-activity" aria-label={game.name} data-expedition={game.spec} data-phase={phase} data-revamped={revamped} data-practice={practicing}>
    <div className="expedition-heading"><span>🧭 {game.name}</span><small>{phase==='ready'?'준비':`${round+1}/${game.rounds} 라운드`}</small></div>
    {phase==='record'&&<ActivityProgress steps={plans.map(p=>p.title)} current={round} results={records.map((r,i)=>r.outcome==='rest'?'rest':r.outcome==='observe'?'observe':r.outcome==='partial'?'partial':r.correct&&r.counts.every((n,j)=>n>=(plans[i]?.targets[j]?.goal??0))&&plans[i]?.checks.every(c=>r.checks.includes(c))?'complete':'partial')}/>}
    {phase==='ready'?<>
      <section className="expedition-rules" aria-label="3줄 규칙">
        <p><b>무엇을</b>{rules.what}</p>
        <p><b>성공</b>{rules.success}</p>
        <p><b>준비물</b>{game.equipment.join(' · ')}</p>
      </section>
      {resumeAvailable?<section className="activity-brief"><p>{records.length}개 기록을 그대로 두고, 지금 라운드부터 참여 방법을 바꿀 수 있어요.</p><button className="expedition-primary" onClick={()=>{const updated=plans.map((old,i)=>i<round?old:paceExpeditionSteps(paceExpedition([createExpeditionRound(game,i,players)],revamped&&gentle),pace)[0]);setPlans(updated);setResumeAvailable(false);beginRound(round,updated);}}>기록 유지 · 지금 라운드 이어 하기</button><label><input type="checkbox" checked={resetRequested} onChange={e=>setResetRequested(e.target.checked)}/>기록을 지우고 처음부터 새 원정을 시작할게요.</label><button disabled={!resetRequested} onClick={start}>기존 진행 지우고 새 원정</button></section>:<button className="expedition-primary" onClick={start}><StartLabel sub="원정"/></button>}
      {!compact&&<ExpeditionDemo steps={demo.steps.map(s=>s.title)} roles={demo.roles}/>}
      {!solo&&<label>참여 인원<select disabled={resumeAvailable} aria-label="참여 인원" value={players} onChange={e=>setPlayers(Number(e.target.value))}>{Array.from({length:(game.spec[0]==='T'?4:game.players)-expeditionMinimumPlayers(game)+1},(_,i)=>i+expeditionMinimumPlayers(game)).map(n=><option key={n} value={n}>{n}명</option>)}</select></label>}
      {solo&&players>1&&<p className="expedition-note">혼자 해보기에서는 여러 역할의 진행을 미리 겪어 봐요. 번호 확인은 실제로 모둠 친구가 참여했다는 자동 확인이 아니에요.</p>}
      {revamped&&<fieldset><legend>우리에게 맞는 방법</legend><button aria-pressed={gentle} onClick={()=>setGentle(!gentle)}>여유 있게 · 먼저 연습 {gentle?'켜짐':'꺼짐'}</button><button aria-pressed={alternative} onClick={()=>setAlternative(!alternative)}>쉬운 동작 {alternative?'켜짐':'꺼짐'}</button><p>{alternative?game.alternative:gentle?'신호를 천천히 주고, 시작 전에 8초 연습을 해요.':'원래 규칙과 역할로 바로 시작해요.'}</p></fieldset>}
      <details><summary>준비물·안전·쉬운 동작</summary><p>{game.equipment.join(' · ')} · {game.space}</p><p>{game.safety}</p><p>{game.alternative}</p><p>기기는 통로 밖에 세워 두고 몸으로 놀이해요. 라운드가 끝나면 한 일을 직접 기록해요.</p></details>
      <details className="activity-brief"><summary>공간 배치 그림</summary><div className="activity-role-cards">{game.equipment.map((tool,i)=><p key={i}><strong>준비 {i+1}</strong>{tool}</p>)}</div><p>활동 장소: {game.space}</p><LayoutDiagram activity={game.id}/><p>선생님이 출발·활동·돌아올 자리를 정해요. 기기는 다니는 길 밖에 둬요.</p></details>
      <ActivityCueControls pace={pace} compact={compact} onPace={setPace} onCompact={setCompact} paceDisabled={false}/>
    </>:phase==='tutorial'?<div className="expedition-signal">
      <h2>먼저 8초만 연습해요</h2><ol><li>기기를 세워 두고 준비물을 놓아요.</li><li>{plans[0].steps[0].instruction}</li><li>신호가 끝나면 돌아와 직접 기록해요. 실수해도 다시 참여해요.</li></ol>
      <p>이번 목표: {plans[0].targets.map(t=>`${t.label} ${t.goal}`).join(' · ')||'표시된 시간과 역할을 비교하기'}</p><p>{game.safety}</p>
      <button className="expedition-primary" onClick={()=>beginRound(0,[practicePlan!])}>점수 없는 연습 시작</button><button onClick={()=>{setPracticing(false);beginRound(0,plans);}}>연습 없이 첫 라운드로</button>
    </div>:<>
      {phase==='preview'&&<div className="expedition-signal expedition-now"><h3 className="expedition-now-label">이 순서를 기억해요 · {seconds}초 뒤 가려져요</h3><ol className="expedition-pattern">{plan.secret!.map((item,i)=><li key={i}>{i+1}. {item}</li>)}</ol><p>기기는 두고 실제 표식으로 걸어가요.</p></div>}
      {phase==='countdown'&&<div className="expedition-signal expedition-now"><h3>{plan.steps[0]?.title??plan.title}</h3><p>주변을 보고 준비해요</p><strong className="expedition-timer">{seconds}</strong></div>}
      {phase==='active'&&<>
        {plan.wordCue&&<div className="expedition-signal expedition-now expedition-word"><p className="expedition-word-rule">이번 규칙: <b>{plan.wordCue.rule}</b></p><strong className="game-word-cue" data-game-color="expedition-word" style={{color:plan.wordCue.color}}>{plan.wordCue.text}</strong></div>}
        <div className="expedition-signal expedition-now" role="status" aria-live="polite">
          {current.beats?<strong className="expedition-beat expedition-big">{current.beats[beat]}{alternative&&' (쉬운 동작: 양팔 번갈아)'}</strong>:plan.wordCue?null:<h3 className="expedition-big">{current.title}</h3>}
          {current.reveal&&current.seconds-seconds>=current.reveal.after&&<strong className="expedition-big expedition-reveal">{current.reveal.text}</strong>}
          <p>{current.hint??current.instruction}</p>{alternative&&<small>쉬운 동작: {game.alternative}</small>}
          {current.beats&&<div className="expedition-beats" aria-hidden="true">{Array.from({length:8},(_,i)=><span key={i} className={i===beat?'selected':''}>{i+1}</span>)}</div>}
          {plan.roles.some(role=>!role.endsWith(SOLO_ROLE))&&<ul className="expedition-now-roles" aria-label="지금 맡은 역할">{plan.roles.map(role=><li key={role}>{role}</li>)}</ul>}
          <p className="expedition-now-meta"><span>{step+1}/{plan.steps.length}</span>{plan.timing==='estimate'?<span>시간은 가려져 있어요. 느낌으로 해 봐요.</span>:<span className="expedition-timer">{plan.timing?Math.floor(elapsed.current/1000):seconds}<small>초</small></span>}</p>
        </div>
        {plan.timing==='arrival'?<div className="expedition-participants">{arrivals.map((t,i)=><button key={i} disabled={paused||t!==null} onClick={()=>arrival(i)}>관찰자: {i+1}번 {t===null?'도착 확인':`${Math.round(t/100)/10}초 도착`}</button>)}</div>:plan.timing&&<button className="expedition-primary expedition-arrive" disabled={paused} onClick={stopActivity}>{plan.timing==='estimate'?'지금 끝내기':'도착!'}</button>}
        {plan.board&&<div className="expedition-board" role="img" aria-label="실제 바닥 코스를 위한 안내 지도">{Array.from({length:16},(_,i)=><span key={i} data-blocked={plan.board!.blocked.includes(i)}>{i===plan.board!.start?'출발':i===plan.board!.destination?'도착':plan.board!.blocked.includes(i)?'금지 ×':`${Math.floor(i/4)+1}-${i%4+1}`}</span>)}</div>}
        {plan.bingoCells&&<div><p>직접 확인한 빙고: {expeditionBingo(records,plans).lines}줄</p><div className="expedition-bingo">{Array.from({length:9},(_,i)=><span key={i} data-active={plan.bingoCells!.includes(i)}>{i+1} {expeditionBingo(records,plans).cells.includes(i)?'✓':''}</span>)}</div></div>}
      </>}
      {phase!=='active'&&phase!=='countdown'&&phase!=='preview'&&<div className="expedition-round-title"><h2>{plan.title}</h2></div>}
      <details className="expedition-roles"><summary>이번 라운드 역할 · {plan.roles.length}명</summary><ul>{plan.roles.map(role=><li key={role}>{role}</li>)}</ul><p>번호는 이 게임에서 역할을 나누려고 붙인 번호예요. {source==='peer-report'?'짝과 함께 확인해 기록해요.':'직접 확인해 기록해요.'} 센서나 카메라는 쓰지 않아요.</p></details>
      {records.length>0&&phase!=='active'&&<p className="activity-brief">앞 라운드에서 확인한 횟수: {records.at(-1)!.counts.join(' · ')||'화면 문제·역할 확인'} · 어려우면 쉬운 동작을 골라도 돼요.</p>}
      {phase!=='record'&&<div className="expedition-controls"><button aria-pressed={paused} onClick={()=>{setPaused(!paused);stop();}}>{paused?'계속하기':'일시정지'}</button><button aria-pressed={!sound} onClick={()=>{setSound(!sound);stop();}}>{sound?'소리 끄기':'소리 켜기'}</button><button onClick={()=>{stop();setPaused(false);setResumeAvailable(!practicing);setPhase('ready');}}>기록 유지하고 참여 방법 바꾸기</button></div>}
      {paused&&<p role="status" className="expedition-note">잠시 멈췄어요. 주변을 확인한 뒤 계속하기를 눌러 주세요.</p>}
      {phase==='record'&&practicing&&<div className="expedition-record"><h3>연습을 마쳤어요</h3><p>내 공간과 도구가 준비됐나요? 어려우면 준비 화면에서 대체 동작을 골라도 돼요. 연습은 기록과 점수에 넣지 않아요.</p><button onClick={()=>{setPracticing(false);setPhase('ready');}}>준비 다시 하기</button><button className="expedition-primary" onClick={()=>{setPracticing(false);beginRound(0,plans);}}>첫 작전 시작</button></div>}
      {phase==='record'&&!practicing&&<div className="expedition-record">
        <h3>라운드가 끝났어요. 한 일을 확인해요.</h3><p>시간이 끝난 것과 동작을 해낸 것은 달라요. 실제로 본 것만 기록해요. 못 한 부분은 다음 라운드에서 다시 해요.</p>
        {plan.secret&&revealed&&<div className="expedition-note"><strong>공개한 정답: {plan.secret.join(' → ')}</strong><p>{checkExpeditionAnswer(game,plan,answer,players)?'기록한 순서가 같아요.':'기록한 순서와 달라요. 다음 라운드에서 다시 시도해요.'}</p></div>}
        {plan.question&&<fieldset><legend>{plan.question.prompt}</legend><p aria-live="polite">기록: {answer.join(' → ')||'아직 입력하지 않았어요.'}</p><div className="expedition-choices">{plan.question.options.map(option=><button key={option} disabled={revealed||(plan.kind==='unique'&&answer.includes(option))} onClick={()=>addAnswer(option)}>{option}</button>)}</div><button disabled={revealed} onClick={()=>setAnswer([])}>기록 지우기</button></fieldset>}
        {plan.secret&&!revealed&&<button className="expedition-primary" disabled={answer.length!==plan.question!.answer.length} onClick={()=>setRevealed(true)}>정답 확인</button>}
        {plan.allocation&&<fieldset><legend>직접 확인한 섬별 인원</legend>{plan.allocation.labels.map((label,i)=><label key={label}>{label}<input aria-label={label+' 인원'} type="number" min={0} max={players} value={answer[i]||''} onChange={e=>setAnswer(previous=>previous.map((v,j)=>i===j?e.target.value:v))}/></label>)}</fieldset>}
        {plan.timing&&<p>앱에 기록한 시간: {Math.round(elapsed.current/100)/10}초{plan.timing==='estimate'&&` · 목표 ${plan.targetSeconds}초 · 차이 ${Math.round(Math.abs(elapsed.current/1000-plan.targetSeconds!)*10)/10}초`}. 실제 거리·속도·운동량은 측정하지 않았어요.</p>}
        {plan.timing==='arrival'&&arrivals.some(t=>t===null)&&<button onClick={()=>setArrivals(previous=>previous.map(t=>t===null?-1:t))}>미도착 번호를 확인하고 다음에 다시 시도</button>}
        {revamped&&<div className="expedition-note"><strong>직접 확인할 목표</strong><ul>{plan.targets.map(t=><li key={t.label}>{t.label}: {t.goal}회</li>)}{plan.checks.map(c=><li key={c}>{c}</li>)}</ul><p>{solo?'혼자 겪어 본 모든 역할과':'모두의 참여와'} 위 목표를 모두 확인했다면 한 번에 기록할 수 있어요. 일부만 성공했으면 세부 기록을 입력해요. 화면 문제 답과 도착 기록은 별도로 확인해요.</p><button className="expedition-primary" onClick={()=>save(true)}>모든 목표와 역할을 직접 확인했어요</button></div>}
        <details open={!revamped||detailOpen} onToggle={e=>setDetailOpen(e.currentTarget.open)}><summary>세부 기록 직접 입력 · 일부 성공도 기록</summary>
        {plan.targets.map((target,i)=><label key={target.label}>{target.label} (0~{target.goal})<input aria-label={target.label} type="number" inputMode="numeric" min={0} max={target.goal} value={counts[i]||''} onChange={e=>setCounts(previous=>previous.map((v,j)=>i===j?e.target.value:v))}/></label>)}
        <fieldset><legend>{solo&&players>1?'체험에서 진행한 역할 번호':'실제로 참여한 번호'}</legend><div className="expedition-participants">{Array.from({length:players},(_,i)=>i+1).map(n=><button key={n} aria-pressed={participants.includes(n)} onClick={()=>toggleNumber(n)}>{n}번 {participants.includes(n)?'확인 ✓':'확인 전'}</button>)}</div></fieldset>
        {plan.checks.map(check=><label className="expedition-check" key={check}><input type="checkbox" checked={checks.includes(check)} onChange={e=>setChecks(previous=>e.target.checked?[...previous,check]:previous.filter(c=>c!==check))}/>{check}</label>)}
        <label>누가 확인했나요?<select aria-label="기록 확인 방식" value={source} onChange={e=>setSource(e.target.value as typeof source)}><option value="self-report">스스로 확인해 입력</option><option value="peer-report">짝과 함께 확인해 입력</option></select></label>
        <button className="expedition-primary" onClick={()=>save()}>{round+1<plans.length?'기록하고 다음 라운드':'기록하고 원정 마치기'}</button></details>
        <button onClick={()=>save('partial')}>입력한 만큼만 기록 · 일부 성공</button><p className="expedition-note">직접 확인해 입력한 기록이에요. 선생님 인증이나 자동 측정은 아니에요.</p>
        {error&&<p role="alert" className="expedition-error">{error}</p>}
        <button onClick={()=>beginRound(round,plans)}>이번 라운드 다시 하기</button>
      </div>}
    </>}{plan&&!practicing&&phase!=='ready'&&phase!=='tutorial'&&<div className="activity-brief"><button onClick={()=>save('rest')}>이번 라운드 휴식 · 0점 기록</button><button onClick={()=>save('observe')}>이번 라운드 관찰 참여 · 0점 기록</button><p>쉬거나 지켜본 라운드는 한 것으로 세지 않고 다음 라운드로 가요.</p></div>}
  </section>;
}
