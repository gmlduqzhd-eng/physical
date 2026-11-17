/* eslint-disable react-refresh/only-export-components -- 모듈 파일은 화면 부품 묶음(SignatureModule)을 내보낸다. */
import {SIGNAL_CARDS,cardFor} from '../../../../../domain/signature/sig-signal-captain';
import type {SignatureModule,SignatureModuleProps} from '../moduleTypes';

/** 신호 대장: 지금 쓰는 규칙 카드를 카드 줄로 보여 준다. */
function CardRail({state,seated,cue}:SignatureModuleProps){
 if(state.phase!=='tutorial'&&state.phase!=='play'&&state.phase!=='climax')return null;
 const now=cardFor({phase:state.phase,index:state.cueIndex});
 return <div className="sig-cards">
  <ol aria-label="규칙 카드">{SIGNAL_CARDS.map(c=><li key={c.id} data-now={c.id===now.id||undefined}><span aria-hidden="true">{c.icon}</span>{c.title.replace(' 카드','')}</li>)}</ol>
  {/* 신호 아래에 이미 규칙이 보이면 다시 쓰지 않는다(함정 신호처럼 다른 안내가 나올 때만 보인다). */}
  {cue.sub!==(seated?now.seatedRule:now.rule)&&<p><b>지금 규칙</b> {seated?now.seatedRule:now.rule}</p>}
 </div>;
}
const signalCaptainModule:SignatureModule={Panel:CardRail};
export default signalCaptainModule;
