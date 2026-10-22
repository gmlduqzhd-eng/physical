import { useEffect, useRef, useState } from 'react';
import { makeQuestRound, questAccurate, questCue, questDuration, questResult, QUEST_META, safeRoute } from '../../../../domain/movementQuests';
import type { QuestId, QuestRecord, QuestSettings } from '../../../../domain/movementQuests';
import type { GameResultDetails } from '../../../../domain/gameResultDetails';
import { sfxTap, unlockAudio } from '../../../../application/soundEffects';
import './MovementQuest.css';

export interface MovementQuestProps {
  gameId: QuestId; groupId?: string; solo?: boolean;
  enqueueAction?: (action: { id: string; type: string; payload: { id: string; amount: number; details: GameResultDetails }; timestamp: number }) => void;
  onExit?: () => void;
}
type Phase = 'intro' | 'plan' | 'preview' | 'countdown' | 'active' | 'record' | 'done';

export function MovementQuest({ gameId, groupId = 'standalone-player', solo = false, enqueueAction, onExit }: MovementQuestProps) {
  const meta = QUEST_META[gameId];
  const [settings, setSettings] = useState<QuestSettings>({ seated: false, gentle: true, practice: solo || !meta.team, players: 3, seed: Math.floor(Math.random()*1000) });
  const [reflection,setReflection]=useState('');
  const [answer, setAnswer] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(0);
  const [choice, setChoice] = useState('');
  const [activeMs, setActiveMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [voice, setVoice] = useState(false);
  const [rehearsal, setRehearsal] = useState(true);
  const [rehearsed, setRehearsed] = useState(false);
  const [retries, setRetries] = useState(0);
  const [records, setRecords] = useState<QuestRecord[]>([]);
  const [error, setError] = useState('');
  const saved = useRef(false);
  const transition = useRef(false);
  const plan = makeQuestRound(gameId, round, settings, choice);
  const duration = phase === 'countdown' ? 3000 : phase === 'preview' ? settings.gentle ? 7000 : 5000 : rehearsal ? plan.cueMs * Math.min(4, plan.cues.length) : questDuration(plan);
  const cue = questCue(plan, activeMs);
  const cueIndex = Math.floor(activeMs / plan.cueMs);
  const selected = plan.choices.find(c => c.id === choice);
  const validChoice = !!selected && (!plan.decision || choice===plan.decision.answer) && (!selected.path || safeRoute(selected.path, plan.blocked!));
  const introRules = gameId === 'pass-gate-rescue' && settings.practice ? [
    '삼각형으로 표식 세 개를 놓고 한 표식에서 시작해요.',
    '다음 표식으로 공을 굴리고, 걸어서 공을 회수해요.',
    '빈 표식으로 옮겨 다시 시작해요. 실제 모둠 활동과는 다른 연습이에요.',
  ] : meta.rules;

  useEffect(() => { window.scrollTo(0, 0); }, [phase, round]);

  useEffect(() => {
    const hide = () => { if (document.hidden) { setPaused(true); window.speechSynthesis?.cancel(); } };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); window.speechSynthesis?.cancel(); };
  }, []);

  useEffect(() => {
    if (!['active', 'countdown', 'preview'].includes(phase) || paused) return;
    let last = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const delta = now - last;
      last = now;
      if (!document.hidden) setActiveMs(previous => Math.min(duration, previous + delta));
    }, 50);
    return () => window.clearInterval(interval);
  }, [phase, paused, duration]);

  useEffect(() => {
    if (paused || activeMs < duration) return;
    if (phase === 'preview') { setActiveMs(0); setPhase('countdown'); }
    else if (phase === 'countdown') { setActiveMs(0); setPhase('active'); }
    else if (phase === 'active') { setPhase('record'); window.speechSynthesis?.cancel(); }
  }, [phase, activeMs, duration, paused]);

  useEffect(() => {
    if (phase !== 'active' || paused || document.hidden) return;
    if (sound) sfxTap();
    if (voice && gameId !== 'dribble-rhythm' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const message = new SpeechSynthesisUtterance(cue);
      message.lang = 'ko-KR'; message.rate = 1;
      window.speechSynthesis.speak(message);
    }
    return () => window.speechSynthesis?.cancel();
  }, [phase, paused, sound, voice, gameId, cue, cueIndex]);

  const start = (practice: boolean) => {
    if (!validChoice || transition.current) return;
    transition.current = true;
    unlockAudio(); setError(''); setAnswer([]); setReflection(''); setRehearsal(practice); setActiveMs(0); setPaused(false); setPhase(plan.preview ? 'preview' : 'countdown');
    // The synchronous guard prevents a second start before React commits.
    queueMicrotask(() => { transition.current = false; });
  };
  const record = (outcome: 'complete' | 'partial') => {
    if (saved.current || transition.current || rehearsal || phase !== 'record' || activeMs < (plan.timing ? 1000 : questDuration(plan))) return;
    if(outcome==='complete'&&!questAccurate(plan,{answer,activeMs})){setError('기록한 순서나 예상 시간을 확인해요. 다시 도전하거나 연습 기록으로 남길 수 있어요.');return;}
    transition.current = true;
    const next = [...records, { round, choice, outcome, activeMs, retries, ...(plan.question ? {answer} : {}), ...(reflection?{reflection}:{}) }];
    if (round === 2) {
      const result = questResult(gameId, settings, next);
      if (!result) { setError('기록을 확인한 뒤 다시 시도해 주세요.'); transition.current = false; return; }
      saved.current = true; setRecords(next); setPhase('done');
      enqueueAction?.({ id: crypto.randomUUID(), type: 'INCREMENT_SCORE', payload: { id: groupId, ...result }, timestamp: Date.now() });
    } else {
      setRecords(next); setRound(round + 1); setChoice(''); setRetries(0); setActiveMs(0); setPhase('plan');
    }
    queueMicrotask(() => { transition.current = false; });
  };
  const changeChoice = (next: string) => {
    setChoice(next); setError(plan.decision&&next!==plan.decision.answer?plan.decision.explanation:'');
    const path = plan.choices.find(c => c.id === next)?.path;
    if (path && !safeRoute(path, plan.blocked!)) setError(`${plan.blocked! + 1}번은 막혔어요. 다른 길을 골라 보세요.`);
  };
  const retry = () => { setRetries(retries + 1); setActiveMs(0); setPhase('plan'); };

  return <section className="movement-quest" data-quest={gameId} data-phase={phase} data-active-ms={Math.floor(activeMs)} aria-label={meta.name}>
    <header className="mq-heading"><span aria-hidden="true">{meta.emoji}</span><div><p>몸으로 푸는 원정 미션</p><h1>{meta.name}</h1></div><span className="mq-pill">{phase === 'intro' ? '준비' : `${round + 1} / 3 작전`}</span></header>
    <div className="mq-progress" aria-label={`${records.length}개 작전 기록 완료`}>{[0, 1, 2].map(i => <span key={i} className={i < records.length ? 'is-complete' : ''}>{i < records.length ? records[i].outcome === 'complete' ? '◆' : '◇' : i + 1}</span>)}</div>
    {phase === 'intro' && <>
      <p className="mq-lead">{meta.description}</p>
      <ol className="mq-rules">{introRules.map(rule => <li key={rule}>{rule}</li>)}</ol>
      <div className="mq-panel"><h2>이렇게 준비해요</h2><p>{meta.setup}</p><p>개인 공간을 확보하고, 기기는 내려놓아요. 이동은 걷기로 해요.</p>
        <label><input type="checkbox" checked={settings.seated} onChange={e => setSettings({ ...settings, seated: e.target.checked })}/>앉아서 팔 동작으로 참여하기</label>
        <label>진행 속도<select value={settings.gentle ? 'gentle' : 'standard'} onChange={e => setSettings({ ...settings, gentle: e.target.value === 'gentle' })}><option value="gentle">천천히 익히기</option><option value="standard">기본 속도 도전</option></select></label>
        {settings.seated && <p>{meta.alternative} 점수 기준은 같아요.</p>}
        {meta.team && <>
          {solo ? <p>혼자 해보기: 도구와 역할의 규칙을 연습해요. 실제 모둠 참여 기록으로 표시하지 않아요.</p> : <label>참여 방식<select value={settings.practice ? 'practice' : 'team'} onChange={e => setSettings({ ...settings, practice: e.target.value === 'practice' })}><option value="team">친구들과 함께</option><option value="practice">혼자 규칙 연습</option></select></label>}
          {!settings.practice && <label>함께할 인원<select value={settings.players} onChange={e => setSettings({ ...settings, players: Number(e.target.value) })}>{Array.from({length:(meta.maxPlayers??4)-1},(_,i)=>i+2).map(n => <option key={n} value={n}>{n}명{gameId==='pass-gate-rescue'?` · 표식 ${n+1}개`:''}</option>)}</select></label>}
        </>}
      </div>
      {meta.sources&&<details className="mq-panel"><summary>확인한 공식 안내</summary>{meta.sources.map(source=><p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></p>)}</details>}
      <button className="mq-primary" onClick={() => setPhase('plan')}>작전 살펴보기</button>
    </>}
    {phase === 'plan' && <>
      <p className="mq-kicker">작전 {round + 1} · {plan.title}</p><h2>{plan.goal}</h2><p>{plan.hint}</p>
      {plan.blocked !== undefined && <div className="mq-map" aria-label="3 곱하기 3 바닥 표식 지도">{Array.from({ length: 9 }, (_, n) => <div key={n} className={n === plan.blocked ? 'is-blocked' : selected?.path?.includes(n) ? 'is-path' : ''}><b>{n + 1}</b><small>{n === plan.blocked ? '막힌 길' : n === 6 ? '출발 기지' : n === 2 ? '목적지' : '표식'}</small></div>)}</div>}
      {plan.roles && <div className="mq-panel"><h3>이번 출발 순서</h3><p>{plan.roles.join(' → ')}</p></div>}
      <fieldset className="mq-choices"><legend>어떤 작전으로 해 볼까요?</legend>{plan.choices.map(c => <button key={c.id} type="button" aria-pressed={choice === c.id} onClick={() => changeChoice(c.id)}><strong>{c.label}</strong><span>{c.detail}</span></button>)}</fieldset>
      {error && <p role="alert" className="mq-error">{error}</p>}{plan.decision&&choice===plan.decision.answer&&<p className="mq-panel">{plan.decision.explanation}</p>}
      {!rehearsed ? <><p>처음에는 짧게 연습해요. 연습에는 점수가 없어요.</p><button className="mq-primary" disabled={!validChoice} onClick={() => start(true)}>동작 연습하기</button></> : <><p>몸으로 수행한 뒤 한 번만 기록해요. 잘 안 되면 같은 작전을 다시 해도 돼요.</p><button className="mq-primary" disabled={!validChoice} onClick={() => start(false)}>기기 놓고 작전 시작</button></>}
    </>}
    {(phase === 'preview' || phase === 'countdown' || phase === 'active') && <>
      <p className="mq-kicker">{rehearsal ? '동작 연습' : plan.title}</p>
      <div className="mq-signal" role="status" aria-live={gameId === 'dribble-rhythm' ? 'off' : 'polite'}>
        <p>{paused ? '잠깐 쉬고 있어요' : phase === 'preview' ? '방문할 순서를 기억해요' : phase === 'countdown' ? '기기를 놓고 준비해요' : plan.goal}</p>
        <strong>{paused ? '일시정지' : phase === 'preview' ? plan.preview?.join(' → ') : phase === 'countdown' ? Math.max(1, Math.ceil((3000 - activeMs) / 1000)) : cue}</strong>
        <span>{phase === 'active' ? plan.timing && !rehearsal ? '시간 표시는 가려져 있어요' : `${Math.max(0, Math.ceil((duration - activeMs) / 1000))}초 남음 · ${settings.seated ? '앉아서' : '서서'} 활동` : '주변을 확인해요'}</span>
      </div>
      {phase === 'active' && gameId === 'dribble-rhythm' && <div className="mq-beats" aria-label={`현재 ${cueIndex % 8 + 1}박`}>{Array.from({ length: 8 }, (_, n) => <span key={n} className={cueIndex % 8 === n ? 'is-current' : ''}>{n + 1}</span>)}</div>}
      <p className="mq-away">{plan.timing?'활동을 마칠 때 종료 버튼을 한 번 눌러요.':'활동 중 화면을 누르지 않아도 돼요.'} 신호는 동작 안내이며 자동 판정이 아니에요.</p>
      {phase==='active'&&plan.timing&&!rehearsal&&<button className="mq-primary" disabled={paused||activeMs<1000} onClick={()=>setPhase('record')}>목표 시간이 된 것 같아요</button>}
      <button className="mq-secondary" onClick={() => { unlockAudio(); setPaused(!paused); }}>{paused ? '계속하기' : '일시정지'}</button>
      <button className="mq-secondary" onClick={() => { setPhase('plan'); setActiveMs(0); setPaused(false); }}>작전 다시 고르기</button>
    </>}
    {phase === 'record' && (rehearsal ? <>
      <h2>어떤 동작인지 익혔나요?</h2><p>기록이나 점수 없이 연습했어요. 이제 첫 작전을 시작해요.</p>
      <button className="mq-primary" onClick={() => { setRehearsed(true); setPhase('plan'); setActiveMs(0); }}>연습 마치고 첫 작전으로</button>
      <button className="mq-secondary" onClick={() => start(true)}>연습 한 번 더</button>
    </> : <>
      <h2>직접 해 본 결과는 어땠나요?</h2><p className="mq-confirmation">{plan.confirmation}</p>
      {plan.reflection&&<fieldset className="mq-choices"><legend>{plan.reflection.prompt}</legend>{plan.reflection.options.map(option=><button key={option} aria-pressed={reflection===option} onClick={()=>setReflection(option)}>{option}</button>)}</fieldset>}
      {plan.question&&<fieldset className="mq-choices"><legend>{plan.question.prompt}</legend><p>{answer.join(' → ')||'아직 고르지 않았어요'}</p>{plan.question.options.map(option=><button key={option} disabled={answer.length>=plan.question!.answer.length} onClick={()=>setAnswer([...answer,option])}>{option}</button>)}<button onClick={()=>setAnswer([])}>순서 다시 고르기</button>{answer.length===plan.question.answer.length&&<p>{questAccurate(plan,{answer,activeMs})?'기억한 순서가 같아요.':'순서가 달라요. 다시 도전하거나 연습으로 남겨요.'}</p>}</fieldset>}
      {plan.timing&&<p>목표 {plan.timing.targetSeconds}초 · 직접 종료한 시간 {Math.round(activeMs/100)/10}초 · 차이 {Math.round(Math.abs(activeMs/1000-plan.timing.targetSeconds)*10)/10}초. {questAccurate(plan,{activeMs})?'정한 시간 범위 안에 들어왔어요.':'시간 차이를 보고 다음 시도를 조절해요.'}</p>}
      <p>직접 확인한 결과를 골라요. 기다린 시간이나 버튼만으로 성공을 판단하지 않아요.</p>
      <button className="mq-primary" onClick={() => record('complete')}>달성했어요 · {round === 2 ? '원정 마치기' : '다음 작전'}</button>
      <button className="mq-secondary" onClick={retry}>아직이에요 · 작전 바꾸어 재도전</button>
      <button className="mq-secondary" onClick={() => record('partial')}>연습 기록으로 {round === 2 ? '마치기' : '다음으로'} · 이번 작전 0점</button>
      {error && <p role="alert">{error}</p>}
    </>)}
    {phase === 'done' && <div className="mq-panel"><h2>세 작전을 마쳤어요!</h2><p>다음에는 경로나 동작을 바꾸어 다시 도전해 보세요.</p><p>기록은 직접 확인한 결과이며 운동량 측정값이 아니에요.</p>{onExit && <button className="mq-primary" onClick={onExit}>활동 목록으로</button>}</div>}
    {phase !== 'done' && <div className="mq-options"><label><input type="checkbox" checked={sound} onChange={e => { unlockAudio(); setSound(e.target.checked); }}/>신호음</label>{gameId !== 'dribble-rhythm' && <label><input type="checkbox" checked={voice} onChange={e => setVoice(e.target.checked)}/>동작 읽어 주기</label>}</div>}
    <p className="mq-footnote">통증이 있으면 멈추고 쉬어요. 직접 입력한 기록으로 참여를 돌아봐요.</p>
  </section>;
}
