import {cueIntervalMs,phaseSeconds,seededRandom,TEAM_NAMES,type FunCommand,type FunState} from '../funLoop.js';
import {defineSignatureGame} from './define.js';
import type {Pose,SignatureCue,SignatureCueContext} from './types.js';

/**
 * 기억 릴레이: 신호 하나가 한 차례다. 차례 앞부분에는 모양 타일 순서를 크게 보여 주고(외우기),
 * 순서가 가려지면 차례인 모둠이 이어서 몸으로 해낸다. 선생님이 ‘성공’을 누르면 다음 차례부터 순서가 하나 늘어난다.
 * 빠진 동작(006)·거꾸로(014)·세 자세(015)·방향(019)·앞옆 갔다 오기(044)·모양 순서 걷기·기억의 발자국·동작 늘리기를 한 판으로 합쳤다.
 */
export interface MemoryTile {id:string;shape:string;name:string;action:string;seated:string;pose:Pose;color:string}
export const MEMORY_TILES:readonly MemoryTile[]=[
 {id:'circle',shape:'●',name:'동그라미',action:'손뼉',seated:'손뼉',pose:'clap',color:'#ef4444'},
 {id:'triangle',shape:'▲',name:'세모',action:'팔 위로',seated:'팔 위로',pose:'armsUp',color:'#f59e0b'},
 {id:'square',shape:'■',name:'네모',action:'무릎 굽히기',seated:'무릎 손으로 치기',pose:'squat',color:'#3b82f6'},
 {id:'star',shape:'★',name:'별',action:'별 모양 점프',seated:'팔 벌려 별 모양',pose:'jump',color:'#22c55e'},
];
export const TUTORIAL_LENGTH=2,START_LENGTH=3,MAX_LENGTH=7,CLIMAX_POINTS=2;

const hitKeys=(s:FunState,phase:'play'|'climax')=>Object.entries(s.cueHits).filter(([k,v])=>v>0&&k.startsWith(`${phase}:`)).map(([k])=>Number(k.split(':')[1]));
/** 한 바퀴(라운드) = 모든 모둠이 한 번씩 차례를 하는 것. 같은 바퀴 안의 모둠은 늘 같은 길이를 받는다. */
export const relayRound=(index:number,teams:number)=>Math.floor(Math.max(0,index)/Math.max(1,teams));
/** 그 단계에서 round 바퀴 전까지, 한 모둠이라도 성공한 바퀴 수. */
function successfulRounds(s:FunState,phase:'play'|'climax',beforeRound:number):number{
 const rounds=new Set(hitKeys(s,phase).map(i=>relayRound(i,s.teams)));
 return [...rounds].filter(r=>r<beforeRound).length;
}
/**
 * 이 차례(단계·신호 번호)의 순서 길이. 연습 판은 늘 2개, 본게임은 3개에서 시작한다.
 * 한 바퀴(모든 모둠이 한 번씩)가 끝날 때마다, 그 바퀴에서 한 모둠이라도 성공했으면 다음 바퀴부터 하나 늘어난다.
 * 그래서 같은 바퀴의 모둠은 모두 같은 길이를 받는다(뒤 순서 모둠만 어려워지지 않음). 마지막 승부는 본게임을 이어받는다. 최대 7개.
 */
export function sequenceLength(s:FunState,phase:'tutorial'|'play'|'climax',index:number):number{
 if(phase==='tutorial')return TUTORIAL_LENGTH;
 const round=relayRound(index,s.teams);
 const done=phase==='play'?successfulRounds(s,'play',round):successfulRounds(s,'play',Infinity)+successfulRounds(s,'climax',round);
 return Math.min(MAX_LENGTH,START_LENGTH+done);
}
/** 같은 (seed, 단계, 번호, 길이)면 늘 같은 순서. 같은 모양이 세 번 이어지지 않는다. */
export function sequenceFor(seed:number,phase:'tutorial'|'play'|'climax',index:number,length:number):MemoryTile[]{
 const salt=phase==='tutorial'?1:phase==='play'?2:3;
 const rnd=seededRandom(seed*613+salt*104729+index*131+length);
 const out:MemoryTile[]=[];
 while(out.length<length){
  const t=MEMORY_TILES[Math.floor(rnd()*MEMORY_TILES.length)];
  const n=out.length;
  if(n>=2&&out[n-1].id===t.id&&out[n-2].id===t.id)continue;
  out.push(t);
 }
 return out;
}
/**
 * 최고 길이(7개)에 닿은 뒤의 변형: 같은 일을 되풀이하지 않게, 7개에서 성공할 때마다
 * '거꾸로'(마지막 모양부터) → '번개'(외우는 시간 절반) → '거꾸로+번개'로 바꿔 간다.
 */
