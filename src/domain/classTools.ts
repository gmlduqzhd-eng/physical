/** 수업 도구: 리그 대진표, 사다리타기, 번호 뽑기, 모둠 나누기, 주사위. 학생 이름은 다루지 않고 번호만 쓴다. */
export type Rng=()=>number;

export const CLASS_TOOLS=[
 {id:'league',label:'리그 대진표',icon:'📋',summary:'모든 팀이 한 번씩 만나는 경기 순서와 순위표'},
 {id:'timer',label:'카운트다운',icon:'⏳',summary:'30초·1분·3분·5분을 크게 세고 끝나면 소리로 알려요'},
 {id:'race',label:'레이스 시계',icon:'⏱️',summary:'여러 팀의 도착 시간을 한 화면에서 기록'},
 {id:'ladder',label:'사다리타기',icon:'🪜',summary:'역할·순서를 공정하게 정하기'},
 {id:'draw',label:'번호 뽑기',icon:'🎟️',summary:'발표자·시범 보일 번호를 겹치지 않게 뽑기'},
 {id:'groups',label:'모둠 나누기',icon:'👥',summary:'번호를 섞어 모둠으로 나누기'},
 {id:'dice',label:'주사위',icon:'🎲',summary:'주사위 한 개 또는 두 개 굴리기'},
 {id:'quiz-bingo',label:'체육 지식 빙고',icon:'🟩',summary:'문제를 맞히면 칸을 차지하고, 한 줄을 채우면 빙고! 움직임 칸은 반 전체가 함께 해요'},
] as const;
export type ClassToolId=typeof CLASS_TOOLS[number]['id'];

export function shuffled<T>(items:readonly T[],rng:Rng=Math.random):T[]{
 const out=[...items];
 for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
 return out;
}

/* ── 리그 대진표 ── */
export interface LeagueMatch {round:number;home:number;away:number}
export interface LeagueRound {round:number;matches:LeagueMatch[];rest:number|null}
/** 원형 배정법. 팀이 홀수이면 라운드마다 한 팀이 쉰다. 모든 팀이 서로 정확히 한 번 만난다. */
export function roundRobin(teams:number):LeagueRound[]{
 if(!Number.isInteger(teams)||teams<2)return [];
 const slots:(number|null)[]=Array.from({length:teams},(_,i)=>i);if(teams%2)slots.push(null);
 const n=slots.length,rounds:LeagueRound[]=[];
 for(let r=0;r<n-1;r++){
  const matches:LeagueMatch[]=[];let rest:number|null=null;
  for(let i=0;i<n/2;i++){const a=slots[i],b=slots[n-1-i];if(a===null)rest=b;else if(b===null)rest=a;else matches.push(r%2?{round:r+1,home:b,away:a}:{round:r+1,home:a,away:b});}
  rounds.push({round:r+1,matches,rest});
  slots.splice(1,0,slots.pop()!);
 }
 return rounds;
}
/** 점수는 경기마다 [번호가 작은 팀, 번호가 큰 팀] 순서로 한 번만 저장한다. 대진표의 홈·원정 순서와 상관없다. */
export type MatchScore=readonly [number,number]|null;
export const matchKey=(m:{home:number;away:number})=>`${Math.min(m.home,m.away)}-${Math.max(m.home,m.away)}`;
/** 저장된 점수를 [홈 팀 점수, 원정 팀 점수]로 돌려준다. */
export const homeAwayScore=(m:{home:number;away:number},s:MatchScore):[number,number]|null=>s?(m.home<m.away?[s[0],s[1]]:[s[1],s[0]]):null;
/** [홈, 원정] 중 한쪽 점수를 바꾼 뒤 저장 순서로 돌려준다. */
export function bumpScore(m:{home:number;away:number},s:MatchScore,side:0|1,amount:number):[number,number]{
 const cur=homeAwayScore(m,s)??[0,0];cur[side]=Math.max(0,cur[side]+amount);
 return m.home<m.away?[cur[0],cur[1]]:[cur[1],cur[0]];
}
export interface LeagueRow {team:number;played:number;win:number;draw:number;loss:number;scored:number;conceded:number;points:number;rank:number}
/** 승 3점·무 1점. 승점 → 득실차 → 득점 순서이고, 셋이 모두 같으면 같은 순위다. */
export function leagueTable(teams:number,rounds:LeagueRound[],scores:Record<string,MatchScore|undefined>):LeagueRow[]{
 const rows:LeagueRow[]=Array.from({length:teams},(_,team)=>({team,played:0,win:0,draw:0,loss:0,scored:0,conceded:0,points:0,rank:0}));
 for(const round of rounds)for(const m of round.matches){
  const s=homeAwayScore(m,scores[matchKey(m)]??null);if(!s)continue;
  const [h,a]=s,home=rows[m.home],away=rows[m.away];
  home.played++;away.played++;home.scored+=h;home.conceded+=a;away.scored+=a;away.conceded+=h;
  if(h>a){home.win++;away.loss++;home.points+=3;}else if(h<a){away.win++;home.loss++;away.points+=3;}else{home.draw++;away.draw++;home.points++;away.points++;}
 }
 const key=(r:LeagueRow)=>[r.points,r.scored-r.conceded,r.scored];
 rows.sort((x,y)=>{const a=key(x),b=key(y);return b[0]-a[0]||b[1]-a[1]||b[2]-a[2]||x.team-y.team;});
 rows.forEach((row,i)=>{const prev=rows[i-1];row.rank=prev&&key(prev).join()===key(row).join()?prev.rank:i+1;});
 return rows;
}
export const leagueMatchCount=(teams:number)=>teams*(teams-1)/2;

