import {COMBO_MAX,COMBO_PER_POINT,stateBeforeCue,type FunState,type FunTiming} from '../funLoop.js';
import {defineSignatureGame,pickCue} from './define.js';
import type {Pose,SignatureCue,SignatureCueContext} from './types.js';

/**
 * 우리 반 보스전: 팀이 약점 동작을 해낼 때마다 선생님이 그 팀의 '공격' 버튼을 누르고, 보스 HP가 줄어든다.
 * 보스 셋을 차례로 물리치면 승리. 센서는 쓰지 않는다(선생님 판정). 보스 원정·체력 미션의 재미를 한 판으로 모았다.
 */
export interface Boss {id:string;name:string;emoji:string;hp:number;weak:string;weakSeated:string;pose:Pose}
export const BOSSES:readonly Boss[]=[
 {id:'slime',name:'끈적 슬라임',emoji:'🟢',hp:10,weak:'팔 벌려 높이 뛰기 5번',weakSeated:'두 팔 위로 쭉 뻗기 5번',pose:'jump'},
 {id:'golem',name:'바위 골렘',emoji:'🪨',hp:14,weak:'무릎 굽혔다 펴기 5번',weakSeated:'발 구르기 10번',pose:'squat'},
 {id:'dragon',name:'번개 드래곤',emoji:'🐉',hp:18,weak:'제자리 빠르게 달리기 10초',weakSeated:'앉아서 팔 빠르게 흔들기 10초',pose:'run'},
];
/** 기본(2팀) HP 합. 실제 HP는 팀 수·시간에 맞춰 bossesFor()가 정한다. */
export const BOSS_TOTAL_HP=BOSSES.reduce((n,b)=>n+b.hp,0);
export const SPECIAL_DAMAGE=5,CLIMAX_MULTIPLIER=2;
/** 한 팀이 한 신호에 약점 동작을 해낼 것으로 보는 비율. */
const EXPECTED_HIT_RATE=0.7;
/** 동작 이름에 적힌 초('10초')를 읽는다. 없으면 undefined. */
export const secondsIn=(move:string):number|undefined=>{const m=/(\d+)초/.exec(move);return m?Number(m[1]):undefined;};
/** 약점 동작 신호의 길이(초): '10초' 동작은 동작 시간 + 준비 2초, 나머지는 게임 기본 간격. */
export const weakCueSeconds=(boss:Pick<Boss,'weak'>,timing:Pick<FunTiming,'cueSeconds'>)=>{const sec=secondsIn(boss.weak);return sec?sec+2:timing.cueSeconds;};
/**
 * 기대 피해를 신호 하나하나 따라가며 센다(신호 길이가 보스마다 다르므로: 드래곤의 '10초 달리기'는 12초).
 * 팀마다 공격 신호 하나에 EXPECTED_HIT_RATE만큼 공격하고, 콤보가 차면 필살기를 쓴다고 본다(본게임).
 * 세 번째 신호마다 쉬는 신호. 남은 시간이 4초보다 짧은 신호는 세지 않는다.
 * play = 본게임 피해(필살기 포함), total = 마지막 승부(2배)까지 더한 피해.
 */
