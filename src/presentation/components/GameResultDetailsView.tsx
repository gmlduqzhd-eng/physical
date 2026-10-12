import type { GameResultDetails } from '../../domain/gameResultDetails';

export function GameResultDetailsView({ details }: { details: GameResultDetails }) {
  return <div className="w-full space-y-3 rounded-2xl border border-slate-700 bg-slate-800/60 p-4 text-sm text-slate-200">
    {details.metrics && Object.entries(details.metrics).map(([label, value]) => <p key={label} className="flex flex-wrap justify-between gap-2"><span>{label}</span><strong>{value}</strong></p>)}
    {details.ratings?.map((rating, i) => <p key={i} className="flex flex-wrap justify-between gap-2"><span>{details.criteria?.[i] || `평가 항목 ${i + 1}`}</span><strong className="text-yellow-300">{rating} / 5</strong></p>)}
    {details.totalTime !== undefined && <p>활동 시간: {details.totalTime}초</p>}
    {details.selfReflection && <div><p className="mb-1 text-slate-400">나의 성찰</p><p className="whitespace-pre-wrap break-words">{details.selfReflection}</p></div>}
  </div>;
}