export type MemoryVariation='normal'|'reverse'|'quick'|'reverse-quick';
const VARIATIONS:readonly MemoryVariation[]=['reverse','quick','reverse-quick'];
export function variationFor(s:FunState,phase:'tutorial'|'play'|'climax',index:number):MemoryVariation{
 if(phase==='tutorial'||sequenceLength(s,phase,index)<MAX_LENGTH)return 'normal';
 // 이 바퀴 전에, 최고 길이에서 성공한 바퀴 수(바퀴마다 변형이 하나씩 바뀐다: 같은 바퀴의 모둠은 같은 변형)
 const atMax=(p:'play'|'climax',beforeRound:number)=>{
  const rounds=new Set(hitKeys(s,p).filter(i=>sequenceLength(s,p,i)>=MAX_LENGTH).map(i=>relayRound(i,s.teams)));
  return [...rounds].filter(r=>r<beforeRound).length;
 };
 const round=relayRound(index,s.teams);
 const done=phase==='play'?atMax('play',round):atMax('play',Infinity)+atMax('climax',round);
 return done===0?'normal':VARIATIONS[(done-1)%VARIATIONS.length];
}
export const VARIATION_TEXT:Readonly<Record<MemoryVariation,string>>={normal:'',reverse:'🔄 거꾸로 순서(마지막 모양부터)!','quick':'⚡ 번개 외우기(보는 시간 절반)!','reverse-quick':'🔄⚡ 거꾸로 + 번개!'};
/** 외우기 시간(ms): 타일 하나에 1초 + 1.5초, 차례 길이의 절반을 넘지 않는다. '번개'는 절반. */
export function showMs(length:number,intervalMs:number,variation:MemoryVariation='normal'):number{
 const base=Math.min(Math.round(intervalMs*0.5),1500+length*1000);
 return variation==='quick'||variation==='reverse-quick'?Math.round(base/2):base;
}
/**
 * 지금 차례를 시작하기에 남은 시간이 모자란지(차례 하나 길이보다 짧으면 새 차례를 시작하지 않는다).
 * 차례가 중간에 잘리지 않게, 이때는 '시간이 얼마 남지 않았어요'를 보여 주고 성공도 받지 않는다.
 */
export function turnTooShort(s:FunState):boolean{
 if(s.phase!=='tutorial'&&s.phase!=='play'&&s.phase!=='climax')return false;
 const startedAt=s.phaseMs-s.cueMs;
 return phaseSeconds(s)*1000-startedAt<cueIntervalMs(s)-250;
}
/** 지금 차례가 외우기(show)인지 해내기(perform)인지. */
export function memoryStage(s:FunState):'show'|'perform'{
 if(s.phase!=='tutorial'&&s.phase!=='play'&&s.phase!=='climax')return 'show';
 const len=sequenceLength(s,s.phase,s.cueIndex);
 return s.cueMs<showMs(len,cueIntervalMs(s),variationFor(s,s.phase,s.cueIndex))?'show':'perform';
}
/** 결과 한 줄: 최고 길이까지 해냈으면 '다음에는 7개'가 아니라 변형 도전을 권한다. */
export function memoryResultLine(s:FunState):string{
 const n=longestSuccess(s);
 if(!n)return `아직 성공 기록이 없어요 · 다음에는 ${START_LENGTH}개 순서부터 성공해 봐요`;
 if(n>=MAX_LENGTH)return `최고 길이 ${MAX_LENGTH}개를 해냈어요! 다음에는 거꾸로 순서·번개 외우기로 도전해요`;
 return `가장 긴 순서 ${n}개 성공 · 다음에는 ${n+1}개에 도전해요`;
}
/** 차례인 모둠(팀). 팀이 하나면 반 전체. */
export const relayTeam=(index:number,teams:number)=>index%Math.max(1,teams);
export const relayTeamName=(index:number,teams:number)=>teams<=1?'우리 반':TEAM_NAMES[relayTeam(index,teams)];
/** 성공한 순서 가운데 가장 긴 길이(없으면 0). */
export function longestSuccess(s:FunState):number{
 const lens=[...hitKeys(s,'play').map(i=>sequenceLength(s,'play',i)),...hitKeys(s,'climax').map(i=>sequenceLength(s,'climax',i))];
 return lens.length?Math.max(...lens):0;
}

