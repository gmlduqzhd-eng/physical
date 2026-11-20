import {useEffect,useState} from 'react';
import {COMBO_MAX,SURPRISE_INFO,TEAM_COLORS,TEAM_NAMES,type FunState,type SurpriseKind} from '../../../domain/funLoop';
import type {ExternalFunCommand} from '../../../application/funCommandBus';
import type {DemoFrame} from '../../../domain/signature/types';
import {StickFigure} from './StickFigure';
import {TEAM_SHAPES} from './teamShapes';
import {timeLevel} from './timeLevel';

/** 팀 모양 표식(색은 --team). 이름 앞에 붙인다. 화면 낭독기는 팀 이름을 읽으므로 숨긴다. */
export function TeamShape({team}:{team:number}){
 return <i className="fun-team-shape" data-team={team} aria-hidden="true" style={{'--shape':TEAM_COLORS[team]} as React.CSSProperties}>{TEAM_SHAPES[team]??'●'}</i>;
}
/**
 * 팀 점수판: TV에서 멀리서도 보이게 크게. 점수 버튼(+1·−1)이 팀 칸 안에 있다.
 * canScore(team, delta)가 false면 그 버튼을 끈다(게임 규칙·일시정지와 같은 판정).
 */
export function TeamScoreboard({state,label,dispatch,disabled,canScore,readOnly,turnTeam}:{state:FunState;label:string;dispatch:(c:ExternalFunCommand)=>void;disabled?:boolean;canScore?:(team:number,delta:number)=>boolean;
 /** true면 ± 버튼 없이 점수만 보여 준다(점수를 게임 판에서만 주는 놀이). */ readOnly?:boolean;
 /** 지금 차례인 팀(없으면 null). 그 팀 칸을 도드라지게 하고 '차례'라고 적는다. */ turnTeam?:number|null}){
 const max=Math.max(...state.scores),lead=state.teams>1&&max>0;
 return <ol className="fun-scoreboard" aria-label={`팀 ${label}`} data-teams={state.teams}>
  {state.scores.map((score,team)=><li key={team} style={{'--team':TEAM_COLORS[team]} as React.CSSProperties} data-lead={lead&&score===max||undefined} data-readonly={readOnly||undefined} data-turn={turnTeam===team||undefined}>
   <span className="fun-team-name">{state.teams>1&&<TeamShape team={team}/>}{state.teams===1?'우리 반':TEAM_NAMES[team]}{turnTeam===team&&<em className="fun-team-turn"> 차례</em>}</span>
   <strong className="fun-team-score" aria-live="polite" aria-label={`${state.teams===1?'우리 반':TEAM_NAMES[team]} ${label} ${score}`}>{score}</strong>
   {!readOnly&&<span className="fun-team-buttons">
    <button type="button" disabled={disabled||canScore?.(team,-1)===false} onClick={()=>dispatch({type:'score',team,delta:-1})} aria-label={`${state.teams===1?'우리 반':TEAM_NAMES[team]} ${label} 1 빼기`}>−1</button>
    <button type="button" disabled={disabled||canScore?.(team,1)===false} className="fun-plus" onClick={()=>dispatch({type:'score',team,delta:1})} aria-label={`${state.teams===1?'우리 반':TEAM_NAMES[team]} ${label} 1 더하기`}>+1</button>
   </span>}
  </li>)}
 </ol>;
}

/** 반 전체 콤보 게이지. 꽉 차면 필살기 버튼이 켜진다(게임마다 쓰임이 다름). */
export function ComboGauge({combo,label='반 전체 힘 모으기'}:{combo:number;label?:string}){
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

/**
 * 남은 시간 막대: 숫자와 함께, 줄어드는 막대로도 보여 준다(글을 못 읽는 학생도 알 수 있게).
 * 넉넉하면 초록, 노랑, 빨강 순서. 기준은 단계 길이에 비례한다(짧은 시범·연습 판이 처음부터 노랑·빨강으로 시작하지 않게).
 * 숫자 쪽(fun-timer)도 같은 기준으로 색이 바뀐다. 숫자 쪽이 화면 낭독기용이라 막대는 숨긴다.
 */
export function TimeBar({left,total}:{left:number;total:number}){
 const ratio=total>0?Math.min(1,Math.max(0,left/total)):0;
 const level=timeLevel(left,total);
 return <div className="fun-timebar" data-level={level} aria-hidden="true"><i style={{width:`${(ratio*100).toFixed(1)}%`}}/></div>;
}

/** 시범 애니메이션: 자세 그림과 설명이 2.4초마다 넘어간다. 움직임 줄이기 설정이면 버튼으로 넘긴다(시범도 저절로 끝나지 않음). */
export function DemoLoop({frames,onSkip,skipLabel,seated=false}:{frames:readonly DemoFrame[];onSkip?:()=>void;skipLabel?:string;seated?:boolean}){
 const [i,setI]=useState(0);
 const reduced=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 useEffect(()=>{if(reduced||frames.length<2)return;const id=window.setInterval(()=>setI(x=>(x+1)%frames.length),2400);return ()=>window.clearInterval(id);},[frames.length,reduced]);
 const f=frames[i%frames.length];
 return <section className="fun-demo" aria-label="시범">
  <p className="fun-demo-step">시범 {i%frames.length+1}/{frames.length}</p>
  <div className="fun-demo-figure" key={i}><StickFigure pose={f.pose} size={150} seated={seated}/></div>
  <p className="fun-demo-caption" aria-live="polite">{f.caption}</p>
  <div className="fun-demo-dots" aria-hidden="true">{frames.map((_,k)=><i key={k} data-now={k===i%frames.length||undefined}/>)}</div>
  {reduced&&frames.length>1&&<button type="button" className="fun-secondary" onClick={()=>setI(x=>(x+1)%frames.length)}>다음 시범 보기</button>}
  {/* 화면의 주 버튼은 오른쪽 아래 '다음' 하나다. 선생님 버튼 줄이 없는 화면에서만 시범 안에 보조 버튼을 둔다(같은 버튼이 두 번 보이지 않게). */}
  {onSkip&&skipLabel&&<button type="button" className="fun-secondary fun-demo-skip" onClick={onSkip}>{skipLabel}</button>}
 </section>;
}

export interface TeacherButton {label:string;command:ExternalFunCommand;disabled?:boolean;hint?:string;tone?:'primary'|'gold'|'danger'}
/** 선생님 버튼 줄. 키보드 단축키를 버튼에 적어 둔다. */
export function TeacherControls({buttons,dispatch}:{buttons:TeacherButton[];dispatch:(c:ExternalFunCommand)=>void}){
 return <div className="fun-controls" role="group" aria-label="선생님 버튼">
  {buttons.map(b=><button key={b.label} type="button" data-tone={b.tone} data-command={b.command.type} disabled={b.disabled} onClick={()=>dispatch(b.command)}>
   {b.label}{b.hint&&<kbd>{b.hint}</kbd>}
  </button>)}
 </div>;
}