/* ── 사다리타기 ── */
/** rungs[row][col]이 참이면 col과 col+1 세로줄 사이에 가로줄이 있다. 같은 줄에서 가로줄은 서로 붙지 않는다. */
export interface Ladder {columns:number;rungs:boolean[][]}
export function makeLadder(columns:number,rows=10,rng:Rng=Math.random):Ladder{
 const rungs=Array.from({length:rows},()=>{const row:boolean[]=Array(Math.max(0,columns-1)).fill(false);for(let c=0;c<row.length;c++)if(!row[c-1]&&rng()<0.45)row[c]=true;return row;});
 // 가로줄이 하나도 없는 틈에는 하나를 넣는다. 옆 가로줄을 치워야 하면, 그 틈에 다른 가로줄이 남는 줄에서만 치운다.
 const count=(c:number)=>rungs.filter(row=>row[c]).length;
 for(let pass=0;pass<columns;pass++)for(let c=0;c<columns-1;c++){
  if(count(c))continue;
  const free=rungs.filter(row=>!row[c-1]&&!row[c+1]);
  const row=free.length?free[Math.floor(rng()*free.length)]:rungs.find(r=>(!r[c-1]||count(c-1)>1)&&(!r[c+1]||count(c+1)>1));
  if(!row)continue;
  if(c>0)row[c-1]=false;if(c+1<row.length)row[c+1]=false;row[c]=true;
 }
 return {columns,rungs};
}
/** 위에서 start 세로줄로 출발해 내려가며 지나는 세로줄 번호들. 길이는 줄 수 + 1이고 마지막 값이 도착 칸이다. */
export function traceLadder(ladder:Ladder,start:number):number[]{
 let col=start;const path=[col];
 for(const row of ladder.rungs){if(row[col])col++;else if(col>0&&row[col-1])col--;path.push(col);}
 return path;
}
export const ladderResults=(ladder:Ladder)=>Array.from({length:ladder.columns},(_,i)=>traceLadder(ladder,i).at(-1)!);