export function expectedDamage(teams:number,timing:FunTiming,bosses:readonly Pick<Boss,'hp'|'weak'>[]=BOSSES):{play:number;total:number}{
 const t=Math.max(1,teams);
 let dmg=0,combo=0,play=0;
 const bossAt=(d:number)=>{let left=d;for(let i=0;i<bosses.length;i++){if(left<bosses[i].hp)return bosses[i];left-=bosses[i].hp;}return bosses[bosses.length-1];};
 for(const phase of ['play','climax'] as const){
  const length=timing[phase];
  for(let at=0,index=0;at<length;index++){
   const rest=index%3===2;
   const len=rest?timing.cueSeconds:weakCueSeconds(bossAt(dmg),timing);
   if(!rest&&length-at>=4){
    const hits=t*EXPECTED_HIT_RATE;
    dmg+=hits*(phase==='climax'?CLIMAX_MULTIPLIER:1);
    if(phase==='play'){combo+=hits*COMBO_PER_POINT;while(combo>=COMBO_MAX){combo-=COMBO_MAX;dmg+=SPECIAL_DAMAGE;}}
   }
   at+=len;
  }
  if(phase==='play')play=dmg;
 }
 return {play,total:dmg};
}
const splitHp=(target:number):Boss[]=>{
 let used=0;
 return BOSSES.map((b,i)=>{
  const hp=i===BOSSES.length-1?target-used:Math.max(2,Math.round(target*b.hp/BOSS_TOTAL_HP));
  used+=hp;return {...b,hp};
 });
};
/**
 * 팀 수·시간에 맞춘 보스 HP. 본게임 기대 피해의 1.3배(마지막 승부가 거의 늘 나오게),
 * 마지막 승부까지 더한 기대 피해의 1.02배를 넘지 않게 잡고, 보스 셋에 10:14:18로 나눈다.
 * 기대 피해에는 깜짝 '황금 신호(2배)'를 넣지 않았으므로, 실제 판(엔진·황금 신호 포함)으로 무작위 시뮬레이션하면
 * 팀마다 신호당 70% 성공일 때 1~4팀 모두 이기는 판 83~94%, 마지막 승부까지 가는 판 98~100%다(scripts/sig-round4·round5 테스트).
 * 드래곤 신호가 길어 피해 속도가 보스마다 다르므로, HP를 정하고 다시 세기를 몇 번 되풀이해 맞춘다.
 */
export function bossesFor(teams:number,timing:FunTiming):Boss[]{
 const pick=(bosses:readonly Boss[])=>{const {play,total}=expectedDamage(teams,timing,bosses);return Math.max(BOSSES.length*2,Math.min(Math.floor(total*1.02),Math.ceil(play*1.3)));};
 let target=pick(BOSSES);
 for(let k=0;k<8;k++){const next=pick(splitHp(target));if(next===target)break;target=next;}
 return splitHp(target);
}
export const bossTotalHp=(s:Pick<FunState,'teams'|'timing'>)=>bossesFor(s.teams,s.timing).reduce((n,b)=>n+b.hp,0);
const REST:readonly {text:string;sub:string}[]=[
 {text:'숨 고르기',sub:'코로 들이쉬고 입으로 후— 다음 공격을 준비해요'},
 {text:'방패 자세!',sub:'두 팔을 앞으로 모으고 3초 버텨요'},
];

/** 지금까지 보스에게 준 피해. 본게임 점수 1 = 1, 마지막 승부(총공격)는 2배, 필살기는 5. */
export function bossDamage(s:FunState):number{
 let dmg=0;
 for(const [key,v] of Object.entries(s.cueHits))dmg+=v*(key.startsWith('climax:')?CLIMAX_MULTIPLIER:1);
 return dmg+s.specials*SPECIAL_DAMAGE;
}
/** 지금 싸우는 보스와 남은 HP. 다 물리쳤으면 boss는 마지막 보스, defeated=3. */
export function bossStatus(s:FunState):{boss:Boss;index:number;hpLeft:number;defeated:number;done:boolean}{
 const bosses=bossesFor(s.teams,s.timing);
 let left=bossDamage(s);
 for(let i=0;i<bosses.length;i++){
  if(left<bosses[i].hp)return {boss:bosses[i],index:i,hpLeft:bosses[i].hp-left,defeated:i,done:false};
  left-=bosses[i].hp;
 }
 const last=bosses.length-1;
 return {boss:bosses[last],index:last,hpLeft:0,defeated:bosses.length,done:true};
}

