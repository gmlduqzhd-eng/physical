import {ActivityCueControls} from './ActivityCueControls';
import {validPhoneFill} from '../../../../domain/fourthGameRules';
import {StartLabel} from '../../StartLabel';
import {useActivityPause} from '../../../../application/ActivityPauseContext';
import {useEffect,useMemo,useRef,useState} from 'react';
import {phonePlayerRange,phoneRecordValid,phoneSafety,phoneSequence,phoneSetup,phoneTarget,type PhonePlay as Play,type PhoneRecord} from '../../../../domain/phonePlayCatalog';
import type {GameResultDetails} from '../../../../domain/gameResultDetails';
import {sfxTap,unlockAudio} from '../../../../application/soundEffects';
import './PhonePlay.css';
import {ActivityProgress} from './ActivityProgress';
import {phoneTeamMotion,phoneRoles,phoneRoundCues,phoneStrategies,phoneNextHint,type PhoneStrategy} from '../../../../domain/phonePlayProgression';
import {phoneFillOptions,phoneMemoryTask,phoneRoundCheck,phoneObservation,phoneScenario,phoneBundle} from '../../../../domain/phoneTaskRules';
import {PhonePlayIcon} from '../../PhonePlayIcon';
import {PhonePlayClass} from './PhonePlayClass';
import {CLASS_DEFAULT_SECONDS,CLASS_TASK_SECONDS,classMovementSeconds,deviceRuleLine} from '../../../../domain/phoneClassMode';
import {MovementBingoBoard,PhoneRuleCard} from './PhonePlayClass';
import {adaptClassicPlay,fitGroupCues,isClassicPlay} from '../../../../domain/phonePlayClassicsMode';
type Phase='intro'|'plan'|'countdown'|'active'|'record'|'done';
interface Props {play:Play;solo:boolean;groupId:string;onExit:()=>void;enqueueAction:(action:{payload:{amount:number;details:GameResultDetails}})=>void}
export function PhonePlay({play,solo,onExit,enqueueAction}:Props){
 const classroomPaused=useActivityPause();
 const [pace,setPace]=useState(1),[compact,setCompact]=useState(false);
 const range=phonePlayerRange(play);
 const [phase,setPhase]=useState<Phase>('intro'),[round,setRound]=useState(0),[practice,setPractice]=useState(true),[rehearsed,setRehearsed]=useState(false);
 const [players,setPlayers]=useState(solo?1:range.min),[seated,setSeated]=useState(false),[level,setLevel]=useState('기본 방법'),[voice,setVoice]=useState(false),[sound,setSound]=useState(true);
 // 숫자 모둠 만들기는 쉬운 방법·함께하는 인원에 맞춰 과제 제목·자리별 동작·신호가 같은 모둠 크기를 말한다.
 const p=useMemo(()=>adaptClassicPlay(play,level==='쉬운 방법',players),[play,level,players]);
 const [elapsed,setElapsed]=useState(0),[paused,setPaused]=useState(false),[moved,setMoved]=useState(false),[checked,setChecked]=useState(false);
 // 고를 것은 기본값을 미리 골라 두어, 시작 버튼을 한 번만 눌러도 바로 시작된다(바꾸고 싶으면 다른 것을 누르면 된다).
 const [participants,setParticipants]=useState<number[]>([]),[count,setCount]=useState(''),[answer,setAnswer]=useState<string[]>([]),[choice,setChoice]=useState('core'),[feeling,setFeeling]=useState('');
 const [records,setRecords]=useState<PhoneRecord[]>([]);
 const [strategy,setStrategy]=useState<PhoneStrategy>('core'),[created,setCreated]=useState<string[]>(()=>play.kind==='create'?play.cues.slice(0,2):[]),[before,setBefore]=useState(''),[after,setAfter]=useState(''),[quick,setQuick]=useState(false),[nextHint,setNextHint]=useState('');
 const [comparison,setComparison]=useState(''),[fill,setFill]=useState(''),[rawCount,setRawCount]=useState(''),[carry,setCarry]=useState(0),[goals,setGoals]=useState<string[]>([]),[individual,setIndividual]=useState<string[]>([]);
 const [bingo,setBingo]=useState<boolean[]>(()=>Array(9).fill(false));
 const submitted=useRef(false),transition=useRef(false);
 const [classRun,setClassRun]=useState(false),[taskSeconds,setTaskSeconds]=useState<number>(CLASS_DEFAULT_SECONDS);
 const memory=phoneMemoryTask(p,round,level==='쉬운 방법',level==='추가 도전',fill),observation=phoneObservation(p),roundCheck=phoneRoundCheck(p,round);
 // 숫자 모둠 만들기는 함께하는 인원보다 큰 모둠 신호를 내지 않는다.
 const sequence=fitGroupCues(p,p.kind==='memory'?(p.id==='phone-play-033'?memory.expected:memory.base):phoneSequence(p,round,level==='쉬운 방법',level==='추가 도전'),players),activeCues=fitGroupCues(p,phoneRoundCues(p,round,level,created,strategy),players);
 const duration=phase==='countdown'?4000:practice?8000:p.kind==='estimate'?60000:Math.max(p.seconds*1000,activeCues.length*6000*pace);
 const cueIndex=Math.floor(elapsed/(6000*pace)),cue=activeCues[cueIndex%activeCues.length];
 const leader=(round+cueIndex)%players+1;
 // 2026-11에 더한 놀이(101~106)는 모둠 놀이여도 과제 신호를 차례로 보여 준다.
 const displayCue=seated?p.seated:p.kind==='team'&&!isClassicPlay(p.id)?(p.id==='phone-play-008'?phoneRoles(p,players,round).map(r=>`${r.seat}번 ${r.role}`).join(' · '):phoneTeamMotion(p,round)):cue;
 const options=phoneStrategies(p,round);
 const roles=phoneRoles(p,players,round,created,seated);
 // 관찰 놀이의 '활동 전 느낌'은 고르지 않아도 시작할 수 있다. 빈 박자는 고르지 않으면 첫 동작을 쓴다.
 const decisionReady=(p.kind!=='decision'||!!choice)&&(p.kind!=='create'||created.length>=2)&&(p.id!=='phone-play-033'||fill===''||validPhoneFill(fill,phoneFillOptions(round)))&&(p.id!=='phone-play-061'||Array.from({length:players},(_,i)=>goals[i]).every(v=>v!==undefined&&/^\d{1,2}$/.test(v)));
 // 시작 버튼이 꺼져 있으면 그 까닭을 바로 옆에 알려 준다.
 const blockReason=decisionReady?'':p.kind==='decision'&&!choice?'먼저 아래에서 방법을 하나 골라요.':p.kind==='create'&&created.length<2?`동작을 두 개 이상 골라요. (지금 ${created.length}개)`:p.id==='phone-play-061'?'자리마다 목표 숫자(0~99)를 적어요.':'고를 것을 다시 확인해요.';
 const accurate=p.kind==='memory'?JSON.stringify(answer)===JSON.stringify(memory.expected):p.kind==='estimate'?Math.abs(elapsed-phoneTarget(round)*1000)<=3500:true;
 const validCount=count===''||/^\d{1,2}$/.test(count);const countsReady=p.id!=='phone-play-061'||Array.from({length:players},(_,i)=>individual[i]).every(v=>v!==undefined&&/^\d{1,2}$/.test(v));
 // '앞뒤를 비교했어요'는 활동 전·뒤를 모두 골랐을 때만 기록할 수 있다.
 const compareReady=p.kind!=='observe'||(!!comparison&&(comparison!=='compared'||(!!before&&!!after)));
 const completeReady=compareReady&&countsReady&&moved&&checked&&participants.length===players&&accurate&&(p.kind!=='count'||(/^\d{1,2}$/.test(count)&&Number(count)>0));
 useEffect(()=>{window.scrollTo(0,0);},[phase,round]);
 useEffect(()=>{
  const hide=()=>{if(document.hidden){setPaused(true);window.speechSynthesis?.cancel();}};
  document.addEventListener('visibilitychange',hide);
  return()=>{document.removeEventListener('visibilitychange',hide);window.speechSynthesis?.cancel();};
 },[]);
 useEffect(()=>{
  if(!['active','countdown'].includes(phase)||paused||classroomPaused)return;
  let last=performance.now();
  const timer=window.setInterval(()=>{const now=performance.now();const delta=now-last;last=now;if(!document.hidden)setElapsed(n=>Math.min(duration,n+delta));},100);
  return()=>window.clearInterval(timer);
 },[phase,paused,duration,classroomPaused]);
 useEffect(()=>{
  if(paused||classroomPaused||elapsed<duration)return;
  if(phase==='countdown'){setElapsed(0);setPhase('active');}
  else if(phase==='active'){setPhase('record');window.speechSynthesis?.cancel();}
 },[phase,elapsed,duration,paused,classroomPaused]);
 useEffect(()=>{
  if(phase!=='active'||paused||classroomPaused||document.hidden)return;
  if(sound)sfxTap();
  if(voice&&p.kind!=='memory'&&p.kind!=='estimate'&&window.speechSynthesis){const text=new SpeechSynthesisUtterance(displayCue+(seated?' 앉은 대안으로 해요.':''));text.lang='ko-KR';window.speechSynthesis.cancel();window.speechSynthesis.speak(text);}
  return()=>window.speechSynthesis?.cancel();
 },[phase,paused,voice,sound,p.kind,displayCue,cueIndex,seated,classroomPaused]);
 const resetRecord=()=>{setMoved(false);setChecked(false);setParticipants([]);setAnswer([]);setCount('');setQuick(false);setAfter('');setComparison('');setIndividual([]);setRawCount('');};
 const start=(isPractice:boolean)=>{
  if(transition.current||!decisionReady)return;transition.current=true;unlockAudio();resetRecord();setPractice(isPractice);setElapsed(0);setPaused(false);setPhase('countdown');queueMicrotask(()=>{transition.current=false;});
 };
 const save=(outcome:PhoneRecord['outcome'])=>{
  const quiet=outcome==='rest'||outcome==='observe';
  if(transition.current||submitted.current||(!quiet&&(practice||phase!=='record'||!moved||!participants.length))||(outcome==='complete'&&!completeReady))return;
  const record:PhoneRecord={round,outcome,elapsedMs:Math.round(elapsed),count:quiet?0:Number(count)||0,answer:quiet?[]:answer,participants:quiet?[]:participants,easy:level==='쉬운 방법',challenge:level==='추가 도전',strategy,created:[...created],before,after,fill,...(comparison?{comparison:comparison as PhoneRecord['comparison']}:{ }),...(p.id==='phone-play-009'?{remainder:quiet?carry:phoneBundle(Number(rawCount),carry).remainder}:{}),...(p.id==='phone-play-061'&&!quiet?{goals:Array.from({length:players},(_,i)=>Number(goals[i])||0),individual:Array.from({length:players},(_,i)=>Number(individual[i])||0)}:{})};
  if(!phoneRecordValid(p,record,players))return;
  transition.current=true;
  const next=[...records,record];
  if(round<2){setNextHint(phoneNextHint(p,outcome,round));setRecords(next);setRound(n=>n+1);setFill('');setChoice('core');if(p.id==='phone-play-009')setCarry(record.remainder??0);if(p.kind==='decision')setStrategy('core');if(p.kind==='create')setCreated(old=>[...old].reverse());if(p.kind==='observe'){setBefore(after||before);setAfter('');}setPhase('plan');resetRecord();setElapsed(0);}
  else{
   submitted.current=true;setRecords(next);setPhase('done');
   const amount=next.reduce((total,r)=>total+(r.outcome==='complete'?100:r.outcome==='partial'?50:0),0);
   const metrics:Record<string,string>={'놀이 분류':p.category,'참여 방식':solo&&range.min>1?'혼자 규칙 연습':`${players}명 · 스마트폰 1대`,'수행 확인':players>1?'함께한 사람이 직접 확인 · 자동 측정 아님':'본인이 직접 확인 · 자동 측정 아님','참여 동작':`${seated?'앉은 동작':p.kind==='decision'?'과제별 선택 동작':'기본 움직임'} · ${level}`,'과제별 선택':next.map(r=>`${r.round+1}차 ${r.strategy==='seated'?'앉은 동작':r.strategy==='small'?'작고 여유 있게':'기본 방법'}${r.created?.length?' · '+r.created.join(' → '):''}${r.before?' · 전 '+r.before+' / 후 '+(r.after||'선택 없음'):''}${r.comparison?' · 비교 '+({compared:'비교함',uncertain:'차이 모름',skip:'느낌 응답 생략'})[r.comparison]:''}`).join(' / ')};
   next.forEach(r=>{metrics[`${r.round+1}차 과제`]=`${p.rounds[r.round]} · ${r.outcome==='complete'?'목표 확인':r.outcome==='partial'?'도전 기록':r.outcome==='rest'?'휴식':'관찰 참여'}${p.kind==='count'?` · 완성 ${r.count}묶음`:''}${p.kind==='memory'?` · 기억 순서 ${r.answer.join(' → ')}`:''}${p.kind==='estimate'?` · 추정 ${(r.elapsedMs/1000).toFixed(1)}초 / 목표 ${phoneTarget(r.round)}초`:''}${r.goals?' · 목표 '+r.goals.join('/')+' / 실제 '+r.individual!.join('/')+' / 합계 '+r.count:''}${r.remainder!==undefined?' · 다음 묶음으로 남김 '+r.remainder+'회':''} · 참여 ${r.participants.length?r.participants.join(',')+'번':'휴식·관찰'}`;});
   enqueueAction({payload:{amount,details:{completion:next.every(r=>r.outcome==='complete')?'complete':'partial',participation:next.some(r=>r.outcome==='complete'||r.outcome==='partial')?'performed':next.some(r=>r.outcome==='observe')?'observed':'rested',metrics,criteria:next.map(r=>p.rounds[r.round]),totalTime:Math.round(next.reduce((n,r)=>n+r.elapsedMs,0)/1000),selfReflection:feeling||undefined}}});
  }
  queueMicrotask(()=>{transition.current=false;});
 };
 // 반 전체 진행에서 정해야 할 역할(여우·술래·지휘자·번호 등). 앉아서 할 때는 역할 정하기를 건너뛴다.
 const classSetup=seated?undefined:adaptClassicPlay(play,level==='쉬운 방법',Infinity).setup;
 if(classRun)return <PhonePlayClass play={play} taskSeconds={taskSeconds} seated={seated} level={level} sound={sound} pace={pace} onLeave={()=>setClassRun(false)} enqueueAction={enqueueAction} rolesReady/>;
 return <section className="phone-play" data-phone-play={p.id} data-phase={phase} data-focus={phase==='countdown'||phase==='active'||undefined} data-active-ms={Math.floor(elapsed)} aria-label={p.name}>
  <header><p className="pp-eyebrow">준비물 없는 신체 놀이 · {p.category}</p><div className="pp-title"><PhonePlayIcon gameType={p.id} size={40}/><h1>{p.name}</h1></div>{phase!=='intro'&&<p>{`${round+1} / 3 과제 · ${practice&&phase!=='plan'?'연습':solo&&range.min>1?'혼자 규칙 연습':p.players}`}</p>}</header>
  {phase!=='intro'&&<ActivityProgress steps={p.rounds} current={round} results={records.map(r=>r.outcome)}/>}
  {phase==='intro'&&<>
   {/* 처음 본 사람도 5초 안에 알 수 있게: 3줄 규칙과 시작 버튼을 맨 위에 둔다. 나머지 준비·설정은 접어 둔다. */}
   <PhoneRuleCard rule3={p.rule3}/>
   <div className="pp-start">
    {/* 역할을 정해야 하는 놀이는 시작 버튼 바로 위에서 먼저 정하게 한다. 그러면 시작 버튼 한 번으로 바로 진행된다. */}
    {!solo&&classSetup&&<p className="pp-setup-first" role="note"><strong>시작하기 전에 정해요</strong> {classSetup}</p>}
    {!solo&&<button className="pp-primary" onClick={()=>{unlockAudio();setVoice('speechSynthesis' in window);setClassRun(true);}}>{classSetup?<StartLabel sub="역할 정했어요 · 반 전체"/>:<StartLabel sub="반 전체"/>}</button>}
    <button className={solo?'pp-primary':''} onClick={()=>setPhase('plan')}>{solo?'놀이 방법 익히기':'짝·모둠이 기기 1대로 하기'}</button>
    {!solo&&<p className="pp-start-note">반 전체: 이 화면을 TV에 띄우면 학생은 기기 없이 참여해요 · 기기 1대: 과제마다 직접 기록해요</p>}
   </div>
   <div className="pp-badges"><span>약 {p.minutes}분</span><span>{p.intensity} 강도</span><span>{p.players} · {range.min===range.max?range.min:`${range.min}~${range.max}`}명</span><span>{p.space}</span></div>
   {!solo&&p.space!=='제자리'&&<p className="pc-space-note" role="note">{p.space==='두 걸음'?'교실이라면 책상을 밀어 저마다 두 걸음 통로를 만든 뒤 시작해요. 어렵다면 “앉아서 참여하기”를 켜요.':'강당이나 넓은 교실에서 해요. 교실이 좁으면 “앉아서 참여하기”를 켜요.'}</p>}
   <details className="pp-panel pp-more"><summary>준비·설정 더 보기 · 인원, 시간, 앉아서, 소리</summary>
    {!solo&&<label>반 전체 · 과제마다 움직이는 시간<select aria-label="과제마다 움직이는 시간" value={taskSeconds} onChange={e=>setTaskSeconds(Number(e.target.value))}>{CLASS_TASK_SECONDS.map(n=><option key={n} value={n}>{n}초 · 모두 {Math.round(classMovementSeconds(n)/6)/10}분 움직임</option>)}</select></label>}
    <h2>이렇게 준비해요</h2><p>{phoneSetup(p)}</p><ol>{p.rules.map(rule=><li key={rule}>{rule}</li>)}</ol><p><strong>완료 기준</strong> · {p.check}</p>
    {!solo&&range.max>1&&<label>함께할 인원<select aria-label="함께할 인원" value={players} onChange={e=>setPlayers(Number(e.target.value))}>{Array.from({length:range.max-range.min+1},(_,i)=>range.min+i).map(n=><option key={n} value={n}>{n}명</option>)}</select></label>}
    {solo&&range.min>1&&<p className="pp-notice">혼자 규칙을 연습해요. 친구와 한 활동으로 기록되지 않아요. 함께 하려면 활동 목록에서 ‘활동 열기’를 선택해요.</p>}
    <label><input type="checkbox" checked={seated} onChange={e=>setSeated(e.target.checked)}/>앉아서 참여하기</label><p>{seated?p.seated:'서로 닿지 않는 간격에서 움직여요.'}</p>
    <label>도전 방법<select aria-label="도전 방법" value={level} onChange={e=>setLevel(e.target.value)}><option>쉬운 방법</option><option>기본 방법</option><option>추가 도전</option></select></label><p>{level==='쉬운 방법'?p.easy:level==='추가 도전'?p.hard:p.rules[1]}</p>
    <label><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/>시작·전환 소리</label><label><input type="checkbox" checked={voice} disabled={!('speechSynthesis' in window)} onChange={e=>setVoice(e.target.checked)}/>신호 읽어 주기 (선택)</label>
    <ActivityCueControls pace={pace} compact={compact} onPace={setPace} onCompact={setCompact} paceDisabled={false}/>
    <h3>안전과 역할</h3><ul>{phoneSafety.map(s=><li key={s}>{s}</li>)}</ul><p>모둠에서는 1번부터 돌아가며 이끌고, 나머지 친구도 자기 공간에서 따라 해요. 탈락이나 오래 기다리기는 없어요.</p>
    <p>화면 점수는 직접 확인한 참여 기록이에요. 기기가 동작이나 체력을 판정하지 않아요.</p>
   </details>
  </>}
  {phase==='plan'&&<>
   <h2>{p.rounds[round]}</h2>{nextHint&&<p className="pp-notice">앞 과제에서 이어가기 · {nextHint}</p>}{!compact&&<p>{seated?p.seated:level==='쉬운 방법'?p.easy:level==='추가 도전'?p.hard:p.rules.join(' ')}</p>}
   <section className="pp-panel"><h3>{p.kind==='memory'?'기억할 동작 순서':'이번에 할 동작'}</h3><ol>{sequence.map((c,i)=><li key={i}>{c}</li>)}</ol><p>{p.kind==='memory'?memory.rule:roundCheck}</p>{p.kind==='estimate'&&<strong>목표: {phoneTarget(round)}초 · 먼저 멈춘 뒤 버튼을 눌러요.</strong>}{players>1&&<p>함께할 {players}명 모두 실제로 움직여요. 먼저 이끄는 사람은 {round%players+1}번이며, {(6*pace).toFixed(1)}초마다 이끄는 사람이 다음 번호로 바뀌어요. 마지막 번호 다음에는 1번으로 돌아와요.</p>}</section>
   {players>1&&<section className="pp-panel"><h3>이번 과제의 자리별 동작·신호</h3><div className="activity-role-cards">{roles.map(r=><p key={r.seat}><strong>{r.seat}번 자리</strong>{r.role}</p>)}</div><p>실명 대신 이 놀이 안의 자리 번호예요. 과제가 바뀌면 담당도 바뀌며 모두 몸으로 참여해요.</p></section>}
   {p.kind==='decision'&&<><p className="pp-notice">가상 상황 카드 · {phoneScenario(p,round)} · 실제 교실과 다르면 교사가 참여 방법을 조정해요.</p><fieldset><legend>‘{p.rounds[round]}’을 어떤 방법으로 실행할까요?</legend>{options.map(option=><button key={option.id} aria-pressed={choice===option.id} onClick={()=>{setChoice(option.id);setStrategy(option.id);}}><strong>{option.label}</strong><p>{option.guide}</p></button>)}<p>상황에 맞는 방법을 직접 고르고 몸으로 비교해요. 선택 결과가 활동 중 안내에 반영돼요.</p>{p.options&&<details><summary>원래 상황의 안전 계획 살펴보기</summary><p>{p.options[0]} · {p.check}</p></details>}</fieldset></>}
   {p.kind==='create'&&<fieldset><legend>우리 동작 문장 만들기 · 두 개 이상 순서대로 선택</legend><p>{created.join(' → ')||'선택한 동작이 활동 중 순서대로 나타나요.'}</p>{p.cues.map(c=><button key={c} disabled={created.includes(c)} onClick={()=>setCreated(old=>[...old,c])}>{c}</button>)}<button onClick={()=>setCreated([])}>동작 문장 다시 만들기</button><p>다음 과제에서는 앞서 만든 문장을 거꾸로 받아 바꾸어 볼 수 있어요.</p></fieldset>}
   {p.id==='phone-play-033'&&<label>네 번째 빈 박자에 넣을 동작<select value={fill} onChange={e=>setFill(e.target.value)}><option value="">{phoneFillOptions(round)[0]} (기본)</option>{phoneFillOptions(round).map(c=><option key={c}>{c}</option>)}</select></label>}{p.id==='phone-play-061'&&<fieldset><legend>자리별 스스로 고른 목표 (0~99묶음 · 운동 처방 아님)</legend>{Array.from({length:players},(_,i)=><label key={i}>{i+1}번 목표<input type="number" min="0" max="99" value={goals[i]??''} onChange={e=>setGoals(old=>Array.from({length:players},(_,j)=>j===i?e.target.value:old[j]??''))}/></label>)}</fieldset>}{p.id==='phone-play-009'&&<p>앞 묶음에서 남은 동작: {carry}회. 두 동작이 모여야 한 묶음이에요.</p>}{p.kind==='observe'&&<label>{observation.label} · 활동 전 (고르지 않아도 돼요)<select value={before} onChange={e=>setBefore(e.target.value)}><option value="">고르지 않음</option><option value="응답 생략 · 관찰 방법 익히기">느낌 응답 없이 관찰 방법만 익혀요</option>{observation.options.map(v=><option key={v}>{v}</option>)}</select></label>}
   <p>기기는 활동 구역 밖에 놓고 시작해요.{!rehearsed&&' 처음이면 8초 연습(점수 없음)을 먼저 해도 돼요.'}</p>
   {blockReason&&<p className="pp-notice" role="note">시작하려면 · {blockReason}</p>}
   <button className="pp-primary" disabled={!decisionReady} onClick={()=>start(false)}>폰 내려놓고 활동 시작</button>
   {!rehearsed&&<button disabled={!decisionReady} onClick={()=>start(true)}>짧게 연습하기</button>}
   <ActivityCueControls pace={pace} compact={compact} onPace={setPace} onCompact={setCompact} paceDisabled={false}/>
  </>}
  {(phase==='countdown'||phase==='active')&&<>
   <div className="pp-signal" role="status" aria-live={phase==='countdown'?'polite':'off'}>
    <p>{paused?'잠깐 쉬고 있어요':phase==='countdown'?'기기를 내려놓고 주변을 확인해요':p.rounds[round]}</p>
    <strong>{paused?'일시정지':phase==='countdown'?Math.max(1,Math.ceil((duration-elapsed)/1000)):p.kind==='memory'?(p.id==='phone-play-006'?memory.shown[cueIndex%memory.shown.length]:p.id==='phone-play-003'?'새 신호: '+sequence[cueIndex%sequence.length]+' · 앞 신호의 동작을 해요':memory.rule):p.kind==='estimate'?'걸음으로 시간을 가늠해요':displayCue}</strong>
    <p>{phase==='active'&&p.kind!=='estimate'?`${Math.ceil((duration-elapsed)/1000)}초 남음`:phase==='active'?'시간 표시는 가렸어요.':'4초 뒤 시작해요.'}</p>
   {phase==='active'&&!seated&&<p className="pp-rule-line">{deviceRuleLine(p,round,activeCues,cueIndex,level)}</p>}
   </div>{phase==='active'&&p.id==='phone-play-105'&&!seated&&<MovementBingoBoard row={round} done={bingo} onToggle={i=>setBingo(b=>b.map((v,j)=>j===i?!v:v))}/>}{!compact&&<p>{seated?p.seated:p.goal}</p>}
   {phase==='active'&&players>1&&<p data-phone-leader={leader}>지금 이끄는 사람: {leader}번 · 다른 친구도 자기 공간에서 함께 움직여요.</p>}
   {phase==='active'&&p.kind==='estimate'&&!practice&&<button className="pp-primary" disabled={paused||elapsed<1000} onClick={()=>{setPhase('record');window.speechSynthesis?.cancel();}}>멈췄어요 · 시간 확인</button>}
   <button onClick={()=>{setPaused(v=>!v);window.speechSynthesis?.cancel();}}>{paused?'이어서 하기':'잠깐 쉬기'}</button>
  </>}
  {phase==='record'&&(practice?<section className="pp-panel"><h2>연습을 마쳤어요</h2><p>동작과 공간을 확인했나요? 연습은 기록과 점수에 포함되지 않아요.</p><button className="pp-primary" onClick={()=>{setRehearsed(true);setPractice(false);setElapsed(0);setPhase('plan');}}>연습 마치고 현재 과제로</button></section>:<>
   <h2>몸으로 해 본 뒤 확인해요</h2><p>{roundCheck}</p>
   <label className="pp-notice"><input type="checkbox" checked={quick} onChange={e=>{setQuick(e.target.checked);setMoved(e.target.checked);setChecked(e.target.checked);setParticipants(e.target.checked?Array.from({length:players},(_,i)=>i+1):[]);}}/>{players===1?'실제 동작과 이번 목표를 직접 확인했어요.':`참여한 ${players}명 모두의 동작·역할과 이번 목표를 함께 확인했어요.`}</label><p>일부만 참여했으면 아래 세부 기록을 골라요.</p><details><summary>일부 참여·세부 기록 직접 확인</summary>
   <label><input type="checkbox" checked={moved} onChange={e=>{setQuick(false);setMoved(e.target.checked);}}/>실제로 몸을 움직였어요</label>
   <fieldset><legend>실제로 참여한 사람</legend>{Array.from({length:players},(_,i)=>i+1).map(n=><label key={n}><input type="checkbox" checked={participants.includes(n)} onChange={e=>{setQuick(false);setParticipants(list=>e.target.checked?[...list,n].sort((a,b)=>a-b):list.filter(v=>v!==n));}}/>{players===1?'나':`${n}번 친구`}</label>)}</fieldset>
   </details>
   {p.id==='phone-play-009'?<label>이번 실제 동작 수 (0~99회)<input type="number" min="0" max="99" value={rawCount} onChange={e=>{setRawCount(e.target.value);setCount(String(phoneBundle(Number(e.target.value),carry).count));}}/><p>앞서 남긴 {carry}회와 합쳐 {phoneBundle(Number(rawCount),carry).count}묶음 · 남는 {phoneBundle(Number(rawCount),carry).remainder}회는 다음 과제로 이어져요.</p></label>:p.id==='phone-play-061'?<fieldset><legend>자리별 실제 완성 묶음</legend>{Array.from({length:players},(_,i)=><label key={i}>{i+1}번 실제<input type="number" min="0" max="99" value={individual[i]??''} onChange={e=>{const values=Array.from({length:players},(_,j)=>j===i?e.target.value:individual[j]??'');setIndividual(values);setCount(String(values.reduce((n,v)=>n+(Number(v)||0),0)));}}/></label>)}<p>모둠 합계: {count||0}묶음 · 목표 합계: {goals.reduce((n,v)=>n+(Number(v)||0),0)}묶음. 목표와 다른 결과도 정직하게 기록해요.</p></fieldset>:p.kind==='count'&&<label>완성한 묶음 수 (0~99)<input type="number" inputMode="numeric" min="0" max="99" value={count} onChange={e=>setCount(e.target.value)}/>{!validCount&&<span role="alert"> 0부터 99까지만 적을 수 있어요.</span>}</label>}
   {p.kind==='memory'&&<fieldset><legend>{memory.prompt}</legend><p aria-live="polite">{answer.length?answer.join(' → '):'동작 순서대로 선택해요.'}</p>{[...p.cues,...(p.id==='phone-play-033'?phoneFillOptions(round):[])].map(c=><button key={c} disabled={answer.length>=memory.expected.length} onClick={()=>setAnswer(a=>[...a,c])}>{c}</button>)}<button onClick={()=>setAnswer([])}>순서 지우기</button>{answer.length===memory.expected.length&&!accurate&&<p role="alert">기억 순서를 다시 확인하거나 도전 기록으로 남겨요.</p>}</fieldset>}
   {p.kind==='estimate'&&<p>실행 시간: {(elapsed/1000).toFixed(1)}초 · 목표: {phoneTarget(round)}초 · 오차: {(Math.abs(elapsed-phoneTarget(round)*1000)/1000).toFixed(1)}초{!accurate?' · 다시 해 보거나 도전 기록으로 남겨요.':''}</p>}
   {!quick&&<label><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>{roundCheck}</label>}
   {p.kind==='observe'&&<><label>{observation.label} · 활동 뒤<select value={after} onChange={e=>setAfter(e.target.value)}><option value="">선택하지 않음</option>{observation.options.map(v=><option key={v}>{v}</option>)}</select><p>앞: {before||'고르지 않음'} · 뒤: {after||'고르지 않음'} · 좋고 나쁨의 순위를 매기지 않아요.</p></label><label>비교 과정 확인 (느낌 응답은 선택)<select value={comparison} onChange={e=>setComparison(e.target.value)}><option value="">과정을 골라요</option><option value="compared" disabled={!before||!after}>앞뒤를 비교했어요{!before||!after?' (활동 전·뒤를 모두 골라야 해요)':''}</option><option value="uncertain">살펴봤지만 차이를 모르겠어요</option><option value="skip">느낌 응답은 생략하고 관찰 방법을 익혔어요</option></select></label></>}
   {round===2&&<label>오늘의 느낌 (선택)<select value={feeling} onChange={e=>setFeeling(e.target.value)}><option value="">선택하지 않음</option><option>새로운 방법을 해 봤어요</option><option>친구와 맞추는 게 즐거웠어요</option><option>다음에는 더 천천히 해 보고 싶어요</option></select></label>}
   <button className="pp-primary" disabled={!completeReady} onClick={()=>save('complete')}>{round===2?'목표 확인 · 놀이 마치기':'목표 확인 · 다음 과제로'}</button>
   <button disabled={!moved||!participants.length||!validCount||!countsReady} onClick={()=>save('partial')}>{round===2?'도전한 만큼 기록 · 마치기':'도전한 만큼 기록 · 다음 과제로'}</button>
   <button onClick={()=>{setElapsed(0);resetRecord();if(p.id==='phone-play-105')setBingo(b=>b.map((v,i)=>Math.floor(i/3)===round?false:v));setPhase('plan');}}>같은 과제 다시 해보기</button><p>목표 확인 100점, 도전 기록 50점 · 기기가 판정하지 않는 참여 기록이에요.</p>
  </>)}
  {phase==='done'&&<p role="status">세 과제의 참여 기록을 저장했어요.</p>}
  {['plan','active','countdown','record'].includes(phase)&&<div className="pp-panel"><button onClick={()=>save('rest')}>이번 과제 쉬기 · 0점 기록</button><button onClick={()=>save('observe')}>이번 과제 관찰 참여 · 0점 기록</button></div>}{phase!=='done'&&<button className="pp-exit" onClick={onExit}>활동 목록으로 돌아가기</button>}
 </section>;
}
