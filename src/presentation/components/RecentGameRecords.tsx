import {Link} from 'react-router-dom';
import type {PlayerProfile} from '../../application/usePlayerProfile';
import {GameResultDetailsView} from './GameResultDetailsView';
import {getMergedGame,getRemovedGame,liveActivityId} from '../../domain/gameLifecycle';
import {AVAILABLE_GAMES} from '../../domain/gamesData';
import {withParticle} from '../../domain/koreanParticle';
/** 기록의 활동이 합쳐지거나 정리됐으면 지금 이어지는 활동을 알려 준다. */
function recordLink(id:string){
 const live=liveActivityId(id),name=AVAILABLE_GAMES.find(g=>g.type===live)?.name;
 if(getRemovedGame(id)&&live!==id&&name)return {to:`/solo/play/${encodeURIComponent(live)}`,label:'이어지는 활동 열기',note:`지금은 ${withParticle(name,'으로')} 이어져요.`};
 if(getMergedGame(id)&&name)return {to:`/solo/play/${encodeURIComponent(id)}`,label:'이 코스 다시 열기',note:`지금은 ‘${name}’ 안의 한 코스예요.`};
 return {to:`/solo/play/${encodeURIComponent(id)}`,label:'이 활동 다시 열기',note:''};
}
const recordDate=(timestamp:number)=>{const date=new Date(timestamp);return Number.isNaN(date.getTime())?null:date;};

export function RecentGameRecords({profile}:{profile:PlayerProfile|null}) {
 return <section aria-label="최근 활동 기록" className="space-y-4"><h2 className="text-xl font-bold">최근 활동 기록</h2><p>최근 20회 결과를 확인해요. 이 브라우저 탭의 임시 기록이며, 공용 기기 정보 정리 또는 8시간 후 만료 시 지워집니다.</p>
  {!profile?.recentGames.length?<p role="status">아직 남긴 활동 기록이 없어요. 수행·관찰·휴식 기록을 여기에서 확인해요.</p>:<ol className="space-y-4">{profile.recentGames.map((record,index)=><li key={`${record.playedAt}:${index}`} className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-slate-100 break-words" data-game-record={record.gameType}>
   <h3 className="text-lg font-bold">{record.gameName}</h3><p className="text-sm text-slate-300"><time dateTime={recordDate(record.playedAt)?.toISOString()}>{recordDate(record.playedAt)?.toLocaleString('ko-KR')||'이전 기록'}</time></p>
   <p>{record.details?.participation==='observed'?'관찰 참여':record.details?.participation==='rested'?'휴식':record.details?.completion==='partial'?'일부 수행·도전':'직접 수행 기록'}</p><p className="text-xl font-bold">{record.score.toLocaleString()}점</p>{record.details?.participation!=='observed'&&record.details?.participation!=='rested'&&<p>운동 자각도: {record.rpe?`${record.rpe} / 5`:'입력하지 않았어요'}</p>}
   {record.details&&<details className="my-3"><summary className="cursor-pointer py-3 font-bold">상세 결과 확인</summary><GameResultDetailsView details={record.details}/></details>}
   {(()=>{const link=recordLink(record.details?.course?.sourceId||record.gameType);return <>{link.note&&<p className="text-sm text-slate-300">{link.note}</p>}<Link className="inline-flex min-h-12 items-center underline" to={link.to}>{link.label}</Link></>;})()}
  </li>)}</ol>}
 </section>;
}
