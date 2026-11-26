import {useEffect,useState} from 'react';
import {supabase} from '../../data/supabase';
import {GAMES} from '../../domain/gamesData';

const NAME=new Map(GAMES.map(g=>[g.type,`${g.emoji??''} ${g.name}`.trim()]));
const DAYS=[7,30,90] as const;
interface Row {activityId:string;plays:number}
const isRows=(v:unknown):v is Row[]=>Array.isArray(v)&&v.every(r=>r&&typeof r==='object'&&typeof (r as Row).activityId==='string'&&Number.isFinite(Number((r as Row).plays)));

/**
 * 관리자용: 익명 활동 횟수 합계(최근 N일, 활동별). 누가 했는지는 서버에 없고, 활동 번호와 횟수만 있다.
 * 어떤 활동이 많이 쓰이는지 보고 다음에 고칠 곳을 정하는 데 쓴다.
 */
export function ActivityStatsCard(){
 const [days,setDays]=useState<typeof DAYS[number]>(30);
 const [state,setState]=useState<{status:'loading'}|{status:'error'}|{status:'ready';rows:Row[]}>({status:'loading'});
 useEffect(()=>{let live=true;setState({status:'loading'});
  void supabase.rpc('activity_play_summary',{days}).then(r=>{if(!live)return;setState(!r.error&&isRows(r.data)?{status:'ready',rows:r.data.map(x=>({activityId:x.activityId,plays:Number(x.plays)}))}:{status:'error'});},()=>{if(live)setState({status:'error'});});
  return()=>{live=false;};},[days]);
 const total=state.status==='ready'?state.rows.reduce((s,r)=>s+r.plays,0):0;
 return <section className="card" aria-labelledby="activity-stats-title" data-activity-stats>
  <h2 id="activity-stats-title">많이 한 활동 (익명 횟수)</h2>
  <p>게임 한 판을 마칠 때 활동 번호만 세어 모은 숫자예요. 누가·어느 반·어느 기기에서 했는지는 저장하지 않아요.</p>
  <div className="row" role="group" aria-label="기간">{DAYS.map(d=><button key={d} type="button" aria-pressed={days===d} onClick={()=>setDays(d)}>최근 {d}일</button>)}</div>
  {state.status==='loading'&&<p role="status">횟수를 불러오는 중…</p>}
  {state.status==='error'&&<p role="alert" className="notice">횟수를 불러오지 못했어요. 관리자 계정으로 로그인했는지 확인해 주세요.</p>}
  {state.status==='ready'&&(state.rows.length===0?<p role="status">최근 {days}일 동안 기록된 판이 아직 없어요.</p>:<>
   <p role="status">모두 {total.toLocaleString('ko-KR')}판 · 활동 {state.rows.length}가지</p>
   <table className="activity-stats-table"><thead><tr><th scope="col">순위</th><th scope="col">활동</th><th scope="col">판 수</th></tr></thead>
    <tbody>{state.rows.slice(0,30).map((r,i)=><tr key={r.activityId}><td>{i+1}</td><th scope="row">{NAME.get(r.activityId)??r.activityId}</th><td>{r.plays.toLocaleString('ko-KR')}</td></tr>)}</tbody></table>
   {state.rows.length>30&&<p className="small">많이 한 순서로 30가지만 보여 줘요.</p>}
  </>)}
 </section>;
}
