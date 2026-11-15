/** 수업 도구: 리그 대진표, 사다리타기, 번호 뽑기, 모둠 나누기, 주사위. 학생 이름은 다루지 않고 번호만 쓴다. */
export type Rng=()=>number;

export const CLASS_TOOLS=[
 {id:'league',label:'리그 대진표',icon:'📋',summary:'모든 팀이 한 번씩 만나는 경기 순서와 순위표'},
 {id:'race',label:'레이스 시계',icon:'⏱️',summary:'여러 팀의 도착 시간을 한 화면에서 기록'},
 {id:'ladder',label:'사다리타기',icon:'🪜',summary:'역할·순서를 공정하게 정하기'},
 {id:'draw',label:'번호 뽑기',icon:'🎟️',summary:'발표자·시범 보일 번호를 겹치지 않게 뽑기'},
 {id:'groups',label:'모둠 나누기',icon:'👥',summary:'번호를 섞어 모둠으로 나누기'},
 {id:'dice',label:'주사위',icon:'🎲',summary:'주사위 한 개 또는 두 개 굴리기'},
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
