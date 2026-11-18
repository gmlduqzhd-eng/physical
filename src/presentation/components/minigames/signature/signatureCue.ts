import type {SignatureCue,SignatureCueContext,SignatureGameDef} from '../../../../domain/signatureGames';
import {frozen,reversed,stateBeforeCue,type FunState} from '../../../../domain/funLoop';
import type {SignatureModule} from './moduleTypes';

/** 지금(또는 at으로 지정한) 신호를 만든다. 얼음 동안 지금 신호는 '얼음!'. */
export function cueOf(game:SignatureGameDef,s:FunState,seated:boolean,at?:{phase:'tutorial'|'play'|'climax';index:number}):SignatureCue{
 const phase=at?.phase??(s.phase==='tutorial'||s.phase==='play'||s.phase==='climax'?s.phase:'tutorial');
 // 지난 신호를 다시 그릴 때(결과의 MVP 동작)는 그 신호가 나오기 전 상태로 만든다(보스전: 그때 싸우던 보스).
 const state=at?stateBeforeCue(s,at):s;
 const ctx:SignatureCueContext={phase,index:at?.index??s.cueIndex,seed:s.seed,reversed:at?false:reversed(s),frozen:at?false:frozen(s),seated,teams:s.teams,state};
 if(!at&&frozen(s))return {text:'🧊 얼음!',sub:'3초 동안 그대로 멈춰요',tone:'calm',pose:'freeze'};
 return game.cue(ctx);
}

/**
 * 게임마다 실제로 쓰는 단축키만 안내한다(빙고는 점수판 ±가 없고, 필살기가 없는 놀이는 S가 없다).
 */
export function shortcutHelp(game:SignatureGameDef,mod:SignatureModule):string{
 const parts=['Space 다음','P 일시정지'];
 if(mod.scoreButtons!==false){
  parts.push(mod.teamKeysLabel??'1~4 팀 +1 (Shift −1)');
  parts.push(`A ${mod.scoreAllLabel??'모든 팀 +1'}`);
 }
 const golden=[...(game.surprises?.play??['golden']),...(game.surprises?.climax??['golden'])].includes('golden');
 if(golden)parts.push('G 황금 신호');
 if(mod.special)parts.push('S 한 방 공격');
 return parts.join(' · ');
}
