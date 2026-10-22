import {Link} from 'react-router-dom';
import type {PlayerProfile} from '../../application/usePlayerProfile';
import {GameResultDetailsView} from './GameResultDetailsView';
const recordDate=(timestamp:number)=>{const date=new Date(timestamp);return Number.isNaN(date.getTime())?null:date;};

export function RecentGameRecords({profile}:{profile:PlayerProfile|null}) {
 return <section aria-label="최근 활동 기록" className="space-y-4"><h2 className="text-xl font-bold">최근 활동 기록</h2><p>최근 20회 결과를 확인해요. 이 브라우저 탭의 임시 기록이며, 공용 기기 정보 정리 또는 8시간 후 만료 시 지워집니다.</p>
  {!profile?.recentGames.length?<p role="status">아직 완료한 활동이 없어요. 활동을 마치면 여기에 기록돼요.</p>:<ol className="space-y-4">{profile.recentGames.map((record,index)=><li key={`${record.playedAt}:${index}`} className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-slate-100 break-words" data-game-record={record.gameType}>
   <h3 className="text-lg font-bold">{record.gameName}</h3><p className="text-sm text-slate-300"><time dateTime={recordDate(record.playedAt)?.toISOString()}>{recordDate(record.playedAt)?.toLocaleString('ko-KR')||'이전 기록'}</time></p>
   <p className="text-xl font-bold">{record.score.toLocaleString()}점</p><p>운동 자각도: {record.rpe?`${record.rpe} / 5`:'입력하지 않았어요'}</p>
   {record.details&&<details className="my-3"><summary className="cursor-pointer py-3 font-bold">상세 결과 확인</summary><GameResultDetailsView details={record.details}/></details>}
   <Link className="inline-flex min-h-12 items-center underline" to={`/solo/play/${encodeURIComponent(record.details?.course?.sourceId||record.gameType)}`}>이 활동 다시 열기</Link>
  </li>)}</ol>}
 </section>;
}
