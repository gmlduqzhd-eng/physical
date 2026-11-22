import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QUICK_SITUATIONS, type QuickSituationId } from '../../domain/quickSituations';
import { homeQuickPicks, homeSituationPool } from '../../domain/homeCatalog';
import './QuickPicks.css';

/** 빠른 추천: 상황 버튼을 누르면 맞는 추천 활동 3개가 나오고, 한 번 눌러 바로 연다. */
export function QuickPicks({ returnTo, className = '' }: { returnTo: string; className?: string }) {
  const [chosen, setChosen] = useState<QuickSituationId | null>(null);
  const [round, setRound] = useState(0);
  const situation = QUICK_SITUATIONS.find(s => s.id === chosen);
  const picks = chosen ? homeQuickPicks(chosen, round) : [];
  const more = chosen ? homeSituationPool(chosen).length > picks.length : false;
  const href = (id: string) => `/play/${id}?${new URLSearchParams({ returnTo })}`;
  return <section className={`quick-picks ${className}`.trim()} aria-labelledby="quick-picks-title" data-quick-picks>
    <h2 id="quick-picks-title">지금 어떤 상황이에요?</h2>
    <div className="quick-picks-situations" role="group" aria-label="상황 고르기">
      {QUICK_SITUATIONS.map(s => <button key={s.id} type="button" aria-pressed={chosen === s.id} data-quick-situation={s.id}
        onClick={() => { setChosen(chosen === s.id ? null : s.id); setRound(0); }}><span aria-hidden="true">{s.emoji}</span> {s.label}</button>)}
    </div>
    {situation && <div className="quick-picks-result" role="status" aria-live="polite">
      <p className="quick-picks-note">{situation.note} {picks.length ? '하나를 눌러 바로 시작해요.' : '맞는 추천 활동이 아직 없어요.'}</p>
      <ul>{picks.map(g => <li key={g.type}><Link to={href(g.type)} data-quick-pick={g.type}>
        <span className="quick-picks-emoji" aria-hidden="true">{g.emoji}</span>
        <strong>{g.name}</strong>
        <small>⏱ {g.minutes}분 · 👥 {g.people}</small>
      </Link></li>)}</ul>
      <p className="quick-picks-more">{more && <button type="button" data-quick-reshuffle onClick={() => setRound(round + 1)}>🔄 다른 3개</button>}<Link to={situation.hub}>이 조건으로 모두 보기 →</Link></p>
    </div>}
  </section>;
}