export function bossRaidCue(ctx:SignatureCueContext):SignatureCue{
 // 신호 내용은 그 신호가 시작될 때 싸우던 보스로 정한다(신호 도중에 보스를 쓰러뜨려도 6초 신호에 '10초 달리기'가 끼지 않는다).
 const {boss}=bossStatus(ctx.phase==='tutorial'?ctx.state:stateBeforeCue(ctx.state,{phase:ctx.phase,index:ctx.index}));
 if(ctx.phase==='tutorial'){
  const weak=ctx.seated?BOSSES[0].weakSeated:BOSSES[0].weak;
  return ctx.index%2===0
   ?{text:`지금 ${weak}!`,sub:'🎯 허수아비로 연습해요. 해낸 팀은 공격 버튼을 눌러요(연습 점수는 본게임에서 0부터)',icon:'🎯',move:weak,pose:BOSSES[0].pose}
   :{text:'숨 고르기',sub:'연습 판이에요. 다음 신호를 기다려요',icon:'🌬️',tone:'rest',pose:'stand',scorable:false};
 }
 // 세 번째 신호마다 쉬는 신호: 계속 뛰지 않게.
 if(ctx.index%3===2){const r=pickCue(REST,ctx);return {text:r.text,sub:r.sub,icon:'🛡️',tone:'rest',pose:'armsFront',scorable:false};}
 const weak=ctx.seated?boss.weakSeated:boss.weak;
 const climax=ctx.phase==='climax';
 return {
  text:`${weak}!`,
  sub:`${boss.emoji} ${boss.name}의 약점이에요${climax?' · 총공격! 피해 2배':''}`,
  icon:boss.emoji,tone:climax?'gold':undefined,move:weak,pose:boss.pose,
  // '10초' 동작은 신호를 그만큼 길게 보여 준다(동작 10초 + 준비 2초).
  ...(secondsIn(weak)?{seconds:secondsIn(weak)!+2}:{}),
 };
}

export const bossRaid=defineSignatureGame({
 id:'sig-boss-raid',ready:true,
 name:'우리 반 보스전',emoji:'🐉',
 oneLine:'보스의 약점 동작을 해내면 공격 성공! 반 전체가 힘을 모아 보스 셋을 물리쳐요.',
 rules:['화면에 나온 보스의 약점 동작을 팀이 함께 해내요.','해낸 팀은 선생님이 공격 버튼을 눌러 보스 HP를 깎아요. 콤보가 꽉 차면 필살기!','보스 셋을 모두 물리치거나 시간이 끝나면 결과 발표!'],
 concept:'심폐 지구력',
 reflection:'숨이 가장 차오른 동작은 무엇이었나요? 쉬는 신호 때 몸은 어떻게 느껴졌나요?',
 nextChallenge:'다음에는 쉬는 신호 없이 보스 하나를 더 빨리 물리쳐 봐요.',
 scoringHint:'약점 동작을 해낸 팀마다 공격 +1 · 쉬는 신호 때는 누르지 않아요',
 scoreLabel:'공격',
 seatedNote:'약점 동작을 앉아서 하는 동작(팔 뻗기·발 구르기·팔 흔들기)으로 바꿔요.',
 demo:[
  {pose:'stand',caption:'보스가 나타났어요!'},{pose:'jump',caption:'약점 동작: 팔 벌려 높이 뛰기'},
  {pose:'armsUp',caption:'팀이 해내면 공격 성공 → 보스 HP가 줄어요'},{pose:'armsFront',caption:'쉬는 신호에는 방패 자세로 숨 고르기'},
  {pose:'punch',caption:'콤보가 꽉 차면 필살기!'},
 ],
 timing:{demo:12,tutorial:24,play:150,climax:45,cueSeconds:6},
 teamsDefault:2,teamsMin:1,
 mergedFrom:['expedition-boss','fitness','jump','squat'],
 cue:bossRaidCue,
 isComplete:s=>bossStatus(s).done,
 resultHeadline:s=>{const st=bossStatus(s);return st.done?'보스 셋을 모두 물리쳤어요! 🎉':`보스 ${st.defeated}마리를 물리쳤어요 · ${st.boss.name} HP ${st.hpLeft} 남음`;},
 domain:'운동',subCategory:'체력 대표 게임',
 achievement:{code:'[4체01-02]',title:'기본 체력운동 시도',desc:'기본 체력운동의 방법과 절차를 익혀 자신의 수준에 맞게 시도한다.'},
 spaces:['교실','체육관','다목적실','운동장'],minutes:6,players:{min:4,max:30},intensity:'높음',
 safetyTips:['뛰는 동작 전에 앞뒤 친구와 간격을 넓혀요.','숨이 너무 차면 쉬는 신호처럼 방패 자세로 쉬어도 돼요.'],
 teachingTips:['쉬는 신호 때는 공격 버튼을 누르지 말고 숨 고르기를 함께 해 주세요.','팀이 하나면 반 전체가 한 팀으로 보스와 겨뤄요.'],
});
