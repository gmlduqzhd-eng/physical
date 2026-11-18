import {useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {saveTodayRun,useTodayRun} from '../../application/todayLessonStore';
import {STAGE_LABEL,advanceRun,currentStage,stagePath} from '../../domain/todayLesson';
import {isSignatureId} from '../../domain/signatureGames';
import {TeacherQuickGuide} from './TeacherQuickGuide';
import {getLessonActivity,useLessonActivity} from './todayLessonActivity';
import {useModalDialog} from '../../application/useModalDialog';
import '../TodayLesson.css';
import './TodayLessonBar.css';

/**
 * 앱 전체에 하나 둔다. '오늘 수업' 중 지금 단계의 활동 화면에 있으면 단계 막대(n/4 · 단계 · 다음 단계 · 건너뛰기)를 띄운다.
 * 게임이 진행 중이면 '다음 단계'를 낮추고, 누르면 결과 발표로 갈지 그냥 넘어갈지 묻는다.
 * 묻는 동안에는 게임 시간을 멈추고, 게임 단축키를 받지 않고, 초점을 창 안에 둔다(Esc는 취소).
 * 다른 활동 화면이나 활동 목록(/hub)에 가 있으면 '오늘 수업 진행 중'과 돌아갈 길만 보여 준다.
 * 대표 게임 화면을 처음 열면 '처음 쓰는 선생님' 안내도 한 번 띄운다.
 */
export function TodayLessonBar(){
 const {pathname}=useLocation();
 const navigate=useNavigate();
 const run=useTodayRun();
 const activity=useLessonActivity();
 const [asking,setAsking]=useState<null|{status:'done'|'skipped';key:string}>(null);
 const playId=/^\/play\/([^/?#]+)/.exec(pathname)?.[1];
 const stage=run?currentStage(run):undefined;
 const onStage=!!playId&&!!stage&&stage.gameId===playId;
 const mine=onStage&&activity&&activity.gameId===playId?activity:null;
 const ask=asking&&mine&&asking.key===`${playId}:${mine.phase}`?asking:null;
 // 확인 창을 열며 게임 시간을 멈췄는지(이미 멈춰 있던 판은 취소해도 그대로 둔다).
 const held=useRef(false);
 const nextRef=useRef<HTMLButtonElement>(null);
 const refocus=useRef(false);
 const release=()=>{if(held.current){held.current=false;getLessonActivity()?.release?.();}};
 const cancel=()=>{release();refocus.current=true;setAsking(null);};
 const dialogRef=useModalDialog(!!ask,cancel);
 // 취소하면 초점을 '다음 단계' 버튼으로 돌려준다(창이 사라지며 초점을 잃지 않게).
 useEffect(()=>{if(ask)return;held.current=false;if(refocus.current){refocus.current=false;nextRef.current?.focus();}},[ask]);
 const guide=playId&&isSignatureId(playId)?<TeacherQuickGuide/>:null;
 if(!run||!stage)return guide;
 const portal=(node:ReactNode)=>typeof document==='undefined'?node:createPortal(node,document.body);
 const total=run.plan.stages.length;
 if(!onStage){
  // 다른 활동 화면이나 활동 목록에 가 있는 경우: 수업 중이라는 것과 돌아갈 길만 보여 준다.
  const now=`오늘 수업 ${run.index+1}/${total} 진행 중 · 지금 단계는 ${stage.title}`;
  return <>{guide}{portal(<div className="today-bar" data-mode="away" role="region" aria-label={now}>
   <span className="today-bar-label" title={now}>📋 오늘 수업 {run.index+1}/{total} 진행 중<span className="today-bar-title"> · 지금 단계: {stage.title}</span></span>
   <button type="button" className="today-bar-next" onClick={()=>{const p=stagePath(stage,run.plan.settings.teams);navigate(p??'/today');}}>지금 단계로 돌아가기</button>
   <button type="button" className="today-bar-skip" onClick={()=>navigate('/today')}>오늘 수업 보기</button>
  </div>)}</>;
 }
 const playing=mine?.phase==='playing';
 const unrecorded=mine?.phase==='result';
 const go=(status:'done'|'skipped')=>{
  // 결과 없이 떠나면 이 판(이어 하기·리모컨 방)을 정리한다. 기록한 판은 이미 정리되어 있다.
  const a=getLessonActivity();if(a&&a.gameId===playId&&a.phase!=='recorded')a.cleanup?.();
  held.current=false;setAsking(null);
  const next=advanceRun(run,status,Date.now());saveTodayRun(next);
  const ns=currentStage(next);const p=ns&&stagePath(ns,next.plan.settings.teams);
  navigate(p??'/today');
 };
 // 진행 중이거나 결과를 아직 기록하지 않았으면 바로 넘어가지 않고 묻는다(묻는 동안 게임 시간은 멈춘다).
 const step=(status:'done'|'skipped')=>{
  if(!mine||!(playing||unrecorded)){go(status);return;}
  held.current=playing&&!!mine.hold?.();
  setAsking({status,key:`${playId}:${mine.phase}`});
 };
 const finish=mine?.finish;
 const label=`오늘 수업 ${run.index+1}/${total} · ${STAGE_LABEL[stage.kind]} · ${stage.title}`;
 const askText=!playing?'결과를 아직 기록하지 않았어요.':finish?'아직 게임 중이에요. 결과를 보고 갈까요?':'아직 활동 중이에요. 기록 없이 넘어갈까요?';
 const bar=<div className="today-bar" data-mode={playing?'playing':undefined} data-asking={ask?true:undefined} role="region" aria-label={label}>
  <span className="today-bar-label" title={label}>📋 오늘 수업 {run.index+1}/{total} · {STAGE_LABEL[stage.kind]}<span className="today-bar-title"> · {stage.title}</span></span>
  {ask?<div ref={dialogRef} tabIndex={-1} className="today-bar-ask" role="alertdialog" aria-modal="true" aria-label="다음 활동으로 갈까요?" aria-describedby="today-bar-ask-text">
   <span id="today-bar-ask-text" className="today-bar-ask-text">{askText}</span>
   {playing&&finish&&<button type="button" className="today-bar-next" onClick={()=>{held.current=false;setAsking(null);finish();}}>결과 발표 보기</button>}
   <button type="button" className="today-bar-skip" onClick={()=>go(ask.status)}>기록 없이 넘어가기</button>
   <button type="button" className="today-bar-skip" onClick={cancel}>취소</button>
  </div>:<>
   <button ref={nextRef} type="button" className="today-bar-next" onClick={()=>step('done')}>{playing?'이 활동 마치고 다음 활동':'다음 단계 ▶'}</button>
   <button type="button" className="today-bar-skip" onClick={()=>step('skipped')}>건너뛰기</button>
  </>}
 </div>;
 return <>{guide}{portal(bar)}</>;
}
