import {useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {saveTodayRun,useTodayRun} from '../../application/todayLessonStore';
import {STAGE_LABEL,advanceRun,currentStage,stagePath} from '../../domain/todayLesson';
import {isSignatureId} from '../../domain/signatureGames';
import {TeacherQuickGuide} from './TeacherQuickGuide';
import {getLessonActivity,useLessonActivity} from './todayLessonActivity';
import '../TodayLesson.css';
import './TodayLessonBar.css';

/**
 * 앱 전체에 하나 둔다. '오늘 수업' 중 지금 단계의 활동 화면에 있으면 단계 막대(n/4 · 단계 · 다음 단계 · 건너뛰기)를 띄운다.
 * 게임이 진행 중이면 '다음 단계'를 낮추고, 누르면 결과 발표로 갈지 그냥 넘어갈지 묻는다.
 * 앞 단계 활동 화면으로 돌아가 있으면 '오늘 수업으로 돌아가기'만 보여 준다.
 * 대표 게임 화면을 처음 열면 '처음 쓰는 선생님' 안내도 한 번 띄운다.
 */
export function TodayLessonBar(){
 const {pathname,search}=useLocation();
 const navigate=useNavigate();
 const run=useTodayRun();
 const activity=useLessonActivity();
 const [asking,setAsking]=useState<null|{status:'done'|'skipped';key:string}>(null);
 const playId=/^\/play\/([^/?#]+)/.exec(pathname)?.[1];
 const guide=playId&&isSignatureId(playId)?<TeacherQuickGuide/>:null;
 const stage=run?currentStage(run):undefined;
 if(!run||!stage||!playId)return guide;
 const portal=(node:ReactNode)=>typeof document==='undefined'?node:createPortal(node,document.body);
 const total=run.plan.stages.length;
 if(stage.gameId!==playId){
  // 앞 단계(또는 다른 단계) 활동을 '오늘 수업'에서 다시 연 경우: 수업 중이라는 것과 돌아갈 길만 보여 준다.
  const fromToday=new URLSearchParams(search).get('returnTo')==='/today';
  if(!fromToday||!run.plan.stages.some(s=>s.gameId===playId))return guide;
  const now=`오늘 수업 ${run.index+1}/${total} 진행 중 · 지금 단계는 ${stage.title}`;
  return <>{guide}{portal(<div className="today-bar" data-mode="away" role="region" aria-label={now}>
   <span className="today-bar-label" title={now}>📋 오늘 수업 {run.index+1}/{total} 진행 중<span className="today-bar-title"> · 지금 단계: {stage.title}</span></span>
   <button type="button" className="today-bar-next" onClick={()=>{const p=stagePath(stage,run.plan.settings.teams);navigate(p??'/today');}}>지금 단계로 돌아가기</button>
   <button type="button" className="today-bar-skip" onClick={()=>navigate('/today')}>오늘 수업 보기</button>
  </div>)}</>;
 }
 const mine=activity&&activity.gameId===playId?activity:null;
 const playing=mine?.phase==='playing';
 const unrecorded=mine?.phase==='result';
 const go=(status:'done'|'skipped')=>{
  // 결과 없이 떠나면 이 판(이어 하기·리모컨 방)을 정리한다. 기록한 판은 이미 정리되어 있다.
  const a=getLessonActivity();if(a&&a.gameId===playId&&a.phase!=='recorded')a.cleanup();
  setAsking(null);
  const next=advanceRun(run,status,Date.now());saveTodayRun(next);
  const ns=currentStage(next);const p=ns&&stagePath(ns,next.plan.settings.teams);
  navigate(p??'/today');
 };
 // 진행 중이거나 결과를 아직 기록하지 않았으면 바로 넘어가지 않고 묻는다.
 const step=(status:'done'|'skipped')=>{if(playing||unrecorded)setAsking({status,key:`${playId}:${mine?.phase}`});else go(status);};
 const ask=asking&&asking.key===`${playId}:${mine?.phase}`?asking:null;
 const label=`오늘 수업 ${run.index+1}/${total} · ${STAGE_LABEL[stage.kind]} · ${stage.title}`;
 const bar=<div className="today-bar" data-mode={playing?'playing':undefined} role="region" aria-label={label}>
  <span className="today-bar-label" title={label}>📋 오늘 수업 {run.index+1}/{total} · {STAGE_LABEL[stage.kind]}<span className="today-bar-title"> · {stage.title}</span></span>
  {ask?<div className="today-bar-ask" role="alertdialog" aria-label="다음 활동으로 갈까요?">
   <span className="today-bar-ask-text">{playing?'아직 게임 중이에요. 결과를 보고 갈까요?':'결과를 아직 기록하지 않았어요.'}</span>
   {playing&&<button type="button" className="today-bar-next" autoFocus onClick={()=>{setAsking(null);mine?.finish();}}>결과 발표 보기</button>}
   <button type="button" className="today-bar-skip" autoFocus={!playing} onClick={()=>go(ask.status)}>기록 없이 넘어가기</button>
   <button type="button" className="today-bar-skip" onClick={()=>setAsking(null)}>취소</button>
  </div>:<>
   <button type="button" className="today-bar-next" onClick={()=>step('done')}>{playing?'이 활동 마치고 다음 활동':'다음 단계 ▶'}</button>
   <button type="button" className="today-bar-skip" onClick={()=>step('skipped')}>건너뛰기</button>
  </>}
 </div>;
 return <>{guide}{portal(bar)}</>;
}