/**
 * 점수 규칙(버튼·키보드·리모컨 모두 같음): 더하기는 차례인 모둠만, 순서가 가려진 뒤에, 한 차례에 한 번,
 * 본게임 +1 · 마지막 승부 +2. 빼기(정정)는 언제든 받는다. '모든 팀 +1'은 차례인 모둠의 성공으로 바꾼다.
 */
/**
 * 그 단계·신호 번호에서 차례인 모둠. 마지막 승부는 본게임의 차례 순서를 이어받는다
 * (다시 청팀부터 시작하면 앞 순서 모둠만 차례를 더 받으므로). 본게임에서 보여 준 차례 수만큼 밀어서 센다.
 */
export function turnTeamAt(s:Pick<FunState,'teams'|'phaseCues'>,phase:'tutorial'|'play'|'climax',index:number):number{
 const offset=phase==='climax'?(s.phaseCues.play??0):0;
 return relayTeam(Math.max(0,index)+offset,s.teams);
}
export const turnTeamNameAt=(s:Pick<FunState,'teams'|'phaseCues'>,phase:'tutorial'|'play'|'climax',index:number)=>s.teams<=1?'우리 반':TEAM_NAMES[turnTeamAt(s,phase,index)];
/** 지금 차례인 모둠. */
export const currentTurnTeam=(s:FunState)=>turnTeamAt(s,s.phase==='climax'?'climax':s.phase==='play'?'play':'tutorial',s.cueIndex);
/** 이 차례에 차례인 모둠이 이미 성공했는지(연습 판 포함). */
export const turnScored=(s:FunState)=>(s.teamHits[`${s.phase}:${s.cueIndex}:${currentTurnTeam(s)}`]??0)>0;
export function memoryRelayGate(s:FunState,cmd:FunCommand):FunCommand|null{
 if(s.phase!=='tutorial'&&s.phase!=='play'&&s.phase!=='climax')return cmd;
 const turnTeam=currentTurnTeam(s);
 const success=(team:number):FunCommand|null=>{
  if(team!==turnTeam||memoryStage(s)==='show'||turnTooShort(s))return null;
  if(turnScored(s))return null;
  return {type:'score',team,delta:s.phase==='climax'?CLIMAX_POINTS:1};
 };
 if(cmd.type==='score'&&cmd.delta>0)return success(cmd.team);
 if(cmd.type==='scoreAll'&&cmd.delta>0)return success(turnTeam);
 return cmd;
}

export function memoryRelayCue(ctx:SignatureCueContext):SignatureCue{
 // 지금 차례인데 남은 시간이 한 차례보다 짧으면 새 차례를 시작하지 않는다.
 if(ctx.phase===ctx.state.phase&&ctx.index===ctx.state.cueIndex&&turnTooShort(ctx.state))
  return {text:'시간이 얼마 남지 않았어요',sub:'이번엔 새 차례를 시작하지 않아요 · 숨을 고르며 다음 단계를 기다려요',icon:'⏳',tone:'rest',pose:'stand',scorable:false};
 const len=sequenceLength(ctx.state,ctx.phase,ctx.index);
 const variation=variationFor(ctx.state,ctx.phase,ctx.index);
 const backwards=ctx.reversed||variation==='reverse'||variation==='reverse-quick';
 const seq=sequenceFor(ctx.seed,ctx.phase,ctx.index,len);
 const who=turnTeamNameAt(ctx.state,ctx.phase,ctx.index);
 const act=(t:MemoryTile)=>ctx.seated?t.seated:t.action;
 const order=seq.map(act).join(' → ');
 if(ctx.phase==='tutorial')return {text:`지금 ${len}개 순서를 외워요!`,sub:`연습 판 · 순서가 사라지면 ${who}이 차례대로 몸으로 해요`,icon:'🧠',tone:'calm',move:order,pose:seq[0].pose};
 const climax=ctx.phase==='climax';
 return {
  text:`${who} 차례 · ${len}개 순서!`,
  sub:`${variation!=='normal'?`${VARIATION_TEXT[variation]} `:''}외운 순서대로 이어서 해요${climax?` · 마지막 승부! 성공하면 +${CLIMAX_POINTS}`:''}${backwards?' · 🔄 마지막 모양부터 해요':''}`,
  icon:'🧠',tone:climax?'gold':undefined,move:`${len}개 순서 이어 하기`,pose:seq[0].pose,
 };
}

