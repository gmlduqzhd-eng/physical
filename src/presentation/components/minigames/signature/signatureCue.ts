import type {SignatureCue,SignatureCueContext,SignatureGameDef} from '../../../../domain/signatureGames';
import {frozen,reversed,stateBeforeCue,type FunState} from '../../../../domain/funLoop';

/** 지금(또는 at으로 지정한) 신호를 만든다. 얼음 동안 지금 신호는 '얼음!'. */
export function cueOf(game:SignatureGameDef,s:FunState,seated:boolean,at?:{phase:'tutorial'|'play'|'climax';index:number}):SignatureCue{
 const phase=at?.phase??(s.phase==='tutorial'||s.phase==='play'||s.phase==='climax'?s.phase:'tutorial');
 // 지난 신호를 다시 그릴 때(결과의 MVP 동작)는 그 신호가 나오기 전 상태로 만든다(보스전: 그때 싸우던 보스).
 const state=at?stateBeforeCue(s,at):s;
 const ctx:SignatureCueContext={phase,index:at?.index??s.cueIndex,seed:s.seed,reversed:at?false:reversed(s),frozen:at?false:frozen(s),seated,teams:s.teams,state};
 if(!at&&frozen(s))return {text:'🧊 얼음!',sub:'3초 동안 그대로 멈춰요',tone:'calm',pose:'freeze'};
 return game.cue(ctx);
}
