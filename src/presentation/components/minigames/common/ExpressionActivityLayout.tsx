import {achievementLabel,PENDING_CURRICULUM_CODE} from '../../../../domain/curriculumCode';
import {withParticle} from '../../../../domain/koreanParticle';
import {ActivityCueControls} from './ActivityCueControls';
import {useActivityPause} from '../../../../application/ActivityPauseContext';
import { useGameTimeouts } from './useGameTimeouts';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight, ChevronLeft, Star, Trophy, RotateCcw, Info, Sparkles, Award } from 'lucide-react';
import { YouTubeExpressionPlayer } from './YouTubeExpressionPlayer';
import type { ExpressionGameData } from '../expression/expressionGamesData';
import { sfxSuccess } from '../../../../application/soundEffects';
import { ExpressionSoundPlayer } from '../expression/ExpressionSoundPlayer';
import {expressionAssessment,type GameResultDetails} from '../../../../domain/gameResultDetails';
import './ExpressionActivity.css';
import {ActivityProgress} from './ActivityProgress';
import {ExpressionPoseCards,JoinOrderChart} from '../expression/ExpressionPoseCards';
import {RULE_LABELS,stepCue} from '../expression/expressionKidText';

interface ExpressionActivityLayoutProps {
  game: ExpressionGameData;
  onComplete: (score: number, meta?: GameResultDetails) => void;
  onExit?: () => void;
  prepared?: boolean;
}

