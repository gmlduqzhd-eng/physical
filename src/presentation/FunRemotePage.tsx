import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import type {ExternalFunCommand,FunRemoteSnapshot} from '../application/funCommandBus';
import {ACK_GIVE_UP_MS,ACK_RETRY_MS,createRemoteSender,formatConfirmCode,isRemotePin,isValidRoomCode,loadPhoneKeys,normalizeRoomCode,openRemoteChannel,phonePinStore,phoneSeqStore,readRoomSecret,remoteConfigured,type RemoteAccess,type RemoteAck,type RemoteStatus} from '../application/funRemote';
import {TEAM_COLORS,TEAM_NAMES,type FunPhase,type SurpriseKind} from '../domain/funLoop';
import {isSendLocked,lockAfterSend,SEND_LOCK_MS,type SendLock} from '../application/remoteSendLock';
import {REMOTE_NEXT_LABEL} from '../application/remoteLabels';
import './FunRemotePage.css';

const PHASE:Record<FunPhase,string>={demo:'시범',tutorial:'연습 판',play:'본게임',climax:'마지막 승부',result:'결과 발표'};
const STATUS:Record<RemoteStatus,string>={idle:'연결 전',connecting:'TV에 연결하는 중…',connected:'TV에 연결을 요청했어요',unavailable:'이 기기에서는 연결할 수 없어요',error:'연결이 끊겼어요. TV 버튼으로 계속하고, 잠시 뒤 다시 열어 보세요.'};
const ACCESS:Record<RemoteAccess,string>={
 asking:'TV에 연결을 요청하는 중…',pending:'TV에서 선생님이 ‘허용’을 눌러 주세요',approved:'TV와 연결됐어요',rejected:'TV에서 연결을 거절했어요',
 full:'이미 휴대폰 2대가 연결돼 있어요',busy:'TV에 연결 요청이 밀려 있어요 · 잠시 뒤 다시 물어요',gone:'이 코드는 끝났어요 · TV의 새 코드로 다시 연결해요',
 closed:'연결이 끝났어요 · 새 코드로 다시 연결해요',stale:'TV 응답 없음 · TV 화면이 켜져 있는지 확인해요',
 reloading:'TV 화면을 다시 여는 중이에요 · TV에서 ‘이어 하기’를 눌러요',
 verify:'TV 화면의 확인 번호와 같은지 확인해 주세요',
 conflict:'TV인 척하는 기기가 있어요 · TV 화면의 QR을 찍어 다시 연결해요',
};
const EVENT_BUTTON:Record<SurpriseKind,string>={golden:'✨ 황금 신호',reverse:'🔄 거꾸로',freeze:'🧊 얼음',speed:'⚡ 빨리빨리'};
const EVENT_LABEL:Record<SurpriseKind,string>={golden:'황금 신호',reverse:'거꾸로',freeze:'얼음',speed:'빨리빨리'};
/** 팀은 색과 함께 모양으로도 구분한다(색을 가리기 어려운 사람도 알 수 있게). */
const TEAM_SHAPES=['●','▲','■','◆'] as const;
const DEFAULT_EVENTS:SurpriseKind[]=['golden','reverse','freeze'];
const ACK_REASON:Record<string,string>={paused:'일시정지 중이라',event:'이 게임에서는 쓰지 않는 이벤트라',rate:'너무 빨리 눌러서',jump:'순서가 맞지 않아서',invalid:'알 수 없는 명령이라',idle:'TV에서 아직 게임을 시작하지 않아서',busy:'TV에서 확인 중이라'};