export const memoryRelay=defineSignatureGame({
 id:'sig-memory-relay',ready:true,
 name:'기억 릴레이',emoji:'🧠',
 oneLine:'화면 순서를 외워 모둠이 이어서 해요. 성공할 때마다 하나씩 늘어나요.',
 rules:['차례가 시작되면 모양 타일 순서(● 손뼉 · ▲ 팔 위로 · ■ 무릎 굽히기 · ★ 별 점프)가 잠깐 보여요.','순서가 가려지면 차례인 모둠이 외운 순서대로 이어서 몸으로 해요.','성공하면 선생님이 ‘성공’을 눌러요. 모든 모둠이 한 번씩 하고 나면 순서가 하나씩 늘어나요!'],
 concept:'순서 기억',
 reflection:'긴 순서를 외울 때 우리 모둠은 어떤 방법을 썼나요?',
 nextChallenge:'다음에는 순서를 거꾸로 해내는 데 도전해 봐요.',
 scoringHint:'차례인 모둠이 순서를 끝까지 해내면 ‘성공’ +1 (마지막 승부 +2) · 한 바퀴에 한 모둠이라도 성공하면 다음 바퀴부터 하나 늘어요',
 seatedNote:'모양마다 앉아서 하는 동작(손뼉·팔 위로·무릎 치기·팔 벌리기)으로 해요.',
 demo:[
  {pose:'stand',caption:'모양 타일 순서가 잠깐 보여요'},{pose:'clap',caption:'● 동그라미 = 손뼉'},
  {pose:'armsUp',caption:'▲ 세모 = 팔 위로'},{pose:'squat',caption:'■ 네모 = 무릎 굽히기'},
  {pose:'jump',caption:'★ 별 = 별 모양 점프'},{pose:'point',caption:'가려지면 외운 순서대로 이어서 해요!'},
 ],
 timing:{demo:12,tutorial:36,play:150,climax:45,cueSeconds:16},
 teamsDefault:2,teamsMin:1,
 mergedFrom:['phone-play-006','phone-play-014','phone-play-015','phone-play-019','phone-play-044','memory','exp-phone-05','exp-phone-45'],
 cue:memoryRelayCue,
 // 외우는 시간이 신호 간격에 묶여 있어 '빨리빨리'는 순서를 너무 빨리 가린다.
 surprises:{play:['golden','reverse','freeze'],climax:['golden','reverse']},
 commandGate:memoryRelayGate,
 resultHeadline:s=>{const n=longestSuccess(s);return n?`가장 긴 순서 ${n}개까지 해냈어요!`:undefined;},
 domain:'운동',subCategory:'기억·협동 대표 게임',
 achievement:{code:'연계 확인 필요',title:'움직임 순서를 기억하며 표현하기',desc:'여러 가지 움직임을 순서대로 이어 하며 기억하고 표현한다.'},
 spaces:['교실','체육관','다목적실','운동장'],minutes:6,players:{min:2,max:30},intensity:'보통',
 safetyTips:['별 모양 점프 전에 팔을 벌려도 닿지 않게 간격을 벌려요.','틀려도 괜찮아요. 서두르지 말고 순서대로 해요.'],
 teachingTips:['외우는 동안 모양을 소리 내어 함께 읽으면 1~2학년도 잘 외워요.','틀리면 ‘성공’을 누르지 않고 다음 차례로 넘어가요. 순서 길이는 그대로예요.'],
});