/* ── 번호 뽑기 · 모둠 나누기 · 주사위 ── */
/** 남은 번호 가운데 하나를 뽑는다. 다 뽑았으면 null. */
export function drawNumber(total:number,drawn:readonly number[],rng:Rng=Math.random):number|null{
 const left=Array.from({length:total},(_,i)=>i+1).filter(n=>!drawn.includes(n));
 return left.length?left[Math.floor(rng()*left.length)]:null;
}
/** 1~total 번호를 섞어 groups개 모둠으로 고르게 나눈다. 모둠 인원 차이는 1명 이하다. */
export function splitGroups(total:number,groups:number,rng:Rng=Math.random):number[][]{
 const count=Math.max(1,Math.min(groups,total)),out:number[][]=Array.from({length:count},()=>[]);
 shuffled(Array.from({length:total},(_,i)=>i+1),rng).forEach((n,i)=>out[i%count].push(n));
 return out.map(g=>g.sort((a,b)=>a-b));
}
/** 숫자 뒤에 붙는 이/가. 한국어로 읽은 끝소리를 따른다(2이→2가, 3가→3이). */
export function numberSubject(n:number){const last=Math.abs(n)%10,tail=last===0?(n===0?'영':'십'):'일이삼사오육칠팔구'[last-1];return `${n}${'일삼육칠팔십영'.includes(tail)?'이':'가'}`;}
export const rollDice=(count:number,rng:Rng=Math.random)=>Array.from({length:count},()=>1+Math.floor(rng()*6));
/** 쉼표나 줄바꿈으로 나눈 결과 이름. 모자라면 '통과'로 채우고 넘치면 자른다. */
export function ladderLabels(text:string,columns:number):string[]{
 const given=text.split(/[,\n]/).map(s=>s.trim()).filter(Boolean).slice(0,columns);
 return [...given,...Array(columns-given.length).fill('통과')];
}
export const formatClock=(ms:number)=>{const t=Math.floor(ms/100),m=Math.floor(t/600),s=Math.floor(t/10)%60;return `${m}:${String(s).padStart(2,'0')}.${t%10}`;};

/* ── 새로고침해도 이어지는 도구 상태(이 탭에만 저장) ── */
const intIn=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
const rec=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
export interface DrawSaved {total:number;drawn:number[]}
/** 번호 뽑기: 인원 2~40, 뽑힌 번호는 1~인원 사이에서 겹치지 않아야 한다. 맞지 않으면 null. */
export function parseDrawSaved(raw:unknown):DrawSaved|null{
 if(!rec(raw)||!intIn(raw.total,2,40)||!Array.isArray(raw.drawn))return null;
 const total=raw.total,drawn=raw.drawn as unknown[];
 if(drawn.length>total||!drawn.every(n=>intIn(n,1,total))||new Set(drawn).size!==drawn.length)return null;
 return {total,drawn:drawn as number[]};
}
export interface GroupsSaved {total:number;count:number;groups:number[][]}
/** 모둠 나누기: 모든 번호가 정확히 한 번씩 들어 있어야 한다. */
export function parseGroupsSaved(raw:unknown):GroupsSaved|null{
 if(!rec(raw)||!intIn(raw.total,2,40)||!intIn(raw.count,2,10)||!Array.isArray(raw.groups))return null;
 const total=raw.total,groups=raw.groups as unknown[];
 if(!groups.every(g=>Array.isArray(g)&&g.every(n=>intIn(n,1,total))))return null;
 const flat=(groups as number[][]).flat();
 if(groups.length&&(flat.length!==total||new Set(flat).size!==total))return null;
 return {total,count:raw.count,groups:groups as number[][]};
}
export interface RaceSaved {lanes:number;times:(number|null)[];ms:number;running:boolean;savedAt:number;
 /** 달리는 채로 오래(STALE_RACE_MS 넘게) 떠나 있던 레이스: 흐른 시간을 더하지 않고 저장한 때의 시간에서 멈춰 둔다. */
 stale?:boolean}
