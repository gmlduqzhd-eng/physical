import { useState } from 'react';
import { PhysicalActivityLayout } from './common/PhysicalActivityLayout';
import { CheckCircle2 } from 'lucide-react';
import { sfxCoin, sfxSuccess } from '../../../application/soundEffects';
import { MISSIONS, MOVES, MOVE_IDS, blockCount, checkMission, describeStep, programmerFor, pseudoCode, robotFor, runProgram, type Block, type MoveId, type Program, type Step } from '../../../domain/bodyCoding';

interface Props {
  groupId?: string;
  enqueueAction?: (a: any) => void;
  onExit?: () => void;
}

const KIND_COLOR: Record<string, string> = { 순차: 'bg-emerald-950 text-emerald-300 border-emerald-700', 반복: 'bg-amber-950 text-amber-300 border-amber-700', 선택: 'bg-cyan-950 text-cyan-300 border-cyan-700', 종합: 'bg-purple-950 text-purple-300 border-purple-700' };

/**
 * 파트너 로봇 연구소 · 몸으로 하는 코딩.
 * 프로그래머가 블록(순차·반복·선택)으로 짧은 프로그램을 짜면, 로봇 역할 친구가 몸으로 실행한다. 미션마다 역할을 바꾼다.
 * 손으로 친구를 움직이지 않고, 화면과 말로만 명령한다. 성공은 짝이 직접 확인한다(카메라 없음).
 */
