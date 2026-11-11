import {phoneSequence,type PhonePlay} from './phonePlayCatalog.js';
export type PhoneStrategy='core'|'small'|'seated';
export function phoneStrategies(play:PhonePlay,round:number){
 const choices=[{id:'core' as const,label:play.rounds[round],guide:play.rules[round]},{id:'small' as const,label:'작고 여유 있게',guide:play.easy},{id:'seated' as const,label:'앉은 동작으로',guide:play.seated}];
 return choices.map((_,i)=>choices[(i+round)%choices.length]);
}
export function phoneRoles(play:PhonePlay,players:number,round:number){
 const roles=play.id==='phone-play-008'?['자기 자리에서 걷기 또는 앉은 발 디딤','작게 팔 펴기','가슴 앞에서 손 모으기']:play.cues;
 return Array.from({length:players},(_,i)=>({seat:i+1,role:roles[(i+round)%roles.length]}));
}
export function phoneRoundCues(play:PhonePlay,round:number,level:string,created:string[]=[],strategy:PhoneStrategy='core'){
 if(strategy==='seated')return [play.seated];
 if(strategy==='small')return [play.easy,...phoneSequence(play,round,true)];
 if(play.kind==='create'&&created.length>=2)return created;
 const cues=phoneSequence(play,round,level==='쉬운 방법');
 return level==='추가 도전'&&play.kind!=='memory'?[...cues].reverse():cues;
}
export function phoneNextHint(play:PhonePlay,outcome:'complete'|'partial',round:number){
 return outcome==='partial'?`‘${play.rounds[Math.min(2,round+1)]}’에서는 ${play.easy}`:`다음 과제에서는 ${play.rules[Math.min(2,round+1)]}`;
}