const DAY_MS=24*60*60*1000;
/** 달리는 채로 이만큼 넘게 떠나 있었으면 수업이 끝난 것으로 보고 시계를 멈춰 둔다. */
export const STALE_RACE_MS=60*60*1000;
/** 레이스 시계가 보여 줄 수 있는 가장 긴 시간(6시간). 이보다 큰 값은 잘못 저장된 것으로 본다. */
export const RACE_MAX_MS=6*60*60*1000;
/**
 * 레이스 시계: 달리는 중에 새로고침했으면 저장한 뒤 흐른 시간을 더해 이어 간다.
 * 달리는 채로 1시간 넘게 떠나 있었으면 저장한 때의 시간에서 멈춘 채로 돌려준다(stale).
 * 하루를 넘긴 기록이나 6시간을 넘는 시간은 버린다.
 */
export function parseRaceSaved(raw:unknown,now:number):RaceSaved|null{
 if(!rec(raw)||!intIn(raw.lanes,2,8)||!Array.isArray(raw.times)||raw.times.length!==8)return null;
 if(typeof raw.ms!=='number'||!Number.isFinite(raw.ms)||raw.ms<0||raw.ms>RACE_MAX_MS||typeof raw.savedAt!=='number'||!Number.isFinite(raw.savedAt))return null;
 const times=raw.times as unknown[];
 if(!times.every(t=>t===null||(typeof t==='number'&&Number.isFinite(t)&&t>=0&&t<=RACE_MAX_MS)))return null;
 const gap=now-raw.savedAt;
 if(gap<0||gap>DAY_MS)return null;
 const wasRunning=raw.running===true,stale=wasRunning&&gap>STALE_RACE_MS;
 const running=wasRunning&&!stale,ms=Math.min(RACE_MAX_MS,raw.ms+(running?gap:0));
 if(!running&&ms===0&&times.every(t=>t===null))return null;
 return {lanes:raw.lanes,times:times as (number|null)[],ms,running,savedAt:raw.savedAt,...(stale?{stale:true}:{})};
}
/** 카운트다운 표시: 90 → '1:30', 5 → '0:05'. */
export const formatCountdown=(seconds:number)=>{const s=Math.max(0,Math.ceil(seconds));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
export const COUNTDOWN_PRESETS=[{seconds:30,label:'30초'},{seconds:60,label:'1분'},{seconds:180,label:'3분'},{seconds:300,label:'5분'}] as const;
export const COUNTDOWN_SECONDS=COUNTDOWN_PRESETS.map(p=>p.seconds) as readonly number[];
export interface CountdownSaved {total:number;left:number;running:boolean;endAt:number|null;savedAt:number}
/**
 * 카운트다운: 고른 시간·남은 시간·세는 중인지를 이 탭에 적어 둔다.
 * 세는 중에 새로고침했으면 끝나는 시각(endAt)으로 남은 시간을 다시 센다. 그 사이 끝났으면 0초(끝)로 돌려준다.
 * 고른 시간은 프리셋 가운데 하나여야 하고, 1시간 넘게 지난 기록은 버린다.
 */
export function parseCountdownSaved(raw:unknown,now:number):CountdownSaved|null{
 if(!rec(raw)||typeof raw.total!=='number'||!COUNTDOWN_SECONDS.includes(raw.total))return null;
 if(typeof raw.left!=='number'||!Number.isFinite(raw.left)||raw.left<0||raw.left>raw.total)return null;
 if(typeof raw.savedAt!=='number'||!Number.isFinite(raw.savedAt))return null;
 const gap=now-raw.savedAt;if(gap<0||gap>STALE_RACE_MS)return null;
 const total=raw.total;
 if(raw.running===true){
  if(typeof raw.endAt!=='number'||!Number.isFinite(raw.endAt)||raw.endAt-raw.savedAt>total*1000+1000)return null;
  const left=Math.max(0,(raw.endAt-now)/1000);
  return left>0?{total,left,running:true,endAt:raw.endAt,savedAt:raw.savedAt}:{total,left:0,running:false,endAt:null,savedAt:raw.savedAt};
 }
 if(raw.left===total)return null;
 return {total,left:raw.left,running:false,endAt:null,savedAt:raw.savedAt};
}
