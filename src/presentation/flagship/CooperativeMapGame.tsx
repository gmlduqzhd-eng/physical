import {useEffect,useState} from 'react';
import {MAP_GESTURES,type MapGesture} from '../../domain/cooperativeMap';
import {STATIONS,STATION_NAMES,type ExpeditionSnapshot} from '../../domain/flagship';
import {StationScanner} from './StationScanner';
import type {ExpeditionAction} from './MapGame';

export function CooperativeMapGame({snapshot:s,send,practice,disabled}:{snapshot:ExpeditionSnapshot;send:ExpeditionAction;practice:boolean;disabled:boolean}){
 const me=s.groups.find(g=>g.id===s.groupId)??s.groups[0],brief=s.mapRules?.brief;
 const [gesture,setGesture]=useState<MapGesture|''>(''),[confirmed,setConfirmed]=useState(false),[token,setToken]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{setGesture('');setConfirmed(false);setToken('');setMessage('');},[s.phase,s.runId]);
 const names=(text:string)=>text.replaceAll('forest','숲').replaceAll('river','강').replaceAll('tower','탑');
 return <div className="cooperative-map" data-cooperative-map="true">
  <div className="map-route" aria-label="함께 연결한 지도">{STATIONS.map(station=><span key={station} data-visited={me.visited.includes(station)}>{STATION_NAMES[station]}{me.visited.includes(station)?' ✓':''}</span>)}</div>
  <p className="flagship-progress">함께 연 관문 {s.phase}/3 · 길과 운반 약속을 모두 연결해요.</p>
  {brief&&<section className="flagship-note map-secret"><h3>{brief.title}</h3><p>{names(brief.text)}</p><p>다른 모둠에게 화면을 넘기기보다 말·몸짓으로 전해요. 실제 동작과 이동은 사람이 확인해요.</p></section>}
  {s.phase<3?<>
   <ol className="activity-progress"><li><strong>1. 단서 나누기</strong><small>첫 길·마지막 길·이번 운반 약속을 물어봐요.</small></li><li><strong>2. 걷고 귀환하기</strong><small>앉은 대안은 세 위치를 손으로 짚어요.</small></li><li><strong>3. 함께 고르기</strong><small>다녀온 길과 약속 동작을 모둠이 선택해요.</small></li></ol>
   <label className="flagship-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>짝과 이동·귀환 또는 앉은 대안 수행을 직접 확인했어요.</label>
   {practice?<div className="flagship-row">{STATIONS.map(station=><button key={station} disabled={disabled||!confirmed} onClick={()=>void send('visit',{station,movementConfirmed:true})}>{STATION_NAMES[station]} 방문 연습</button>)}</div>:<>
    <StationScanner disabled={disabled} onCode={setToken}/><label>탐사 지점 코드<input value={token} maxLength={24} autoComplete="off" onChange={e=>setToken(e.target.value.replace(/[^a-f0-9]/g,''))}/></label>
    <button disabled={disabled||!confirmed||token.length!==24} onClick={async()=>{if(await send('visit',{token,movementConfirmed:true})){setToken('');setMessage('지점 확인을 보냈어요. 돌아와서 운반 약속을 맞춰요.');}}}>멈춰서 지점 확인</button>
   </>}
   <fieldset className="map-gesture"><legend>{s.phase+1}관문의 운반 약속은?</legend><p>운반 약속을 받은 모둠에 물어보고, 함께 작은 동작으로 표현해요.</p><div className="flagship-row">{MAP_GESTURES.map(g=><button key={g.id} aria-pressed={gesture===g.id} disabled={disabled} onClick={()=>setGesture(g.id)}><span aria-hidden="true">{g.icon} </span>{g.label}</button>)}</div></fieldset>
   <h3>다녀온 다음 길을 골라요</h3><div className="flagship-row">{STATIONS.map(station=><button key={station} disabled={disabled||!confirmed||!gesture||!me.visited.includes(station)} aria-pressed={me.vote===station} onClick={async()=>{if(await send('vote',{station,gesture}))setMessage('길·약속 선택을 보냈어요. 관문이 열리지 않으면 단서를 다시 나누고 선택을 바꿔요.');}}>{STATION_NAMES[station]}로 함께 이동</button>)}</div>
   <p role="status">{message||'같은 길과 맞는 운반 약속을 모든 모둠이 선택하면 관문이 열려요.'}</p>
   <details><summary>우리 반 선택·막힌 곳 확인</summary><p>길 선택 {s.groups.filter(g=>g.vote).length}/{s.groups.length}모둠</p>{s.groups.map(g=><p key={g.id}>{g.name}: {g.vote?`${names(g.vote)} · ${MAP_GESTURES.find(m=>m.id===g.voteGesture)?.label??'약속 선택 전'}`:'단서 연결 중'}</p>)}<p>다른 모둠의 비밀 단서나 정답을 자동으로 공개하지 않아요. 연결이 끊기면 같은 수업으로 재입장해요.</p></details>
  </>:<p className="flagship-win">길 단서와 운반 약속이 모두 연결됐어요!</p>}
 </div>;
}
