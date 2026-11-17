import {useEffect,useState} from 'react';
import {COMBO_MAX,SURPRISE_INFO,TEAM_COLORS,TEAM_NAMES,type FunState,type SurpriseKind} from '../../../domain/funLoop';
import type {ExternalFunCommand} from '../../../application/funCommandBus';
import type {DemoFrame} from '../../../domain/signature/types';
import {StickFigure} from './StickFigure';

/** 팀 점수판: TV에서 멀리서도 보이게 크게. 점수 버튼(+1·−1)이 팀 칸 안에 있다. */
export function TeamScoreboard({state,label,dispatch,disabled}:{state:FunState;label:string;dispatch:(c:ExternalFunCommand)=>void;disabled?:boolean}){
 const max=Math.max(...state.scores),lead=state.teams>1&&max>0;
 return <ol className="fun-scoreboard" aria-label={`팀 ${label}`} data-teams={state.teams}>
  {state.scores.map((score,team)=><li key={team} style={{'--team':TEAM_COLORS[team]} as React.CSSProperties} data-lead={lead&&score===max||undefined}>
   <span className="fun-team-name">{state.teams===1?'우리 반':TEAM_NAMES[team]}</span>
   <strong className="fun-team-score" aria-live="polite" aria-label={`${state.teams===1?'우리 반':TEAM_NAMES[team]} ${label} ${score}`}>{score}</strong>
   <span className="fun-team-buttons">
    <button type="button" disabled={disabled} onClick={()=>dispatch({type:'score',team,delta:-1})} aria-label={`${state.teams===1?'우리 반':TEAM_NAMES[team]} ${label} 1 빼기`}>−1</button>
    <button type="button" disabled={disabled} className="fun-plus" onClick={()=>dispatch({type:'score',team,delta:1})} aria-label={`${state.teams===1?'우리 반':TEAM_NAMES[team]} ${label} 1 더하기`}>+1</button>
   </span>
  </li>)}
 </ol>;
}

/** 반 전체 콤보 게이지. 꽉 차면 필살기 버튼이 켜진다(게임마다 쓰임이 다름). */
export function ComboGauge({combo,label='반 전체 콤보'}:{combo:number;label?:string}){
 const pct=Math.round(combo/COMBO_MAX*100);
 return <div className="fun-combo" data-full={pct>=100||undefined}>
  <span>{label}</span>
  <div className="fun-combo-bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${label} ${pct}%`}><i style={{width:`${pct}%`}}/></div>
  <b>{pct>=100?'꽉 찼어요!':`${pct}%`}</b>
 </div>;
}

/** 깜짝 이벤트가 시작되면 2초 동안 화면 가득 알린다. 움직임 줄이기 설정을 따른다. */
export function SurpriseBanner({event}:{event:SurpriseKind|null}){
 const [shown,setShown]=useState<SurpriseKind|null>(null);
 useEffect(()=>{
  if(!event){setShown(null);return;}
  setShown(event);
  const id=window.setTimeout(()=>setShown(null),event==='freeze'?3000:2000);
  return ()=>window.clearTimeout(id);
 },[event]);
 if(!shown)return null;
 const info=SURPRISE_INFO[shown];
 return <div className="fun-surprise" data-kind={shown} role="alert">
  <span aria-hidden="true">{info.icon}</span><strong>{info.title}</strong><p>{info.text}</p>
 </div>;
}

/** 마지막 10초: 화면 테두리 강조와 큰 숫자. */
export function FinalCountdown({seconds,active}:{seconds:number;active:boolean}){
 if(!active)return null;
 return <div className="fun-final" aria-hidden="true"><b>{seconds}</b></div>;
}

/** 시범 애니메이션: 자세 그림과 설명이 2.4초마다 넘어간다. 움직임 줄이기 설정이면 버튼으로 넘긴다. */
export function DemoLoop({frames,onSkip,skipLabel}:{frames:readonly DemoFrame[];onSkip:()=>void;skipLabel:string}){
 const [i,setI]=useState(0);
 const reduced=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 useEffect(()=>{if(reduced||frames.length<2)return;const id=window.setInterval(()=>setI(x=>(x+1)%frames.length),2400);return ()=>window.clearInterval(id);},[frames.length,reduced]);
 const f=frames[i%frames.length];
 return <section className="fun-demo" aria-label="시범">
  <p className="fun-demo-step">시범 {i%frames.length+1}/{frames.length}</p>
  <div className="fun-demo-figure" key={i}><StickFigure pose={f.pose} size={150}/></div>
  <p className="fun-demo-caption" aria-live="polite">{f.caption}</p>
  <div className="fun-demo-dots" aria-hidden="true">{frames.map((_,k)=><i key={k} data-now={k===i%frames.length||undefined}/>)}</div>
  {reduced&&frames.length>1&&<button type="button" className="fun-secondary" onClick={()=>setI(x=>(x+1)%frames.length)}>다음 시범 보기</button>}
  <button type="button" className="fun-primary" onClick={onSkip}>{skipLabel}</button>
 </section>;
}

export interface TeacherButton {label:string;command:ExternalFunCommand;disabled?:boolean;hint?:string;tone?:'primary'|'gold'|'danger'}
/** 선생님 버튼 줄. 키보드 단축키를 버튼에 적어 둔다. */
export function TeacherControls({buttons,dispatch}:{buttons:TeacherButton[];dispatch:(c:ExternalFunCommand)=>void}){
 return <div className="fun-controls" role="group" aria-label="선생님 버튼">
  {buttons.map(b=><button key={b.label} type="button" data-tone={b.tone} disabled={b.disabled} onClick={()=>dispatch(b.command)}>
   {b.label}{b.hint&&<kbd>{b.hint}</kbd>}
  </button>)}
 </div>;
}
