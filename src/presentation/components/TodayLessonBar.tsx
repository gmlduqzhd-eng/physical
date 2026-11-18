import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {saveTodayRun,useTodayRun} from '../../application/todayLessonStore';
import {STAGE_LABEL,advanceRun,currentStage,stagePath} from '../../domain/todayLesson';
import {isSignatureId} from '../../domain/signatureGames';
import {TeacherQuickGuide} from './TeacherQuickGuide';
import '../TodayLesson.css';

/**
 * 앱 전체에 하나 둔다. '오늘 수업' 중 지금 단계의 활동 화면에 있으면 단계 막대(n/4 · 단계 · 다음 단계 · 건너뛰기)를 띄운다.
 * 대표 게임 화면을 처음 열면 '처음 쓰는 선생님' 안내도 한 번 띄운다.
 */
export function TodayLessonBar(){
 const {pathname}=useLocation();
 const navigate=useNavigate();
 const run=useTodayRun();
 const playId=/^\/play\/([^/?#]+)/.exec(pathname)?.[1];
 const guide=playId&&isSignatureId(playId)?<TeacherQuickGuide/>:null;
 const stage=run?currentStage(run):undefined;
 if(!run||!stage||!playId||stage.gameId!==playId)return guide;
 const total=run.plan.stages.length;
 const step=(status:'done'|'skipped')=>{
  const next=advanceRun(run,status,Date.now());saveTodayRun(next);
  const ns=currentStage(next);const p=ns&&stagePath(ns,next.plan.settings.teams);
  navigate(p??'/today');
 };
 const label=`오늘 수업 ${run.index+1}/${total} · ${STAGE_LABEL[stage.kind]} · ${stage.title}`;
 const bar=<div className="today-bar" role="region" aria-label={label}>
  <span className="today-bar-label" title={label}>📋 오늘 수업 {run.index+1}/{total} · {STAGE_LABEL[stage.kind]}<span className="today-bar-title"> · {stage.title}</span></span>
  <button type="button" className="today-bar-next" onClick={()=>step('done')}>다음 단계 ▶</button>
  <button type="button" className="today-bar-skip" onClick={()=>step('skipped')}>건너뛰기</button>
 </div>;
 return <>{guide}{typeof document==='undefined'?bar:createPortal(bar,document.body)}</>;
}
