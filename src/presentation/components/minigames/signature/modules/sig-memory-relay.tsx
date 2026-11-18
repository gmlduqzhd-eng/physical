/* eslint-disable react-refresh/only-export-components -- 모듈 파일은 화면 부품 묶음(SignatureModule)을 내보낸다. */
import {useState} from 'react';
import {cueIntervalMs} from '../../../../../domain/funLoop';
import {CLIMAX_POINTS,MAX_LENGTH,MEMORY_TILES,VARIATION_TEXT,longestSuccess,memoryRelayGate,memoryResultLine,memoryStage,currentTurnTeam,turnTeamNameAt,sequenceFor,sequenceLength,showMs,turnTooShort,variationFor} from '../../../../../domain/signature/sig-memory-relay';
import type {SignatureModule,SignatureModuleProps} from '../moduleTypes';
import './sig-memory-relay.css';

type Phase='tutorial'|'play'|'climax';
const isTurnPhase=(p:string):p is Phase=>p==='tutorial'||p==='play'||p==='climax';

/** 외우기 동안 큰 모양 타일, 가려지면 번호만 남은 ? 타일. 선생님은 ‘한 번 더 보기’로 다시 보여 줄 수 있다(점수는 그대로). */
function MemoryPanel({state,seated}:SignatureModuleProps){
 const [peek,setPeek]=useState('');
 if(!isTurnPhase(state.phase))return null;
 if(turnTooShort(state))return <div className="sig-mem" data-stage="short"><p className="sig-mem-stage"><span role="status">⏳ 시간이 얼마 남지 않았어요 · 새 차례는 다음 단계에서 시작해요</span></p></div>;
 const phase=state.phase,index=state.cueIndex,turnId=`${phase}:${index}`;
 const len=sequenceLength(state,phase,index);
 const seq=sequenceFor(state.seed,phase,index,len);
 const stage=memoryStage(state);
 const visible=stage==='show'||peek===turnId;
 const variation=variationFor(state,phase,index);
 const left=Math.max(0,Math.ceil((showMs(len,cueIntervalMs(state),variation)-state.cueMs)/1000));
 const reversed=state.event?.kind==='reverse'||variation==='reverse'||variation==='reverse-quick';
 return <div className="sig-mem" data-stage={stage}>
  {/* 초 숫자는 낭독 영역 밖에 둔다(매초 읽지 않게). */}
  {variation!=='normal'&&<p className="sig-mem-variation">{VARIATION_TEXT[variation]}</p>}
  <p className="sig-mem-stage"><span role="status">{stage==='show'?'👀 외워요!':`🙈 가려졌어요 → ${turnTeamNameAt(state,state.phase==='climax'?'climax':state.phase==='play'?'play':'tutorial',index)}이 ${reversed?'마지막 모양부터 거꾸로':'차례대로'} 해요`}</span>{stage==='show'&&<span aria-hidden="true"> {left}초 뒤에 가려져요</span>}</p>
  <ol className="sig-mem-tiles" aria-label={`${len}개 순서`} data-count={len}>
   {seq.map((t,i)=><li key={i} className="sig-mem-tile" style={visible?{borderColor:t.color}:undefined} data-hidden={!visible||undefined}>
    <span className="sig-mem-no">{i+1}</span>
    {visible?<><span className="sig-mem-shape" style={{color:t.color}} aria-hidden="true">{t.shape}</span><b>{seated?t.seated:t.action}</b><span className="sr-only">{t.name}</span></>:<span className="sig-mem-shape" aria-label="가려진 모양">?</span>}
   </li>)}
  </ol>
  <div className="sig-mem-foot">
   <span>길이 {len}/{MAX_LENGTH} · {longestSuccess(state)?`가장 긴 성공 ${longestSuccess(state)}개`:'아직 성공 기록이 없어요'}</span>
   {stage==='perform'&&<button type="button" onClick={()=>setPeek(peek===turnId?'':turnId)} aria-pressed={peek===turnId}>{peek===turnId?'🙈 다시 가리기':'👀 한 번 더 보기'}</button>}
  </div>
  <ul className="sig-mem-legend" aria-label="모양 뜻">{MEMORY_TILES.map(t=><li key={t.id}><span style={{color:t.color}} aria-hidden="true">{t.shape}</span> {seated?t.seated:t.action}</li>)}</ul>
 </div>;
}

function MemoryResult({state}:SignatureModuleProps){
 return <p className="sig-mem-result">{memoryResultLine(state)}</p>;
}

const memoryRelayModule:SignatureModule={
 Panel:MemoryPanel,Result:MemoryResult,hideFigure:true,wide:true,
 // '모든 팀 +1' 대신 차례 팀의 성공 버튼(아래 controls)만 둔다. A 키도 차례 팀 성공으로 바뀐다.
 scoreAllLabel:'차례 팀 성공',scoreAllButton:false,teamKeysLabel:'1~4 차례 팀 성공 (Shift −1 정정)',
 controls:({state})=>{
  if(!isTurnPhase(state.phase))return [];
  const team=currentTurnTeam(state),points=state.phase==='climax'?CLIMAX_POINTS:1;
  // 버튼도 키보드·리모컨과 같은 규칙(memoryRelayGate)으로 켜고 끈다.
  const allowed=!state.paused&&!!memoryRelayGate(state,{type:'score',team,delta:1});
  return [{label:`✔ ${turnTeamNameAt(state,state.phase==='climax'?'climax':state.phase==='play'?'play':'tutorial',state.cueIndex)} 성공 +${points}`,command:{type:'score',team,delta:points},disabled:!allowed,hint:String(team+1),tone:'primary'}];
 },
};
export default memoryRelayModule;
