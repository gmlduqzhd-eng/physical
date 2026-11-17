import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import type {ExternalFunCommand,FunRemoteSnapshot} from '../application/funCommandBus';
import {createRemoteSender,isValidRoomCode,normalizeRoomCode,openRemoteChannel,remoteConfigured,type RemoteStatus} from '../application/funRemote';
import {TEAM_COLORS,TEAM_NAMES,type FunPhase} from '../domain/funLoop';
import './FunRemotePage.css';

const PHASE:Record<FunPhase,string>={demo:'시범',tutorial:'연습 판',play:'본게임',climax:'마지막 도전',result:'결과 발표'};
const STATUS:Record<RemoteStatus,string>={idle:'연결 전',connecting:'TV에 연결하는 중…',connected:'TV와 연결됐어요',unavailable:'이 기기에서는 연결할 수 없어요',error:'연결이 끊겼어요. TV 버튼으로 계속하고, 잠시 뒤 다시 열어 보세요.'};

/** 선생님 휴대폰 리모컨: 큰 버튼만. 명령은 TV의 대표 게임 화면으로 간다. */
export function FunRemotePage(){
 const [params,setParams]=useSearchParams();
 const room=normalizeRoomCode(params.get('room'));
 const valid=isValidRoomCode(room);
 const [draft,setDraft]=useState(room);
 const [status,setStatus]=useState<RemoteStatus>('idle');
 const [snap,setSnap]=useState<FunRemoteSnapshot|null>(null);
 const [sent,setSent]=useState('');
 const sender=useRef<ReturnType<typeof createRemoteSender>|null>(null);
 useEffect(()=>{
  if(!valid)return;
  const channel=openRemoteChannel(room);
  if(!channel){setStatus('unavailable');return;}
  const s=createRemoteSender(channel,{onState:setSnap,onStatus:setStatus});
  sender.current=s;
  return ()=>{sender.current=null;s.close();};
 },[room,valid]);
 const send=(cmd:ExternalFunCommand,label:string)=>{if(!sender.current)return;sender.current.send(cmd);setSent(label);try{navigator.vibrate?.(30);}catch{/* 진동 없음 */}};
 const teams=snap?.teams??2;
 const scoring=!!snap&&snap.phase!=='demo'&&snap.phase!=='result';
 const ready=status==='connected';
 const teamRows=useMemo(()=>Array.from({length:teams},(_,i)=>i),[teams]);
 if(!valid)return <main className="fun-remote-page">
  <h1>📱 대표 게임 리모컨</h1>
  <p>TV 화면의 ‘📱 휴대폰 리모컨’에 나온 방 코드 6자리를 넣어요.</p>
  <form onSubmit={e=>{e.preventDefault();setParams({room:normalizeRoomCode(draft)});}}>
   <label>방 코드<input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={8} autoCapitalize="characters" autoComplete="off" inputMode="text"/></label>
   <button type="submit" className="frp-primary" disabled={!isValidRoomCode(normalizeRoomCode(draft))}>연결하기</button>
  </form>
  {params.get('room')&&<p role="alert">방 코드가 맞지 않아요. 다시 확인해 주세요.</p>}
 </main>;
 return <main className="fun-remote-page" data-status={status}>
  <header>
   <h1>📱 리모컨 · {room}</h1>
   <p role="status" className="frp-status" data-status={status}>{STATUS[status]}</p>
   {!remoteConfigured()&&<p className="frp-note">실시간 연결이 설정되지 않은 사이트예요. 같은 기기의 다른 창에서만 동작해요.</p>}
  </header>
  {snap?<section className="frp-snap" aria-label="TV 상태">
   <p><b>{snap.gameName}</b> · {PHASE[snap.phase]}{snap.paused?' · ⏸ 멈춤':''} · ⏱ {snap.secondsLeft}초</p>
   {snap.cue&&<p className="frp-cue">{snap.cue}</p>}
  </section>:<p className="frp-note">{ready?'TV 화면을 기다려요. TV에서 대표 게임을 열어 두세요.':''}</p>}
  <div className="frp-main">
   <button type="button" className="frp-primary" disabled={!ready} onClick={()=>send({type:'next'},'다음')}>▶ 다음</button>
   <button type="button" disabled={!ready} onClick={()=>send({type:'pause'},snap?.paused?'다시 시작':'일시정지')}>{snap?.paused?'▶ 다시 시작':'⏸ 일시정지'}</button>
  </div>
  <section className="frp-teams" aria-label="팀 점수">
   {teamRows.map(i=><div key={i} className="frp-team" style={{'--team':TEAM_COLORS[i]} as React.CSSProperties}>
    <b>{teams===1?'우리 반':TEAM_NAMES[i]} {snap?.scores[i]??0}</b>
    <button type="button" disabled={!ready||!scoring} aria-label={`${TEAM_NAMES[i]} 1점 빼기`} onClick={()=>send({type:'score',team:i,delta:-1},`${TEAM_NAMES[i]} −1`)}>−1</button>
    <button type="button" disabled={!ready||!scoring} aria-label={`${TEAM_NAMES[i]} 1점 더하기`} onClick={()=>send({type:'score',team:i,delta:1},`${TEAM_NAMES[i]} +1`)}>+1</button>
   </div>)}
  </section>
  <div className="frp-extra">
   <button type="button" disabled={!ready||!scoring} onClick={()=>send({type:'scoreAll',delta:1},'모든 팀 +1')}>👍 모든 팀 +1</button>
   <button type="button" disabled={!ready||!scoring} onClick={()=>send({type:'event',event:'golden'},'황금 신호')}>✨ 황금 신호</button>
   <button type="button" disabled={!ready||!scoring} onClick={()=>send({type:'event',event:'reverse'},'거꾸로')}>🔄 거꾸로</button>
   <button type="button" disabled={!ready||!scoring} onClick={()=>send({type:'event',event:'freeze'},'얼음')}>🧊 얼음</button>
   <button type="button" disabled={!ready||!scoring||!snap?.comboFull} onClick={()=>send({type:'special'},'필살기')}>💥 필살기</button>
   <button type="button" className="frp-danger" disabled={!ready||snap?.phase==='result'} onClick={()=>send({type:'end'},'끝내기')}>■ 끝내기</button>
  </div>
  <p aria-live="polite" className="frp-sent">{sent&&`보냈어요: ${sent}`}</p>
 </main>;
}