export const PartnerRobotLab = ({ groupId, enqueueAction, onExit }: Props) => {
  const [mission, setMission] = useState(0);
  const [done, setDone] = useState<boolean[]>(() => MISSIONS.map(() => false));
  const [program, setProgram] = useState<Program>([]);
  const [filling, setFilling] = useState<number | null>(null);
  const [repeatTimes, setRepeatTimes] = useState<2 | 3 | 4>(3);
  const [result, setResult] = useState<{ ok: boolean; reasons: string[] } | null>(null);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [stepMode, setStepMode] = useState<'all' | 'step'>('all');
  const [stepIndex, setStepIndex] = useState(0);
  const [showText, setShowText] = useState(false);
  const [seated, setSeated] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const current = MISSIONS[mission];
  const edited = (next: Program) => { setProgram(next); setResult(null); setSteps(null); };
  const reset = () => { setProgram([]); setFilling(null); setResult(null); setSteps(null); setStepIndex(0); setShowText(false); };

  const addMove = (move: MoveId) => {
    sfxCoin();
    if (filling !== null && program[filling]?.kind === 'repeat') {
      edited(program.map((b, i) => i === filling && b.kind === 'repeat' ? { ...b, body: [...b.body, move] } : b));
    } else edited([...program, { kind: 'move', move }]);
  };
  const addRepeat = () => { edited([...program, { kind: 'repeat', times: repeatTimes, body: [] }]); setFilling(program.length); };
  const addIf = () => { edited([...program, { kind: 'if', then: 'stop', else: 'arms' }]); setFilling(null); };
  const removeBlock = (index: number) => { edited(program.filter((_, i) => i !== index)); setFilling(f => f === null ? null : f === index ? null : f > index ? f - 1 : f); };
  const updateBlock = (index: number, block: Block) => edited(program.map((b, i) => i === index ? block : b));

  const runAll = (mode: 'all' | 'step') => { const run = runProgram(program); setSteps(run.steps); setStepMode(mode); setStepIndex(0); };
  const activeStep = steps && stepMode === 'step' ? steps[stepIndex] : undefined;
  const finishedRun = !!steps && (stepMode === 'all' || stepIndex >= steps.length - 1);

  const missionDone = () => {
    sfxSuccess();
    setDone(d => d.map((v, i) => i === mission || v));
    setLog(l => [...l, `${current.stage}단계 ${current.kind} · ${programmerFor(mission)} 프로그래머 · 블록 ${blockCount(program)}개`]);
    if (mission < MISSIONS.length - 1) setMission(mission + 1);
    reset();
  };
  const doneCount = done.filter(Boolean).length;

  return (
    <PhysicalActivityLayout
      title="파트너 로봇 연구소 · 몸으로 하는 코딩"
      emoji="🤖"
      domain="표현"
      achievementCode="[4체03-02]"
      achievementTitle="움직임을 블록으로 짜서 짝과 순서대로 표현하기"
      activityType="짝"
      expectedMinutes={8}
      safetyItems={[
        { id: 'no_grab', text: '친구의 몸을 잡아 움직이지 않고, 화면과 말로만 명령하나요?' },
        { id: 'space', text: '앞으로 세 걸음, 옆으로 한 걸음을 가도 부딪히지 않는 공간이 있나요?' },
        { id: 'walk', text: '걸음은 천천히 걷고, 반 바퀴 돌기는 어지러우면 고개만 돌려도 되나요?' },
        { id: 'device', text: '기기는 책상이나 바닥에 두고, 로봇은 기기를 들지 않나요?' },
        { id: 'ready', text: '불편하면 언제든 “멈춰!”라고 말하고 쉴 수 있나요?' },
      ]}
      instructions={[
        '두 사람이 [프로그래머]와 [로봇] 역할을 나눠요. 미션마다 역할을 바꿔요.',
        '프로그래머는 동작 블록을 눌러 프로그램을 짜요. 반복 블록과 선택(만약~이면) 블록도 쓸 수 있어요.',
        '미션 확인을 누른 뒤, 한 단계씩 실행하며 로봇 친구가 몸으로 움직여요. 손으로 친구를 움직이지 않아요.',
        '로봇이 끝까지 해내면 짝이 확인하고 다음 미션으로 가요.',
      ]}
      colorTheme="purple"
      onFinish={enqueueAction ? (score, details) => enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: score, details }, timestamp: Date.now() }) : undefined}
      onExit={onExit}
      onRestart={() => { setMission(0); setDone(MISSIONS.map(() => false)); setLog([]); setSeated(false); reset(); }}
    >
      {({ onComplete }) => (
        <div className="body-coding w-full bg-slate-900/90 rounded-3xl border border-slate-800 p-4 sm:p-6 shadow-xl space-y-4">
          <p className="text-xs text-slate-400">몸으로 하는 코딩 · 함께 쓸 수 있는 교과: 체육 표현(움직임 요소) · 실과 [6실05-01] 알고리즘 표현, [6실05-02] 명령하는 방법 체험</p>

          <nav aria-label="미션 단계" className="grid grid-cols-4 gap-2">
            {MISSIONS.map((m, i) => (
              <button key={m.stage} type="button" aria-pressed={i === mission} onClick={() => { setMission(i); reset(); }}
                className={`rounded-xl border px-2 py-2 text-xs font-bold ${i === mission ? 'bg-purple-950 border-purple-500 text-purple-200' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                {done[i] ? '✅' : `${m.stage}단계`}<span className="block">{m.kind}</span>
              </button>
            ))}
          </nav>

          <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${KIND_COLOR[current.kind]}`}>{current.kind}</span>
              <h3 className="text-base font-black text-white">{current.stage}단계 · {current.title}</h3>
            </div>
            <p className="text-sm text-slate-300">{current.goal}</p>
            <p className="text-sm font-bold text-slate-200">🧑‍💻 프로그래머: {programmerFor(mission)} · 🤖 로봇: {robotFor(mission)}</p>
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={seated} onChange={e => setSeated(e.target.checked)} />앉아서 하는 로봇(작은 손·발 동작)</label>
          </section>

          <section aria-label="블록 고르기" className="space-y-2">
            <h4 className="text-xs font-black text-slate-300">{filling !== null ? `🔁 ${filling + 1}번 반복 블록 안에 넣는 중` : '동작 블록 넣기'}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MOVE_IDS.map(id => (
                <button key={id} type="button" onClick={() => addMove(id)} className="rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-left text-xs font-bold text-slate-200">
                  <span aria-hidden="true">{MOVES[id].emoji}</span> {seated ? MOVES[id].seated : MOVES[id].label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-slate-300">반복 횟수
                <select className="ml-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200" value={repeatTimes} onChange={e => setRepeatTimes(Number(e.target.value) as 2 | 3 | 4)}>{[2, 3, 4].map(n => <option key={n} value={n}>{n}번</option>)}</select>
              </label>
              <button type="button" onClick={addRepeat} className="rounded-xl border border-amber-700 bg-amber-950 px-3 py-2 text-xs font-black text-amber-200">🔁 반복 블록 넣기</button>
              <button type="button" onClick={addIf} className="rounded-xl border border-cyan-700 bg-cyan-950 px-3 py-2 text-xs font-black text-cyan-200">❓ 선택 블록 넣기</button>
              {filling !== null && <button type="button" onClick={() => setFilling(null)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300">반복 블록 닫기</button>}
            </div>
          </section>

          <section aria-label="내 프로그램" className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-xs font-black text-slate-300">내 프로그램 · 블록 {blockCount(program)}개{current.maxBlocks ? ` / 최대 ${current.maxBlocks}개` : ''}</h4>
              <div className="flex gap-2">
                <button type="button" aria-pressed={showText} onClick={() => setShowText(v => !v)} className="text-xs font-bold text-cyan-300 underline">📝 글로 보기</button>
                {!!program.length && <button type="button" onClick={reset} className="text-xs font-bold text-slate-400 underline">🗑 모두 지우기</button>}
              </div>
            </div>
            {!program.length && <p className="text-xs text-slate-400">위에서 블록을 눌러 프로그램을 만들어요.</p>}
            <ol className="space-y-2">
              {program.map((b, i) => (
                <li key={i} className={`rounded-xl border p-2 text-xs ${activeStep?.block === i ? 'border-purple-400 bg-purple-950 text-white' : 'border-slate-800 bg-slate-900 text-slate-200'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">{i + 1}. {b.kind === 'move' ? `${MOVES[b.move].emoji} ${seated ? MOVES[b.move].seated : MOVES[b.move].label}` : b.kind === 'repeat' ? `🔁 ${b.times}번 반복` : '❓ 만약 신호가 빨강이면'}{activeStep?.block === i && activeStep.repeat ? ` · ${activeStep.repeat.round}/${activeStep.repeat.times}번째` : ''}</span>
                    <button type="button" aria-label={`${i + 1}번 블록 지우기`} onClick={() => removeBlock(i)} className="px-2 text-slate-400">✕</button>
                  </div>
                  {b.kind === 'repeat' && <div className="mt-1 flex flex-wrap items-center gap-1 pl-3">
                    {b.body.map((m, j) => <button key={j} type="button" aria-label={`${MOVES[m].label} 빼기`} onClick={() => updateBlock(i, { ...b, body: b.body.filter((_, k) => k !== j) })} className="rounded-lg border border-amber-800 px-2 py-1">{MOVES[m].emoji} {seated ? MOVES[m].seated : MOVES[m].label} ✕</button>)}
                    {!b.body.length && <span className="font-bold text-slate-200">비어 있어요</span>}
                    {filling !== i && <button type="button" onClick={() => setFilling(i)} className="rounded-lg border border-slate-700 px-2 py-1 text-slate-300">+ 여기에 넣기</button>}
                  </div>}
                  {b.kind === 'if' && <div className="mt-1 grid gap-1 pl-3 sm:grid-cols-2">
                    <label>그러면 <select className="rounded-lg border border-slate-700 bg-slate-950 px-1 py-0.5" value={b.then} onChange={e => updateBlock(i, { ...b, then: e.target.value as MoveId })}>{MOVE_IDS.map(id => <option key={id} value={id}>{seated ? MOVES[id].seated : MOVES[id].label}</option>)}</select></label>
                    <label>아니면 <select className="rounded-lg border border-slate-700 bg-slate-950 px-1 py-0.5" value={b.else} onChange={e => updateBlock(i, { ...b, else: e.target.value as MoveId })}>{MOVE_IDS.map(id => <option key={id} value={id}>{seated ? MOVES[id].seated : MOVES[id].label}</option>)}</select></label>
                  </div>}
                </li>
              ))}
            </ol>
            {showText && <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-200">{pseudoCode(program).join('\n')}</pre>}
          </section>

          <button type="button" onClick={() => setResult(checkMission(current, program))} className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 py-3 text-sm font-black text-white">✅ 미션 확인</button>
          {result && (result.ok
            ? <p role="status" className="rounded-xl border border-emerald-700 bg-emerald-950 p-3 text-sm font-bold text-emerald-200">좋아요! 이제 로봇 친구에게 실행해 봐요.</p>
            : <ul role="status" className="list-disc space-y-1 rounded-xl border border-amber-700 bg-amber-950 p-3 pl-6 text-sm text-amber-200">{result.reasons.map(r => <li key={r}>{r}</li>)}</ul>)}

          {result?.ok && <section aria-label="로봇 실행" className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950 p-3">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => runAll('all')} className="rounded-xl border border-slate-700 py-2 text-sm font-bold text-slate-200">▶ 한 번에 보기</button>
              <button type="button" onClick={() => runAll('step')} className="rounded-xl border border-purple-600 bg-purple-950 py-2 text-sm font-bold text-purple-200">👣 한 단계씩</button>
            </div>
            {steps && stepMode === 'step' && <div className="text-center">
              <p className="text-xs text-slate-400">{stepIndex + 1} / {steps.length} 단계</p>
              <p aria-live="assertive" className="my-2 text-2xl font-black text-white">{steps[stepIndex] ? describeStep(steps[stepIndex], seated) : ''}</p>
              <button type="button" disabled={stepIndex >= steps.length - 1} onClick={() => setStepIndex(i => i + 1)} className="rounded-xl bg-purple-600 px-6 py-2 text-sm font-black text-white disabled:opacity-40">다음 단계 ▶</button>
            </div>}
            {steps && stepMode === 'all' && <ol aria-live="polite" className="list-decimal space-y-1 pl-6 text-sm text-slate-200">{steps.map((s, i) => <li key={i}>{describeStep(s, seated)}</li>)}</ol>}
            {finishedRun && <button type="button" onClick={missionDone} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-black text-white"><CheckCircle2 className="h-4 w-4" />🤖 로봇이 해냈어요 (짝 확인) · 역할 바꾸기</button>}
          </section>}

          <p className="text-xs text-slate-400">완료한 미션 {doneCount} / {MISSIONS.length}</p>
          <button type="button" disabled={!doneCount} onClick={() => onComplete(`몸으로 하는 코딩 미션 ${doneCount}개를 역할을 바꿔 가며 해냈어요.`, { participation: 'performed', completion: doneCount === MISSIONS.length ? 'complete' : 'partial', metrics: { '완료한 미션': `${doneCount}/${MISSIONS.length}`, '실행 방법': seated ? '앉아서 작은 동작' : '서서 걷기·팔 동작', '미션 기록': log.join(' / ') } })}
            className="w-full rounded-2xl border border-slate-700 py-3 text-sm font-black text-slate-200 disabled:opacity-40">활동 마치기</button>
        </div>
      )}
    </PhysicalActivityLayout>
  );
};
