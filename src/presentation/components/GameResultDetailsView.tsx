import type { GameResultDetails } from '../../domain/gameResultDetails';

export function GameResultDetailsView({ details }: { details: GameResultDetails }) {
  return <div className="w-full space-y-3 rounded-2xl border border-slate-700 bg-slate-800/60 p-4 text-sm text-slate-200">
    {details.course&&<section className="border-b pb-3"><strong>{details.course.targetName}</strong><p>선택 코스: {details.course.sourceName}</p><p className="text-xs">통합 코스 v1 · 이전 점수와 직접 비교하지 않아요.</p></section>}
    {details.activity&&<details><summary>라운드별 직접 입력 기록</summary><p>{details.activity.soloPreview?'혼자 진행을 체험한 기록이며 실제 모둠 참여는 확인하지 않았어요.':'직접 입력한 수행 신고예요. 자동 측정이나 교사 인증이 아니에요.'}</p>{details.activity.rounds.map(r=><section key={r.round} className="my-3 border-t pt-2"><strong>{r.round}라운드 · {r.kind}</strong><p>참여 확인 번호: {r.participants.join(', ')} · {r.source==='peer-report'?'짝과 함께 입력':'스스로 입력'}</p><p>성공 기록: {r.counts.join(' / ')||'횟수 기록 없음'} · {Math.round(r.elapsedMs/100)/10}초</p>{r.answer.length>0&&<p>수행 신고: {r.answer.join(' → ')}</p>}{r.checks.map(check=><p key={check}>✓ {check}</p>)}</section>)}</details>}
    {details.metrics && Object.entries(details.metrics).map(([label, value]) => <p key={label} className="flex flex-wrap justify-between gap-2"><span>{label}</span><strong>{value}</strong></p>)}
    {details.ratings?.map((rating, i) => <p key={i} className="flex flex-wrap justify-between gap-2"><span>{details.criteria?.[i] || `평가 항목 ${i + 1}`}</span><strong className="text-yellow-300">{rating} / 5</strong></p>)}
    {details.totalTime !== undefined && <p>활동 시간: {details.totalTime}초</p>}
    {details.selfReflection && <div><p className="mb-1 text-slate-400">나의 성찰</p><p className="whitespace-pre-wrap break-words">{details.selfReflection}</p></div>}
  </div>;
}