/** 선생님 휴대폰 리모컨: '다음'·'일시정지'를 화면 절반 크기로, 팀 점수는 그 아래 작은 격자로. 명령은 서명해서 TV의 대표 게임 화면으로 간다. */
export function FunRemotePage(){
 const [params,setParams]=useSearchParams();
 const room=normalizeRoomCode(params.get('room'));
 const valid=isValidRoomCode(room);
 // QR 주소에 담긴 TV 키 지문. 없으면(코드만 입력) 이 탭에서 전에 확인한 TV 키를 쓰고, 그것도 없으면 사람이 확인한다.
 const urlPin=params.get('tv');
 const tvPin=isRemotePin(urlPin)?urlPin:valid?phonePinStore(room)?.get()??null:null;
 const pinned=isRemotePin(tvPin);
 // QR 주소의 # 뒤 방 비밀값(서버로 가지 않는다). 있으면 TV가 이 휴대폰의 요청을 먼저 받는다.
 const secret=typeof window==='undefined'?null:readRoomSecret(window.location.hash);
 const [draft,setDraft]=useState(room);
 const [status,setStatus]=useState<RemoteStatus>('idle');
 const [access,setAccess]=useState<RemoteAccess>('asking');
 const [code,setCode]=useState('');
 const [tvCode,setTvCode]=useState('');
 const [tvHidden,setTvHidden]=useState(false);
 const [tvIdle,setTvIdle]=useState(false);
 const [snap,setSnap]=useState<FunRemoteSnapshot|null>(null);
 const [sent,setSent]=useState<{text:string;tone:'wait'|'ok'|'no'}|null>(null);
 /** 본게임 중 '마지막 승부로 건너뛰기'를 한 번 더 확인하는 중. */
 const [confirmSkip,setConfirmSkip]=useState(false);
 /** '끝내기'도 한 번 더 확인한다(보지 않고 누르다 잘못 눌러도 판이 끝나지 않게). */
 const [confirmEnd,setConfirmEnd]=useState(false);
 /** 가끔 쓰는 버튼(깜짝 이벤트·마지막 승부로·끝내기) 펼침. */
 const [more,setMore]=useState(false);
 /** 단계를 바꾸는 명령(다음·마지막 승부로·끝내기)을 보낸 뒤 잠깐 잠근다(두 번 탭해 한 단계를 건너뛰지 않게). */
 const [stepLock,setStepLock]=useState<SendLock|null>(null);
 const confirmRef=useRef<HTMLDivElement>(null);
 const sender=useRef<ReturnType<typeof createRemoteSender>|null>(null);
 const waiting=useRef(new Map<number,{label:string;timers:ReturnType<typeof setTimeout>[]}>());
 useEffect(()=>{
  if(!valid)return;
  let alive=true,dispose=()=>{};
  const pending=waiting.current;
  setSnap(null);setAccess('asking');setTvCode('');setCode('');
  // 방 코드마다 새 키(다른 방에서 엿본 지문으로 확인 번호를 미리 맞춰 둘 수 없게).
  void loadPhoneKeys(room).then(keys=>{
   if(!alive)return;
   const channel=openRemoteChannel(room);
   if(!channel){setStatus('unavailable');return;}
   const onAck=(a:RemoteAck)=>{
    const w=pending.get(a.seq);if(!w)return;
    w.timers.forEach(clearTimeout);pending.delete(a.seq);
    setSent(a.ok?{text:`보냈어요: ${w.label}`,tone:'ok'}:{text:`반영되지 않았어요: ${w.label}${a.reason&&ACK_REASON[a.reason]?` (${ACK_REASON[a.reason]})`:''}`,tone:'no'});
   };
   const s=createRemoteSender(channel,{room,keys,secret,tvPin:isRemotePin(tvPin)?tvPin:null,onPinned:pin=>phonePinStore(room)?.set(pin),seqStore:phoneSeqStore(keys.fp),onState:setSnap,onStatus:setStatus,onAccess:setAccess,onAck,onTvHidden:setTvHidden,onTvIdle:setTvIdle,onTvCode:setTvCode,onCode:setCode});
   sender.current=s;setCode(s.code);setAccess(s.access);
   // 페이지를 닫거나 다른 앱으로 넘어가 사라지면, 허용 전 요청은 TV 목록에서 빼 달라고 알린다.
   const leave=()=>s.bye();
   window.addEventListener('pagehide',leave);
   dispose=()=>{window.removeEventListener('pagehide',leave);sender.current=null;s.close();};
  }).catch(()=>{if(alive)setStatus('unavailable');});
  return ()=>{alive=false;dispose();for(const w of pending.values())w.timers.forEach(clearTimeout);pending.clear();};
  // tvPin·secret은 주소(또는 이 탭의 확인 기록)에서 정해지고, 바뀌면 처음부터 다시 연결한다.
 },[room,valid,tvPin,secret]);
 const send=(cmd:ExternalFunCommand,label:string)=>{
  const seq=sender.current?.send(cmd);if(!seq)return;
  setSent({text:`보내는 중: ${label}`,tone:'wait'});
  // TV가 받았다고 답하면 '보냈어요'. 응답이 늦으면 '확인 중…'(그 사이 같은 명령을 한 번 더 보낸다: 점수가 두 번 들어가지 않는다).
  // 그래도 답이 없을 때만 '반영되지 않았어요'.
  const checking=setTimeout(()=>{if(waiting.current.has(seq))setSent({text:`확인 중…: ${label}`,tone:'wait'});},ACK_RETRY_MS);
  const giveUp=setTimeout(()=>{if(waiting.current.delete(seq))setSent({text:`반영되지 않았어요: ${label} (TV가 답하지 않아요)`,tone:'no'});},ACK_GIVE_UP_MS);
  waiting.current.set(seq,{label,timers:[checking,giveUp]});
  try{navigator.vibrate?.(30);}catch{/* 진동 없음 */}
 };
 // 잠금이 시간으로 풀릴 때 화면을 다시 그린다.
 useEffect(()=>{if(!stepLock)return;const t=setTimeout(()=>setStepLock(null),Math.max(0,stepLock.until-Date.now())+20);return ()=>clearTimeout(t);},[stepLock]);
 // 보낸 결과 알림은 잠깐만 띄운다(계속 붙어 아래 버튼을 가리지 않게). 반영되지 않은 알림은 조금 더 오래 둔다.
 useEffect(()=>{
  if(!sent||sent.tone==='wait')return;
  const hide=setTimeout(()=>setSent(null),sent.tone==='ok'?2500:6000);
  return ()=>clearTimeout(hide);
 },[sent]);
 const stepLocked=isSendLocked(stepLock,snap?.phase,Date.now());
 /** 단계를 바꾸는 명령: 잠겨 있으면 무시하고, 보내면 잠근다. */
 const sendStep=(cmd:ExternalFunCommand,label:string)=>{
  if(isSendLocked(stepLock,snap?.phase,Date.now()))return;
  setStepLock(lockAfterSend(snap?.phase,Date.now(),SEND_LOCK_MS));
  send(cmd,label);
 };
 // 확인 창이 열리면 첫 버튼(취소)에 초점을 두고, Esc로 닫는다.
 useEffect(()=>{
  if(!confirmSkip&&!confirmEnd)return;
  confirmRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setConfirmSkip(false);setConfirmEnd(false);}};
  window.addEventListener('keydown',key);return ()=>window.removeEventListener('keydown',key);
 },[confirmSkip,confirmEnd]);
 const teams=snap?.teams??2;
 const paused=!!snap?.paused;
 // TV가 '오늘 수업' 확인 창을 띄운 동안: 눌러도 반영되지 않으니 미리 알린다.
 const tvBusy=!!snap?.busy;
 const result=snap?.phase==='result';
 const scoring=!!snap&&snap.phase!=='demo'&&!result&&!paused;
 const ready=status==='connected'&&access==='approved';
 // TV가 아직 게임을 띄우지 않았으면(시작·이어 하기 화면) 끝내기·일시정지를 포함해 모두 끈다(눌러도 반영되지 않는다).
 const live=ready&&!tvIdle;
 const inPlay=snap?.phase==='play';
 const nextLabel=snap?REMOTE_NEXT_LABEL[snap.phase]:'다음';
 const ended=access==='closed'||access==='rejected'||access==='full'||access==='gone'||access==='conflict';
 const events=snap?.events??DEFAULT_EVENTS;
 // '한 방 공격'은 우리 반 보스전에만 있다(다른 게임에서는 감춘다).
 const hasSpecial=snap?.gameId==='sig-boss-raid'||!!snap?.comboFull;
 const teamName=(i:number)=>teams===1?'우리 반':TEAM_NAMES[i];
 const teamRows=useMemo(()=>Array.from({length:teams},(_,i)=>i),[teams]);
 if(!valid)return <main className="fun-remote-page">
  <h1>📱 휴대폰 리모컨</h1>
  <p>TV 화면의 ‘📱 휴대폰 리모컨’에 나온 방 코드 6자리를 넣어요.</p>
  <form onSubmit={e=>{e.preventDefault();setParams({room:normalizeRoomCode(draft)});}}>
   <label>방 코드<input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={8} autoCapitalize="characters" autoComplete="off" inputMode="text"/></label>
   <button type="submit" className="frp-primary" disabled={!isValidRoomCode(normalizeRoomCode(draft))}>연결하기</button>
  </form>
  {params.get('room')&&<p role="alert">방 코드가 맞지 않아요. 다시 확인해 주세요.</p>}
 </main>;
 const idleNow=ready&&tvIdle;
 const statusText=status!=='connected'?STATUS[status]:ready&&tvBusy?'TV에서 확인 중이에요 · 선생님이 TV에서 고르면 다시 보낼 수 있어요':access==='stale'&&tvHidden?'TV 화면이 잠시 가려졌어요 · TV에서 게임 화면을 다시 보여 주세요':idleNow?'TV와 연결됐어요 · TV에서 게임을 시작하거나 ‘이어 하기’를 눌러요':ACCESS[access];
 const codeText=formatConfirmCode(code),tvCodeText=formatConfirmCode(tvCode);
 return <main className="fun-remote-page" data-status={status}>
  <header>
   <h1>📱 휴대폰 리모컨 · {room}</h1>
   <p role="status" className="frp-status" data-status={status==='connected'?access:status}>{statusText}</p>
   {ready&&tvHidden&&access==='approved'&&<p className="frp-note">TV 화면이 잠시 가려져 있어요. 명령이 늦게 반영될 수 있어요.</p>}
   {tvCode&&access!=='verify'&&!pinned&&<p className="frp-note">TV 확인 번호 <b className="frp-tvcode">{tvCodeText}</b> · TV 화면의 번호와 같은지 확인해요</p>}
   {!pinned&&access!=='conflict'&&<p className="frp-warn" role="note">⚠️ QR 없이 코드로 연결했어요. 다른 기기가 TV인 척할 수 있으니, TV 화면의 확인 번호와 이 휴대폰에 뜨는 번호가 같은지 꼭 확인해요. QR로 연결하면 이 확인이 필요 없어요.</p>}
   {!remoteConfigured()&&<p className="frp-note">실시간 연결이 설정되지 않은 사이트예요. 같은 기기의 다른 창에서만 동작해요.</p>}
  </header>
  {status==='connected'&&access==='verify'&&<section className="frp-wait" aria-label="TV 확인">
   <p>이 방 코드로 답한 TV의 확인 번호</p>
   <p className="frp-pin" aria-label={`TV 확인 번호 ${tvCode.split('').join(' ')}`}>{tvCodeText||'······'}</p>
   <p>TV의 ‘📱 휴대폰 리모컨’ 창에 있는 연결 요청 칸에 <b>‘TV 확인 번호’</b>가 나와요(안 보이면 <b>‘QR 없이 코드만 넣어 연결할 때’</b>를 열어요). 그 번호와 같을 때만 눌러요.</p>
   <button type="button" className="frp-primary" onClick={()=>{void sender.current?.confirmTv();}}>✅ TV 번호와 같아요</button>
   <button type="button" onClick={()=>{setParams({});setDraft('');}}>다르면 QR로 다시 연결</button>
  </section>}
  {status==='connected'&&(access==='asking'||access==='pending'||access==='busy')&&<section className="frp-wait" aria-label="허용 기다림">
   <p>이 휴대폰 확인 번호</p>
   <p className="frp-pin" aria-label={`확인 번호 ${code.split('').join(' ')}`}>{codeText||'······'}</p>
   <p>TV 화면에도 같은 확인 번호 <b>{codeText}</b>가 떠요. 휴대폰과 TV에 나온 확인 번호가 같으면 선생님이 TV에서 <b>‘허용’</b>을 눌러요.</p>
  </section>}
  {ended&&<section className="frp-ended" aria-label="연결 끝">
   <p>{access==='closed'?'TV에서 새 방 코드를 만들었거나 게임 화면을 닫았어요.':access==='gone'?'이 방 코드로 답하는 TV가 없어요. TV 화면의 새 코드를 확인해요.':access==='full'?'다른 휴대폰을 끊은 뒤 다시 연결해요.':access==='conflict'?'같은 방 코드로 서로 다른 TV가 답했어요. 가짜 TV일 수 있어요. TV 화면의 QR을 휴대폰 카메라로 찍어 다시 연결해요.':'다시 연결하려면 새로 요청해요.'}</p>
   <button type="button" className="frp-primary" onClick={()=>{setParams({});setDraft('');}}>새 코드로 다시 연결</button>
  </section>}
  {snap&&!idleNow?<section className="frp-snap" aria-label="TV 상태">
   <p><b>{snap.gameName}</b> · {snap.phaseLabel??PHASE[snap.phase]}{paused?' · ⏸ 일시정지 중':''}{result?'':` · ⏱ ${snap.secondsLeft}초`}</p>
   {!result&&snap.cue&&<p className="frp-cue">{snap.cue}</p>}
   {result&&<p className="frp-cue">{teams===1?`우리 반 ${snap.scores[0]}점`:snap.scores.map((n,i)=>`${TEAM_NAMES[i]} ${n}`).join(' · ')}</p>}
  </section>:<p className="frp-note">{ready?(tvIdle?'TV에서 게임을 시작하거나 ‘이어 하기’를 눌러요.':'TV 화면을 기다려요. TV에서 대표 게임을 열어 두세요.'):''}</p>}
  {/* 수업 중에는 화면을 보지 않고 누른다: 가장 자주 쓰는 '다음'과 '일시정지'를 화면 절반 크기로 둔다. */}
  <div className="frp-big" role="group" aria-label="자주 쓰는 버튼" data-play={inPlay||undefined}>
   {/* 본게임 중에는 '다음'을 누를 일이 없다: 죽은 큰 버튼 대신 지금 상태를 보여 주고 '일시정지'를 크게 위로 둔다. */}
   {/* 진행 칸은 늘 첫 자리에 둔다(본게임 중에도 자리를 지켜, 같은 곳을 다시 눌러 일시정지가 되는 일이 없게). */}
   {inPlay||result?<div className="frp-next frp-next-wait" role="status"><span className="frp-big-icon" aria-hidden="true">{result?'🏁':'⏳'}</span><span className="frp-big-label">{result?'게임이 끝났어요':'본게임 중이에요'}</span><small>{result?'TV에서 결과를 함께 봐요':'끝나면 저절로 넘어가요'}</small></div>
   :<button type="button" className="frp-next" disabled={!live||result||paused||stepLocked} aria-busy={stepLocked||undefined} onClick={()=>sendStep({type:'next'},nextLabel)}>
    <span className="frp-big-icon" aria-hidden="true">{stepLocked?'✓':'▶'}</span><span className="frp-big-label">{stepLocked?'보냈어요…':nextLabel}</span>
   </button>}
   <button type="button" className="frp-pause" data-paused={paused||undefined} disabled={!live||result} onClick={()=>send({type:'pause'},paused?'다시 시작':'일시정지')}>
    <span className="frp-big-icon" aria-hidden="true">{paused?'▶':'⏸'}</span><span className="frp-big-label">{paused?'다시 시작':'일시정지'}</span>
   </button>
  </div>
  {/* 알림 띠는 큰 버튼 아래에 둔다(띠가 끼어들어 큰 버튼 자리가 밀리지 않게). */}
  {ready&&tvBusy?<p className="frp-paused" role="status">⏳ TV에서 확인 중이에요 · 지금은 버튼을 눌러도 반영되지 않아요</p>
   :paused&&ready&&<p className="frp-paused" role="status">⏸ 일시정지 중 · ‘다시 시작’을 누르면 점수를 줄 수 있어요</p>}
  <section className="frp-teams" aria-label="팀 점수" data-count={teams}>
   {teamRows.map(i=><div key={i} className="frp-team" style={{'--team':TEAM_COLORS[i]} as React.CSSProperties}>
    <b><span className="frp-shape" aria-hidden="true">{TEAM_SHAPES[i]}</span> {teamName(i)} <span className="frp-score">{snap?.scores[i]??0}</span></b>
    <button type="button" className="frp-minus" disabled={!live||!scoring} aria-label={`${teamName(i)} 1점 빼기`} onClick={()=>send({type:'score',team:i,delta:-1},`${teamName(i)} −1`)}>−1</button>
    <button type="button" className="frp-plus" disabled={!live||!scoring} aria-label={`${teamName(i)} 1점 더하기`} onClick={()=>send({type:'score',team:i,delta:1},`${teamName(i)} +1`)}>+1</button>
   </div>)}
  </section>
  <div className="frp-extra" data-count={hasSpecial?2:1}>
   <button type="button" disabled={!live||!scoring} onClick={()=>send({type:'scoreAll',delta:1},teams===1?'우리 반 +1':'모든 팀 +1')}>👍 {teams===1?'우리 반 +1':'모든 팀 +1'}</button>
   {hasSpecial&&<button type="button" disabled={!live||!scoring||!snap?.comboFull} onClick={()=>send({type:'special'},'한 방 공격')}>💥 한 방 공격</button>}
  </div>
  {/* 가끔 쓰는 버튼은 접어 둔다. 잘못 누르면 판이 바뀌는 버튼은 한 번 더 묻는다. */}
  <button type="button" className="frp-more-toggle" aria-expanded={more} aria-controls="frp-more" onClick={()=>setMore(m=>!m)}>{more?'▲ 접기':'▼ 더 보기 · 깜짝 이벤트 · 끝내기'}</button>
  {more&&<div className="frp-more" id="frp-more" role="group" aria-label="가끔 쓰는 버튼">
   {events.map(e=><button key={e} type="button" disabled={!live||!scoring} onClick={()=>send({type:'event',event:e},EVENT_LABEL[e])}>{EVENT_BUTTON[e]}</button>)}
   {inPlay&&<button type="button" className="frp-skip" disabled={!live||result||paused||stepLocked} onClick={()=>{setConfirmEnd(false);setConfirmSkip(true);}}>⏭ 마지막 승부로</button>}
   <button type="button" className="frp-danger" disabled={!live||result||stepLocked} onClick={()=>{setConfirmSkip(false);setConfirmEnd(true);}}>■ 끝내기</button>
  </div>}
  {/* 확인 창은 화면 아래에 붙는 판으로 띄운다(작은 휴대폰에서 화면 밖으로 나가지 않게). 첫 버튼은 '취소'. */}
  {((confirmSkip&&inPlay&&live&&!paused)||(confirmEnd&&live&&!result))&&<div className="frp-sheet-backdrop" onClick={()=>{setConfirmSkip(false);setConfirmEnd(false);}}>
   <div ref={confirmRef} className="frp-confirm" role="alertdialog" aria-modal="true" aria-labelledby="frp-confirm-text" onClick={e=>e.stopPropagation()}>
    <p id="frp-confirm-text">{confirmEnd?'게임을 지금 끝내고 결과 발표로 갈까요?':'본게임을 끝내고 마지막 승부로 넘어갈까요? 시간이 되면 저절로 넘어가요.'}</p>
    <button type="button" onClick={()=>{setConfirmSkip(false);setConfirmEnd(false);}}>취소</button>
    {confirmEnd?<button type="button" className="frp-danger frp-danger-solid" onClick={()=>{setConfirmEnd(false);sendStep({type:'end'},'끝내기');}}>끝내기</button>
    :<button type="button" className="frp-primary" onClick={()=>{setConfirmSkip(false);sendStep({type:'next'},'마지막 승부로');}}>넘어가기</button>}
   </div>
  </div>}
  <p aria-live="polite" className="frp-sent" data-tone={sent?.tone}>{sent?<><span className="frp-sent-icon" aria-hidden="true">{sent.tone==='ok'?'✅':sent.tone==='no'?'⚠️':'📡'}</span> {sent.text}</>:''}</p>
 </main>;
}
