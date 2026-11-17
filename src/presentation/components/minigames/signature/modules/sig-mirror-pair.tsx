/* eslint-disable react-refresh/only-export-components -- 모듈 파일은 화면 부품 묶음(SignatureModule)을 내보낸다. */
import {TEAM_COLORS,TEAM_NAMES} from '../../../../../domain/funLoop';
import {followerOf,leaderFor,mirrorRound,mirrorStep,type MirrorStep} from '../../../../../domain/signature/sig-mirror-pair';
import {StickFigure} from '../../../fun';
import type {SignatureModule,SignatureModuleProps} from '../moduleTypes';
import './sig-mirror-pair.css';

const STEP_LABEL:readonly [MirrorStep,string][]=[['lead','따라 하기'],['keep','똑같이'],['change','바꾸기'],['find','찾기']];
const QUICK=[1,3,5] as const;

/** 거울 짝꿍: 마주 보는 두 사람(리더·따라 하기), 라운드 단계, 찾은 짝 빠른 셈 버튼. */
function MirrorPanel({state,cue,dispatch}:SignatureModuleProps){
 if(state.phase!=='tutorial'&&state.phase!=='play'&&state.phase!=='climax')return null;
 const tutorial=state.phase==='tutorial';
 const round=tutorial?0:mirrorRound({phase:state.phase,index:state.cueIndex,state});
 const leader=leaderFor(round),follower=followerOf(leader);
 const step=tutorial?(['lead','lead','change','find'] as const)[state.cueIndex%4]:mirrorStep(state.cueIndex);
 const pose=cue.pose??'stand';
 return <div className="sig-mirror">
  <div className="sig-mirror-pair" aria-label={`리더 ${leader}, 따라 하기 ${follower}`}>
   <figure data-role="leader"><StickFigure pose={pose} size={96}/><figcaption><b>{leader}</b> 리더</figcaption></figure>
   <span className="sig-mirror-glass" aria-hidden="true">🪞</span>
   <figure data-role="follower"><span className="sig-mirror-flip"><StickFigure pose={step==='change'?'stand':pose} size={96}/></span><figcaption><b>{follower}</b> 따라 하기</figcaption></figure>
  </div>
  <div className="sig-mirror-side">
   <ol className="sig-mirror-steps" aria-label="라운드 단계">{STEP_LABEL.map(([id,label])=><li key={id} data-now={id===step||undefined}>{label}</li>)}</ol>
   {!tutorial&&<p className="sig-mirror-round">{round+1}라운드 · 다음 라운드는 {follower}이 리더{state.phase==='climax'?' · 두 군데 바꾸기!':''}</p>}
   <div className="sig-mirror-quick" role="group" aria-label="찾은 짝 빠른 셈" data-find={step==='find'||undefined}>
    {Array.from({length:state.teams},(_,t)=><div key={t} className="sig-mirror-team" style={{'--team':TEAM_COLORS[t]} as React.CSSProperties}>
     <span>{state.teams===1?'우리 반':TEAM_NAMES[t]}</span>
     {QUICK.map(n=><button key={n} type="button" aria-label={`${state.teams===1?'우리 반':TEAM_NAMES[t]} 찾은 짝 ${n}쌍 더하기`} onClick={()=>dispatch({type:'score',team:t,delta:n})}>+{n}</button>)}
    </div>)}
   </div>
  </div>
 </div>;
}
const mirrorPairModule:SignatureModule={Panel:MirrorPanel,hideFigure:true};
export default mirrorPairModule;
