import {useEffect,useState} from 'react';
import {MAP_GESTURES,easyMapWords,type MapGesture} from '../../domain/cooperativeMap';
import {STATIONS,STATION_NAMES,type ExpeditionSnapshot} from '../../domain/flagship';
import {StationScanner} from './StationScanner';
import {withParticle} from '../../domain/koreanParticle';
import type {ExpeditionAction} from './MapGame';

const STEP_NAMES=['① 힌트 묻기','② 걸어가 확인','③ 같은 길 고르기'] as const,STEP_ICONS=['🗣️','🚶','🗳️'];
export function CooperativeMapGame({snapshot:s,send,practice,disabled}:{snapshot:ExpeditionSnapshot;send:ExpeditionAction;practice:boolean;disabled:boolean}){
 const me=s.groups.find(g=>g.id===s.groupId)??s.groups[0],brief=s.mapRules?.brief;
 const [gesture,setGesture]=useState<MapGesture|''>(''),[confirmed,setConfirmed]=useState(false),[token,setToken]=useState(''),[message,setMessage]=useState('');
 // 처음 보는 선생님도 따라가도록 ①·②·③ 중 지금 단계 하나만 크게 보여 준다(단계 버튼으로 앞뒤 이동 가능).
 const [step,setStep]=useState(0);
 useEffect(()=>{setGesture('');setConfirmed(false);setToken('');setMessage('');setStep(0);},[s.phase,s.runId]);
 const names=(text:string)=>text.replaceAll('forest','숲').replaceAll('river','강').replaceAll('tower','탑');
 return <div className="cooperative-map" data-cooperative-map="true">
  <div className="map-route" aria-label="함께 연결한 지도">{STATIONS.map(station=><span key={station} data-visited={me.visited.includes(station)}>{STATION_NAMES[station]}{me.visited.includes(station)?' ✓':''}</span>)}</div>
  <p className="flagship-progress">함께 연 문 {s.phase}/3 · 길 세 개를 차례로 찾아요.</p>
  {s.phase<3?<>
   <ol className="map-steps" aria-label="이렇게 해요">{STEP_NAMES.map((name,i)=><li key={name}><button type="button" aria-current={step===i?'step':undefined} data-done={i<step||undefined} onClick={()=>setStep(i)}><span aria-hidden="true">{STEP_ICONS[i]}</span>{name}</button></li>)}</ol>
   <section className="map-step-panel" aria-label={`지금 단계: ${STEP_NAMES[step]}`}>
   {step===0&&<>
    <h3>다른 모둠에게 물어봐요</h3>
    <p>우리 모둠 힌트를 말과 몸짓으로 알려 주고, 다른 모둠 힌트도 들어요. 화면은 보여 주지 않아요.</p>
    {brief&&<div className="flagship-note map-secret"><strong>{easyMapWords(brief.title)}</strong><p>{easyMapWords(names(brief.text))}</p></div>}
    <button className="flagship-primary map-step-next" onClick={()=>setStep(1)}>다 모았어요 · ② 걸어가 확인</button>
   </>}
   {step===1&&<>
    <h3>걸어가서 확인해요</h3>
    <p>{practice?'짝과 걸어갔다 온 곳의 버튼을 눌러요.':'그곳에 멈춰 서서 안내판 QR을 비춰요.'} 앉아서는 세 곳을 손으로 짚어요.</p>
    <label className="flagship-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>짝과 함께 걸어갔다 온 것(또는 앉아서 짚은 것)을 확인했어요.</label>
    {practice?<div className="flagship-row">{STATIONS.map(station=><button key={station} disabled={disabled||!confirmed} onClick={async()=>{if(await send('visit',{station,movementConfirmed:true}))setMessage(`${STATION_NAMES[station]}에 다녀왔어요. 더 다녀오거나 ③으로 넘어가요.`);}}>{STATION_NAMES[station]} 다녀왔어요</button>)}</div>:<>
     <StationScanner disabled={disabled} onCode={setToken}/><label>안내판 코드<input value={token} maxLength={24} autoComplete="off" onChange={e=>setToken(e.target.value.replace(/[^a-f0-9]/g,''))}/></label>
     <button disabled={disabled||!confirmed||token.length!==24} onClick={async()=>{if(await send('visit',{token,movementConfirmed:true})){setToken('');setMessage('다녀온 곳을 보냈어요. 돌아와서 ③에서 몸짓 약속을 골라요.');}}}>멈춰서 확인 보내기</button>
    </>}
    <button className="flagship-primary map-step-next" disabled={!me.visited.length} onClick={()=>setStep(2)}>③ 같은 길 고르기로</button>
   </>}
   {step===2&&<>
    <h3>모두 같은 길을 골라요</h3>
    {!confirmed&&<p role="note">② 단계에서 걸어갔다 온 것을 먼저 확인해요.</p>}
    <fieldset className="map-gesture"><legend>{s.phase+1}번 문의 몸짓 약속은?</legend><div className="flagship-row">{MAP_GESTURES.map(g=><button key={g.id} aria-pressed={gesture===g.id} disabled={disabled} onClick={()=>setGesture(g.id)}><span aria-hidden="true">{g.icon} </span>{g.label}</button>)}</div></fieldset>
    <div className="flagship-row" aria-label="다녀온 다음 길">{STATIONS.map(station=><button key={station} disabled={disabled||!confirmed||!gesture||!me.visited.includes(station)} aria-pressed={me.vote===station} onClick={async()=>{if(await send('vote',{station,gesture}))setMessage('고른 길과 몸짓을 보냈어요. 문이 안 열리면 힌트를 다시 나누고 바꿔 골라요.');}}>{withParticle(STATION_NAMES[station],'으로')} 함께 가요</button>)}</div>
   </>}
   </section>
   <p role="status">{message||'모든 모둠이 같은 길과 맞는 몸짓 약속을 고르면 문이 열려요.'}</p>
   <details><summary>우리 반 선택·막힌 곳 확인</summary><p>길 선택 {s.groups.filter(g=>g.vote).length}/{s.groups.length}모둠</p>{s.groups.map(g=><p key={g.id}>{g.name}: {g.vote?`${names(g.vote)} · ${MAP_GESTURES.find(m=>m.id===g.voteGesture)?.label??'약속 선택 전'}`:'힌트 모으는 중'}</p>)}<p>다른 모둠의 비밀 힌트나 정답은 화면에 저절로 나오지 않아요. 연결이 끊기면 같은 수업으로 재입장해요.</p></details>
  </>:<p className="flagship-win">세 문을 모두 열었어요!</p>}
 </div>;
}