export const ExpressionActivityLayout = ({
  game,
  onComplete,
  onExit,
}: ExpressionActivityLayoutProps) => {
  const classroomPaused=useActivityPause();
  // 짧은 동작 카드가 기본이다. 자세한 설명은 펼쳐서 본다.
  const [pace,setPace]=useState(1),[compact,setCompact]=useState(true);
  const scheduleTimeout = useGameTimeouts();
  // 단계: 'countdown' -> 'active' -> 'rubric' -> 'result'. 준비 화면을 거쳐 와도 3초 카운트다운 뒤에 시간이 흐른다.
  const [phase, setPhase] = useState<'countdown' | 'active' | 'rubric' | 'result'>('countdown');
  const [countdown, setCountdown] = useState<number>(3);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(game.steps[0]?.durationSeconds || 30);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [showAchievementModal, setShowAchievementModal] = useState<boolean>(false);

  // 평가 점수 상태 (각 평가 기준별 1~5점)
  const [ratings, setRatings] = useState<number[]>([]);
  const [selfReflection, setSelfReflection] = useState<string>('');
  const [totalElapsedTime, setTotalElapsedTime] = useState<number>(0);
  const [smallMovement,setSmallMovement]=useState(false);
  // 참여 확인은 활동이 끝난 뒤 한 번만 한다. 처음에는 모든 단계에 참여한 것으로 두고, 쉰 단계만 끈다.
  const allSteps=()=>game.steps.map((_,i)=>i);
  const [performed,setPerformed]=useState<number[]>(allSteps);
  const [groupRound,setGroupRound]=useState(1);
  const assessment=expressionAssessment(game.steps,game.rubric,performed);
  const markPerformed=(i:number,checked:boolean)=>{const next=checked?[...new Set([...performed,i])]:performed.filter(v=>v!==i);setPerformed(next);setRatings(expressionAssessment(game.steps,game.rubric,next).map(()=>0));};
  const [videoPlaying,setVideoPlaying]=useState(false);
  const [followVideo,setFollowVideo]=useState(!!game.videoInfo);
  // K-POP 따라 추기는 영상이 핵심이라 처음부터 켜 둔다. 다른 활동은 그림 카드·박자 소리로 시작하고 원하면 켠다.
  const [useVideo,setUseVideo]=useState(!!game.videoInfo&&game.id==='kpop_easy_challenge');
  const completedRef = useRef(false);
  const playbackChange=useCallback((playing:boolean)=>setVideoPlaying(playing),[]);
  useEffect(()=>{const hide=()=>{if(document.hidden)setIsTimerRunning(false);};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);

  // 카운트다운 3초
  useEffect(() => {
    if (phase !== 'countdown'||!isTimerRunning||classroomPaused) return;
    if (countdown > 0) {
      const timer = scheduleTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setPhase('active');
      setTimeLeft(Math.ceil((game.steps[0]?.durationSeconds||30)*pace));
      setIsTimerRunning(true);
    }
  }, [phase, countdown, game.steps, scheduleTimeout,isTimerRunning,classroomPaused,pace]);

  // 활동 타이머
  useEffect(() => {
    // With a video in use (or a per-group repeat) the last step waits for the teacher, so nothing is cut off when the step timers end.
    const videoHold=(!!game.videoInfo&&useVideo||!!game.repeatPerGroup)&&currentStepIdx===game.steps.length-1;
    if (phase !== 'active' || !isTimerRunning || classroomPaused|| (followVideo&&useVideo&&!videoPlaying) || (videoHold&&timeLeft<=0)) return;
    const timer = scheduleTimeout(() => {
      setTotalElapsedTime(t => t + 1);
      if (timeLeft > 1) {
        setTimeLeft(timeLeft - 1);
      } else if (currentStepIdx < game.steps.length - 1) {
        const nextIdx = currentStepIdx + 1;
        setCurrentStepIdx(nextIdx);
        setTimeLeft(Math.ceil((game.steps[nextIdx]?.durationSeconds||30)*pace));
      } else if (videoHold) {
        setTimeLeft(0);
      } else {
        setPhase('rubric');
        setTimeLeft(0);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [phase, isTimerRunning, currentStepIdx, game.steps, timeLeft, scheduleTimeout,followVideo,videoPlaying,useVideo,classroomPaused,pace,game.videoInfo,game.repeatPerGroup]);

  const handleNextStep = useCallback(() => {
    if (currentStepIdx < game.steps.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      setTimeLeft(Math.ceil(game.steps[nextIdx].durationSeconds*pace));
    } else {
      setPhase('rubric');
    }
  }, [currentStepIdx, game.steps,pace]);

  const handlePrevStep = () => {
    if (currentStepIdx > 0) {
      const prevIdx = currentStepIdx - 1;
      setCurrentStepIdx(prevIdx);
      setTimeLeft(Math.ceil(game.steps[prevIdx].durationSeconds*pace));
    }
  };

  // 돌아보기(별점) 제출 및 완료
  const handleFinishRubric = () => {
    if (completedRef.current || (performed.length>0&&ratings.some(rating => rating < 1))) return;
    completedRef.current = true;
    sfxSuccess();
    setPhase('result');
    const avgScore = (ratings.length?Math.round((ratings.reduce((a, b) => a + b, 0) / (ratings.length * 5)) * 100):0);
    onComplete(performed.length?avgScore:0, {
      completion:performed.length===game.steps.length?'complete':'partial',participation:performed.length?'performed':'observed',
      ...(performed.length?{ratings}:{}),
      criteria: assessment.map(item => item.criterion),
      selfReflection,
      totalTime: totalElapsedTime,
      metrics:{'진행 확인':game.steps.map((_,i)=>`${i+1}단계 ${performed.includes(i)?'참여 확인':'쉬었음'}`).join(' / '),...(game.repeatPerGroup?{'감상한 모둠 수':`${groupRound}모둠`}:{}),'기록 기준':'별점은 자기·짝의 감상이며 자동 운동 능력 평가가 아니에요.','참여 방법':smallMovement?'앉아서 또는 작은 동작':'기본 표현'},
    });
  };

  const currentStep = game.steps[currentStepIdx] || game.steps[0];

  const lastStep=currentStepIdx===game.steps.length-1;
  const nextGroup=()=>{setGroupRound(r=>r+1);setCurrentStepIdx(0);setTimeLeft(Math.ceil((game.steps[0]?.durationSeconds||30)*pace));setIsTimerRunning(true);};
  const bigCue=smallMovement?`${currentStep.title} · 자리에서 작은 팔·손 동작으로`:stepCue(currentStep);
  const showPoses=!!game.poses&&!(game.id==='kpop_easy_challenge'&&useVideo);
  const rules=game.rules3&&<ol className="expression-rules3" aria-label="놀이 규칙 3줄">{game.rules3.map((rule,i)=><li key={i}><strong>{RULE_LABELS[i]}</strong><span>{rule}</span></li>)}</ol>;

  return (
    <div className="expression-activity w-full max-w-4xl mx-auto space-y-4" data-phase={phase}>
      {/* 성취기준 세부 모달 */}
      {showAchievementModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="성취기준 안내"
          className="expression-achievement-modal fixed inset-0 z-[10020] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowAchievementModal(false)}
        >
          <div
            className="bg-slate-900 border border-purple-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 font-mono font-black text-sm rounded-lg border border-purple-500/30">
                {achievementLabel(game.achievement.code)}
              </span>
              {game.achievement.code!==PENDING_CURRICULUM_CODE&&<span className="text-xs font-bold text-slate-400">2022 개정 초등 체육과 표현 영역</span>}
            </div>
            <h3 className="text-xl font-black text-white mb-2">{game.achievement.title}</h3>
            <p className="text-sm text-slate-300 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 leading-relaxed">
              &ldquo;{game.achievement.desc}&rdquo;
            </p>
            <button
              onClick={() => setShowAchievementModal(false)}
              className="mt-5 w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-bold text-sm text-white shadow-lg active:scale-95 transition-all"
            >
              확인
            </button>
          </div>
        </div>
      )}


      {/* 1. 3초 카운트다운 단계: 규칙 3줄과 첫 단계를 보여 준 뒤 시간이 흐른다. */}
      {phase === 'countdown' && (
        <div className="expression-countdown bg-slate-900/90 border border-purple-500/40 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-200">
          <h2 className="text-2xl font-black text-white"><span aria-hidden="true">{game.emoji}</span> {game.name}</h2>
          {rules}
          <div className="expression-countdown-number text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-200 to-indigo-400" aria-live="polite">
            {countdown}
          </div>
          <p className="text-base text-slate-200 font-bold">첫 동작: {game.steps[0]?.title}</p>
          {!isTimerRunning&&<><p role="status">안내가 멈췄어요. 주변을 확인한 뒤 ‘계속 진행’을 눌러요.</p><button onClick={()=>setIsTimerRunning(true)}>계속 진행</button></>}
        </div>
      )}

      {/* 2. 본 활동 단계: 지금 할 동작을 맨 위에 크게 보여 준다. */}
      {phase === 'active' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <section className="expression-now bg-slate-900/90 border border-purple-500/30 rounded-3xl p-5 shadow-2xl" aria-label="지금 할 동작">
            <div className="expression-now-head">
              <span className="expression-selected px-3 py-1 rounded-xl font-black text-sm">{game.repeatPerGroup?`${groupRound}번째 모둠 · `:''}단계 {currentStep.stepNum} / {game.steps.length}</span>
              <h3 className="font-black text-lg sm:text-xl text-white">{currentStep.title}</h3>
              <span className="expression-now-timer" aria-label={`남은 시간 ${timeLeft}초`}>⏱️ {timeLeft}초</span>
              <button type="button" onClick={() => setIsTimerRunning(p => !p)} className="expression-now-pause">{isTimerRunning ? '일시정지' : '계속 진행'}</button>
            </div>
            <div className={showPoses||game.joinChart?'expression-now-body has-visual':'expression-now-body'}>
              <p className="expression-cue" aria-live="polite">{bigCue}</p>
              {showPoses&&<ExpressionPoseCards set={game.poses!} step={currentStepIdx}/>}
              {game.joinChart&&<JoinOrderChart step={currentStepIdx}/>}
            </div>
            {!isTimerRunning&&<p role="status" className="expression-now-paused">안내가 멈췄어요. 주변을 확인한 뒤 ‘계속 진행’을 눌러요.</p>}
            {compact
              ? <details className="expression-now-detail"><summary>자세한 동작 설명</summary><p>{smallMovement?`‘${currentStep.title}’의 모양·방향·빠르기를 자기 자리에서 작은 팔·손 동작으로 표현해요. 앉아서도 같은 표현 목표를 선택해요.`:currentStep.guide}</p><p><Sparkles className="inline w-4 h-4" aria-hidden="true"/> {smallMovement?'앉거나 작은 팔·손 동작을 골라도 같은 표현 목표예요. 불편하면 멈추고 쉬어요.':currentStep.actionTip}</p></details>
              : <div className="expression-now-detail"><p>{smallMovement?`‘${currentStep.title}’의 모양·방향·빠르기를 자기 자리에서 작은 팔·손 동작으로 표현해요.`:currentStep.guide}</p><p><Sparkles className="inline w-4 h-4" aria-hidden="true"/> <strong>도움말:</strong> {smallMovement?'불편하면 멈추고 쉬어요.':currentStep.actionTip}</p></div>}

            {/* 단계 이동 제어 바 */}
            <div className="expression-step-controls flex items-center justify-between flex-wrap gap-2 pt-3">
              <button
                type="button"
                disabled={currentStepIdx === 0}
                onClick={handlePrevStep}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1 ${
                  currentStepIdx === 0
                    ? 'bg-slate-950 text-slate-700 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> 이전 단계
              </button>
              {game.repeatPerGroup&&lastStep&&<button type="button" onClick={nextGroup} className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-black">다음 모둠 보여 주기 · {groupRound}모둠 끝</button>}
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-black shadow-md flex items-center gap-1 active:scale-95 transition-all"
              >
                <span>{lastStep ? (game.repeatPerGroup?'모든 모둠 끝 · 돌아보기':'활동 마치고 돌아보기') : '다음 단계'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* 유튜브 영상 연계 플레이어 (영상 정보가 있는 게임) */}
          {game.videoInfo && useVideo && (
            <YouTubeExpressionPlayer
              initialVideoId={game.videoInfo.videoId}
              videoTitle={game.videoInfo.title}
              defaultBpm={game.videoInfo.defaultBpm || 100}
              paused={!isTimerRunning||classroomPaused}
              onPlaybackChange={playbackChange}
              allowChange={!new URLSearchParams(window.location.search).get('room')}
            />
          )}
          {game.videoInfo&&useVideo&&followVideo&&!videoPlaying&&<p role="status" className="activity-brief">영상 재생을 기다려요. 영상이 막히면 아래 ‘설정’에서 영상을 끄고 {game.poses?'그림 카드와 ':''}박자 소리로 진행해요.</p>}
          {game.sound&&!(game.videoInfo&&useVideo)&&<ExpressionSoundPlayer sound={game.sound} step={currentStepIdx} running={isTimerRunning&&!classroomPaused}/>}
          <ActivityProgress steps={game.steps.map(step=>step.title)} current={currentStepIdx} results={game.steps.slice(0,currentStepIdx).map(()=>'complete')}/>
        </div>
      )}

      {/* 설정 서랍: 진행에 꼭 필요하지 않은 것은 여기에 모은다. */}
      {(phase==='countdown'||phase==='active')&&<details className="expression-settings">
        <summary>설정 · 활동 정보, 앉아서 하기{game.videoInfo?', 영상':''}, 신호 속도</summary>
        {rules&&phase==='active'&&rules}
        <label className="activity-brief"><input type="checkbox" checked={smallMovement} onChange={e=>setSmallMovement(e.target.checked)}/>앉아서 또는 작은 팔·손 동작으로 표현하기</label>
        {game.videoInfo&&<div className="activity-brief"><p>영상은 YouTube 외부 플레이어로 연결돼요. 영상 없이 {game.poses?'그림 카드와 ':''}박자 소리로도 할 수 있어요.</p><button onClick={()=>{setUseVideo(v=>!v);setVideoPlaying(false);}}>{useVideo?'영상 끄고 '+(game.poses?'그림 카드로':'글 안내로'):'영상 켜기 · YouTube 연결'}</button><label><input type="checkbox" checked={followVideo} onChange={e=>setFollowVideo(e.target.checked)}/>영상의 재생·멈춤에 활동 시간을 맞추기</label></div>}
        <ActivityCueControls pace={pace} compact={compact} onPace={value=>{setTimeLeft(t=>Math.ceil(t*value/pace));setPace(value);}} onCompact={setCompact} paceDisabled={isTimerRunning}/>
        <p className="activity-brief">기기는 놓고 개인 공간에서 표현해요. 이동·접촉·점프를 해야만 참여한 것으로 기록되는 활동은 아니에요.</p>
      <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-2xl shadow-lg shrink-0">
            {game.emoji}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-white truncate">{game.name}</h2>
              <button
                type="button"
                onClick={() => setShowAchievementModal(true)}
                className="px-2 py-0.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-[10px] font-mono font-bold text-purple-300 flex items-center gap-1 transition-colors"
                title="성취기준 상세 보기"
              >
                <Info className="w-2.5 h-2.5" />
                <span>{achievementLabel(game.achievement.code)}</span>
              </button>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                game.playMode === '협동'
                  ? 'bg-amber-950/80 text-yellow-200 border-amber-800/60'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {game.playMode === '협동' ? '🤝 협동 활동' : '👤 개인 활동'}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">{game.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] bg-slate-950/60 px-3 py-1 rounded-xl border border-slate-800">
          <span className="text-slate-400">지원:</span>
          {game.devices.includes('스마트폰') && <span title="스마트폰">📱</span>}
          {game.devices.includes('태블릿 PC') && <span title="태블릿 PC">📟</span>}
          {game.devices.includes('데스크톱 PC') && <span title="데스크톱 PC">🖥️</span>}
        </div>
      </div>

      </details>}

      {/* 4. 자기·짝 돌아보기(별점) 단계 */}
      {phase === 'rubric' && (
        <div className="expression-rubric bg-slate-900/90 border border-purple-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
          <div className="text-center pb-4 border-b border-slate-800 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950 text-purple-300 text-xs font-bold border border-purple-800 mb-2">
              <Award className="w-3.5 h-3.5" /> 별점으로 돌아보기
            </div>
            <h3 className="text-xl font-black text-white">표현 활동 돌아보기</h3>
            <p className="text-sm text-slate-300">
              오늘 표현한 느낌을 돌아보고 별점을 골라요.
            </p>
          </div>

          <fieldset className="activity-brief"><legend>참여한 단계 · 쉰 단계만 끄세요</legend>{game.steps.map((step,i)=><label key={i}><input type="checkbox" checked={performed.includes(i)} onChange={e=>markPerformed(i,e.target.checked)}/>{step.title} · {performed.includes(i)?'참여했어요':'쉬었음'}</label>)}</fieldset>
          {/* 별점 기준 목록 */}
          <div className="space-y-4">
            {performed.length>0&&assessment.map((item, idx) => (
              <div key={idx} className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="font-black text-sm text-purple-300">{item.criterion}</h4>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        aria-label={`${item.criterion} ${star}점`}
                        aria-pressed={ratings[idx] === star}
                        type="button"
                        onClick={() => {
                          const next = [...ratings];
                          next[idx] = star;
                          setRatings(next);
                        }}
                        className="w-11 h-11 shrink-0 inline-flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= ratings[idx]
                              ? 'text-yellow-300 fill-amber-400'
                              : 'text-slate-700'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 성찰 한마디 */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              ✍️ 느낀 점 한 줄 (쓰지 않아도 돼요)
            </label>
            <input
              type="text"
              maxLength={500}
              value={selfReflection}
              onChange={e => setSelfReflection(e.target.value)}
              placeholder="예: 비를 작게 표현하니 재미있었어요!"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
            />
          </div>

          <p role="status" className="text-xs text-purple-300">{performed.length?'별점을 모두 고르면 결과를 볼 수 있어요. 별점은 자기·짝의 감상이에요.':'모든 단계를 쉬었다면 별점 없이 쉬었음으로 기록해요.'}</p>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleFinishRubric}
              disabled={performed.length>0&&ratings.some(rating => rating < 1)}
              className="game-stage-primary px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trophy className="w-4 h-4" />
              <span>{performed.length?'돌아보기 마치고 결과 보기':'쉬었음으로 기록하기'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. 최종 결과 리포트 단계 */}
      {phase === 'result' && (
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 mx-auto flex items-center justify-center text-4xl shadow-xl">
            🏆
          </div>

          <div>
            <h3 className="text-2xl font-black text-white">표현 활동을 마쳤어요</h3>
            <p className="text-sm text-slate-400 mt-1">
              {withParticle(game.name,'을를')} 참여한 단계를 확인하고 감상을 남겼습니다.
            </p>
          </div>

          {/* 점수 및 기록 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-center">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="text-xs text-slate-400 font-bold">직접 감상</div>
              <div className="text-2xl font-black text-yellow-300 mt-1">
                {(ratings.length?Math.round((ratings.reduce((a, b) => a + b, 0) / (ratings.length * 5)) * 100):0)}점
              </div>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="text-xs text-slate-400 font-bold">활동 시간</div>
              <div className="text-2xl font-black text-cyan-400 mt-1">
                {totalElapsedTime}초
              </div>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="text-xs text-slate-400 font-bold">성취기준</div>
              <div className="text-xs font-mono font-bold text-purple-400 mt-2">
                {achievementLabel(game.achievement.code)}
              </div>
            </div>
          </div>

          {/* 한 줄 성찰 출력 */}
          {selfReflection.trim()&&<div className="bg-purple-950/30 p-4 rounded-2xl border border-purple-500/20 max-w-lg mx-auto text-left">
            <div className="text-[11px] font-bold text-purple-300 mb-1">느낀 점:</div>
            <p className="text-xs text-slate-200 italic">&ldquo;{selfReflection}&rdquo;</p>
          </div>}

          {/* 재도전 및 나가기 */}
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                completedRef.current = false;
                setTotalElapsedTime(0);
                setRatings([]);setPerformed(allSteps());setGroupRound(1);
                setSelfReflection('');
                setIsTimerRunning(true);
                setPhase('countdown');
                setCountdown(3);
                setCurrentStepIdx(0);
                setTimeLeft(Math.ceil((game.steps[0]?.durationSeconds||30)*pace));
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 다시 하기
            </button>
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="game-stage-primary px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-md transition-colors"
              >
                홈 화면으로 이동
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
