import {readStorage,writeStorage} from '../../../application/browserStorage';
import { useState } from 'react';
import { PhysicalActivityLayout } from './common/PhysicalActivityLayout';
import { CheckCircle2 } from 'lucide-react';
import { sfxCoin, sfxSuccess } from '../../../application/soundEffects';
import './common/NativeActivityControls.css';

interface Attempt {
  round: number;
  zone: 'center' | 'middle' | 'outer' | 'miss';
  score: number;
}

interface Props {
  groupId?: string;
  enqueueAction?: (a: any) => void;
  onExit?: () => void;
}

export const RollingCurling = ({ groupId, enqueueAction, onExit }: Props) => {
  const [ball,setBall]=useState('soft'),[line,setLine]=useState('1'),[target,setTarget]=useState('1'),[posture,setPosture]=useState('standing');
  const conditionKey=`physical_best_curling_target_v3_${ball}_${line}_${target}_${posture}`;
  const targetBest=Math.max(0,Math.min(15,Number(readStorage(conditionKey))||0));
  const conditionText=`${({soft:'부드러운 공',tennis:'테니스공',paper:'종이공'})[ball as 'soft']} · ${line}번 출발선 · ${target}번 표적 · ${posture==='seated'?'앉아서':'서서'}`;
  const undo=()=>{setAttempts(old=>old.slice(0,-1));setShowSummary(false);setForceReflection('');};
  const [editing,setEditing]=useState<number|null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [forceReflection, setForceReflection] = useState<string>('');
  const [showSummary, setShowSummary] = useState<boolean>(false);

  const currentRound = editing===null?attempts.length+1:editing+1;

  const handleRecordAttempt = (zone: 'center' | 'middle' | 'outer' | 'miss') => {
    if (attempts.length >= 5&&editing===null) return;
    sfxCoin();
    const scores = { center: 3, middle: 2, outer: 1, miss: 0 };
    const newAttempt: Attempt = {
      round: currentRound,
      zone,
      score: scores[zone],
    };
    const nextAttempts = editing===null?[...attempts,newAttempt]:attempts.map((a,i)=>i===editing?newAttempt:a);setEditing(null);
    setAttempts(nextAttempts);

    if (nextAttempts.length === 5) {
      setShowSummary(true);
      sfxSuccess();
    }
  };

  const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
  const earlyScore = attempts.slice(0, 2).reduce((sum, a) => sum + a.score, 0);
  const lateScore = attempts.slice(3, 5).reduce((sum, a) => sum + a.score, 0);

  return (
    <PhysicalActivityLayout
      title="공 굴림 컬링 원정"
      emoji="🥌"
      domain="스포츠"
      sportType="기술형"
      achievementCode="[4체02-05]"
      achievementTitle="기술형 표적 활동에서 힘을 조절하여 표적에 공 굴리기"
      activityType="개인"
      expectedMinutes={5}
      equipment={['공 1개 (테니스공, 고무공 등)', '바닥 표적 (테이프, 콘, 줄넘기 등)']}
      safetyItems={[
        { id: 'roll_only', text: '공을 공중에 던지지 않고 바닥으로 부드럽게 굴릴 준비가 되었나요?' },
        { id: 'zone_clear', text: '공이 굴러가는 경로에 깨지기 쉬운 물건이나 장애물이 없나요?' },
        { id: 'distance', text: '앞에서 공을 주워주는 친구와 충분한 안전거리를 유지했나요?' },
        { id: 'floor', text: '바닥이 미끄럽지 않아 공을 굴릴 때 균형을 잃지 않나요?' },
        { id: 'ready', text: '신체에 무리 없이 침착하게 힘을 조절할 준비가 되었나요?' },
      ]}
      instructions={[
        '바닥에 3개의 동심원(중앙 3점, 중간 2점, 바깥 1점) 또는 거리선을 만듭니다.',
        '출발선 뒤에 서서 공을 낮게 잡고 표적을 향해 부드럽게 굴립니다.',
        '공이 멈춘 위치를 확인하고 화면에서 해당 구역을 터치해 기록합니다 (총 5회).',
        '매 시도마다 힘의 세기를 미세하게 조절하며 중앙에 가깝게 보내보세요.',
      ]}
      colorTheme="amber"
      onFinish={enqueueAction ? (score, details) => {const best=Math.max(targetBest,totalScore);writeStorage(conditionKey,String(best));enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: score, details }, timestamp: Date.now() });} : undefined}
      onExit={onExit}
      onRestart={() => { setEditing(null);setAttempts([]); setForceReflection(''); setShowSummary(false); }}
    >
      {({ onComplete }) => (
        <div className="w-full bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl">
          <fieldset className="activity-brief" disabled={attempts.length>0}><legend>같은 조건끼리 표적 기록 비교</legend><label>공<select value={ball} onChange={e=>setBall(e.target.value)}><option value="soft">부드러운 공</option><option value="tennis">테니스공</option><option value="paper">종이공</option></select></label><label>출발선 번호<select value={line} onChange={e=>setLine(e.target.value)}>{['1','2','3'].map(v=><option key={v}>{v}</option>)}</select></label><label>표적 조건 번호<select value={target} onChange={e=>setTarget(e.target.value)}>{['1','2','3'].map(v=><option key={v}>{v}</option>)}</select></label><label>참여 자세<select value={posture} onChange={e=>setPosture(e.target.value)}><option value="standing">서서 편하게</option><option value="seated">앉아서 편하게</option></select></label><p>교사가 실제 공·출발 위치·표적 크기를 확인해 번호를 붙여요. 위치나 크기를 바꾸면 다른 번호를 선택하고 새로 기록해요. 거리나 신체 능력을 자동 측정하지 않아요.</p></fieldset><p>{conditionText} · 이 조건의 확인한 최고 {targetBest}/15점</p>
          {attempts.length>0&&<section className="activity-brief"><h3>회차를 골라 입력 고치기</h3>{attempts.map((a,i)=><button key={i} aria-pressed={editing===i} onClick={()=>{setEditing(i);setShowSummary(false);setForceReflection('');}}>{i+1}회 · {a.score}점 수정</button>)}{editing!==null&&<p role="status">{editing+1}회 기록을 수정해요. 아래에서 실제 구역을 다시 고르면 나머지 기록은 유지됩니다.</p>}</section>}{!showSummary ? (
            <div>
              {/* 상단 라운드 및 점수 */}
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-yellow-300">
                  시도: <strong className="text-base text-white">{currentRound}</strong> / 5회
                </span>
                <span className="text-xs font-bold text-slate-400">
                  현재 누적: <strong className="text-yellow-200 font-mono text-base">{totalScore}점</strong>
                </span>
              </div>

              {/* 표적 시각화 그래픽 */}
              <div className="relative w-64 h-64 mx-auto my-2 rounded-full border-4 border-slate-800 flex items-center justify-center bg-slate-950 overflow-hidden shadow-inner">
                {/* 1점 바깥 영역 */}
                <div className="absolute inset-2 rounded-full bg-amber-950/40 border border-amber-800/40 flex items-start justify-center pt-2">
                  <span className="text-[10px] font-bold text-slate-300">1점 구역</span>
                </div>
                {/* 2점 중간 영역 */}
                <div className="absolute inset-10 rounded-full bg-amber-900/50 border border-amber-600/50 flex items-start justify-center pt-2">
                  <span className="text-[10px] font-bold text-yellow-300">2점 구역</span>
                </div>
                {/* 3점 정중앙 버튼 */}
                <div data-game-color="curling-center" className="absolute inset-20 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                  <span className="text-xs font-black text-slate-950">3점 중앙</span>
                </div>

                {/* 누적 마킹 표시 */}
                {attempts.map((att, i) => {
                  const offsets: Record<string, { top: string; left: string }> = {
                    center: { top: '50%', left: '50%' },
                    middle: { top: '35%', left: '40%' },
                    outer: { top: '20%', left: '60%' },
                    miss: { top: '5%', left: '10%' },
                  };
                  const pos = offsets[att.zone];
                  return (
                    <div
                      key={i}
                      className="absolute w-5 h-5 rounded-full bg-white text-slate-950 text-[10px] font-black flex items-center justify-center shadow-md -translate-x-1/2 -translate-y-1/2 z-10 border border-slate-900 animate-in zoom-in"
                      style={{ top: pos.top, left: pos.left }}
                    >
                      {att.round}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-slate-300 text-center mb-4 mt-2">
                실제 공이 멈춘 위치를 아래 버튼에서 선택하세요. 참여 점수와 표적 점수는 따로 기록해요.
              </p>

              <p>이 탭의 확인한 표적 최고 합계: {targetBest}/15점</p>{attempts.length>0&&editing===null&&<button onClick={undo}>직전 시도 되돌리기</button>}{/* 멈춘 구역 선택 버튼들 */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleRecordAttempt('center')}
                  className="activity-record-choice py-3 rounded-xl font-bold text-xs flex flex-col items-center gap-0.5 active:scale-95 transition-all"
                >
                  <span className="text-sm">🎯 중앙 표적 (3점)</span>
                  <span className="text-[10px] text-white">정확히 안착!</span>
                </button>
                <button
                  onClick={() => handleRecordAttempt('middle')}
                  className="activity-record-choice py-3 rounded-xl font-bold text-xs flex flex-col items-center gap-0.5 active:scale-95 transition-all"
                >
                  <span className="text-sm">🟡 중간 구역 (2점)</span>
                  <span className="text-[10px] text-white">표적 근처 접근</span>
                </button>
                <button
                  onClick={() => handleRecordAttempt('outer')}
                  className="activity-record-choice py-3 rounded-xl font-bold text-xs flex flex-col items-center gap-0.5 active:scale-95 transition-all"
                >
                  <span className="text-sm">⚪ 바깥 구역 (1점)</span>
                  <span className="text-[10px] text-yellow-200">원 안에 들어옴</span>
                </button>
                <button
                  onClick={() => handleRecordAttempt('miss')}
                  className="activity-record-choice py-3 rounded-xl font-bold text-xs flex flex-col items-center gap-0.5 active:scale-95 transition-all"
                >
                  <span className="text-sm">💨 표적 이탈 (0점)</span>
                  <span className="text-[10px] text-slate-400">힘 조절 다시 도전</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-2 animate-in fade-in duration-300">
              <div className="text-center mb-4">
                <span className="text-5xl block mb-2">🏆</span>
                <h3 className="text-xl font-black text-white">5회 시도 완료!</h3>
                <p className="text-xs text-yellow-300 font-bold mt-1">
                  총 획득 점수: {totalScore}점 / 15점 만점
                </p>
              </div>

              {/* 향상도 비교 */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-4 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>초반 (1~2회 시도 합계)</span>
                  <span className="font-mono font-bold text-white">{earlyScore}점</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>후반 (4~5회 시도 합계)</span>
                  <span className="font-mono font-bold text-yellow-300">{lateScore}점</span>
                </div>
                <div className="pt-2 border-t border-slate-800 text-center font-bold text-emerald-400">
                  {lateScore > earlyScore
                    ? '직접 입력한 후반 두 번의 구역 점수 합계가 더 높아요.'
                    : lateScore === earlyScore ? '직접 입력한 처음과 마지막 두 번의 구역 점수 합계가 같아요.' : '직접 입력한 후반 합계가 낮아요. 다음에는 한 가지 조절만 바꾸어 비교해요.'}
                </div>
              </div>

              <button onClick={undo}>마지막 시도 다시 기록하기</button>{/* 힘 조절 성찰 질문 */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-5">
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  마지막으로, 힘을 어떻게 조절했나요?
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {['너무 세게 굴림', '적당하게 조절함', '너무 약하게 굴림'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setForceReflection(opt)}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                        forceReflection === opt
                          ? 'bg-amber-950 border-amber-500 text-yellow-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onComplete(`공 굴림 컬링 5회 시도 · 직접 입력한 구역 합계 ${totalScore}점`, {participation:'performed',metrics:{'표적 조건':conditionText,'표적 점수':`${totalScore}/15점 · 확인한 최고 ${Math.max(targetBest,totalScore)}/15점`,'다섯 번 결과':attempts.map((a,i)=>`${i+1}차 ${({center:'중앙',middle:'중간',outer:'바깥',miss:'이탈'})[a.zone]} · ${a.score}점`).join(' / '),'앞뒤 비교':`처음 두 번 ${earlyScore}점 / 마지막 두 번 ${lateScore}점`},selfReflection:forceReflection||'선택하지 않음'})}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> 컬링 원정 결과 저장하기
              </button>
            </div>
          )}
        </div>
      )}
    </PhysicalActivityLayout>
  );
};
