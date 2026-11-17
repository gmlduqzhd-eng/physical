import type {SignatureCue,SignatureCueContext,SignatureGameDef} from '../../../../domain/signatureGames';
import {frozen,reversed,type FunState} from '../../../../domain/funLoop';

/** 지금(또는 at으로 지정한) 신호를 만든다. 얼음 동안 지금 신호는 '얼음!'. */
export function cueOf(game:SignatureGameDef,s:FunState,seated:boolean,at?:{phase:'tutorial'|'play'|'climax';index:number}):SignatureCue{
 const phase=at?.phase??(s.phase==='tutorial'||s.phase==='play'||s.phase==='climax'?s.phase:'tutorial');
 const ctx:SignatureCueContext={phase,index:at?.index??s.cueIndex,seed:s.seed,reversed:reversed(s),frozen:frozen(s),seated,teams:s.teams,state:s};
 if(!at&&frozen(s))return {text:'🧊 얼음!',sub:'3초 동안 그대로 멈춰요',tone:'calm',pose:'freeze'};
 return game.cue(ctx);
}
