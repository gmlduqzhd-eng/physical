import {useState} from 'react';
import {Link} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {sfxPop,sfxSuccess,unlockAudio} from '../application/soundEffects';
import {ANGLE_PRESETS,ANGLE_TARGETS,FIELD_METERS,HIT_TOLERANCE,POWERS,bestAngle,clampAngle,flight,flightPath,hitFeedback,isHit,powerSpeed,type Attempt,type PowerId} from '../domain/angleLab';
import './PlayExperiences.css';
import './SportsClassroom.css';
import './ClassTools.css';
import './AngleLab.css';

const SCALE=40,W=FIELD_METERS*SCALE,H=11.5*SCALE,GROUND=H-30,X0=20;
const px=(m:number)=>X0+m*SCALE,py=(m:number)=>GROUND-m*SCALE;

/** 각도 실험: 던지는 각도에 따라 공이 얼마나 멀리 갈까 */
export function AngleLab(){
 const [angle,setAngle]=useState(45),[power,setPower]=useState<PowerId>('normal'),[attempts,setAttempts]=useState<Attempt[]>([]),[level,setLevel]=useState(0),[cleared,setCleared]=useState<number[]>([]);
 const target=ANGLE_TARGETS[level],last=attempts.at(-1),speed=powerSpeed(power),best=bestAngle(attempts,power);
 const shot=last?flightPath(last.angle,powerSpeed(last.power)):null,aim=angle*Math.PI/180;
 const launch=()=>{unlockAudio();const range=flight(angle,speed).range;setAttempts([...attempts,{angle,power,range}].slice(-8));if(isHit(range,target)){sfxSuccess();if(!cleared.includes(level))setCleared([...cleared,level]);}else sfxPop();};
 const set=(next:number)=>setAngle(clampAngle(next));
 return <FlowShell utilities><section className="play-experiences sports-lesson angle-lab" aria-label="각도 실험">
  <p className="eyebrow">체육수업 대백과 · 생각하는 체육</p><h1>각도 실험 <small>몇 도로 던져야 가장 멀리 갈까</small></h1>
  <p>각도와 세기를 정해 공을 던져요. 먼저 어디에 떨어질지 예상해서 말한 다음 던져 봐요.</p>
  <section className="recipe-card sports-stage">
   <div className="sports-filters" role="group" aria-label="과녁 고르기">{ANGLE_TARGETS.map((t,i)=><button key={t} aria-pressed={level===i} onClick={()=>setLevel(i)}>{cleared.includes(i)?'✅ ':''}과녁 {i+1} · {t}m</button>)}</div>
   <svg className="angle-field" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`던지기 실험장. 과녁은 ${target}m 지점. ${last?`방금 ${last.angle}도로 던져 ${last.range}m 갔어요.`:'아직 던지지 않았어요.'}`}>
    <line x1={0} x2={W} y1={GROUND} y2={GROUND} className="angle-ground"/>
    {Array.from({length:FIELD_METERS/2+1},(_,i)=>i*2).map(m=><g key={m}><line x1={px(m)} x2={px(m)} y1={GROUND} y2={GROUND+8} className="angle-ground"/><text x={px(m)} y={GROUND+24} textAnchor="middle" className="angle-tick">{m}m</text></g>)}
    <rect x={px(target-HIT_TOLERANCE)} y={GROUND-10} width={HIT_TOLERANCE*2*SCALE} height={10} className="angle-target"/><text x={px(target)} y={GROUND-18} textAnchor="middle" className="angle-flag">🎯</text>
    <line x1={px(0)} y1={py(0)} x2={px(0)+Math.cos(aim)*90} y2={py(0)-Math.sin(aim)*90} className="angle-aim"/>
    {shot&&<><polyline key={attempts.length} points={shot.map(([x,y])=>`${px(x)},${py(y)}`).join(' ')} className="angle-path" pathLength={1}/><circle cx={px(shot.at(-1)![0])} cy={py(0)-8} r={9} className="angle-ball"/></>}
   </svg>
   <p className="angle-result" role="status">{last?`${last.angle}° · ${POWERS.find(p=>p.id===last.power)!.label} → ${last.range}m. ${hitFeedback(last.range,target)}`:`과녁은 ${target}m 지점이에요. 앞뒤 ${HIT_TOLERANCE}m 안에 떨어지면 맞아요.`}</p>
   <div className="angle-controls">
    <label className="angle-slider">던지는 각도 <strong>{angle}°</strong><input type="range" min={0} max={90} step={1} value={angle} aria-label="던지는 각도" onChange={e=>set(Number(e.target.value))}/></label>
    <div className="sports-filters" role="group" aria-label="각도 빠르게 고르기"><button onClick={()=>set(angle-1)} aria-label="1도 낮추기">−1°</button>{ANGLE_PRESETS.map(a=><button key={a} aria-pressed={angle===a} onClick={()=>set(a)}>{a}°</button>)}<button onClick={()=>set(angle+1)} aria-label="1도 높이기">+1°</button></div>
    <div className="sports-filters" role="group" aria-label="던지는 세기">{POWERS.map(p=><button key={p.id} aria-pressed={power===p.id} onClick={()=>setPower(p.id)}>{p.label}</button>)}</div>
    <div className="flagship-row tools-center"><button className="primary tools-go" onClick={launch}>던지기!</button><button disabled={!attempts.length} onClick={()=>setAttempts([])}>기록 지우기</button></div>
   </div>
   {attempts.length>0&&<table className="sports-medals"><caption>던진 기록 (최근 8번)</caption><thead><tr><th scope="col">각도</th><th scope="col">세기</th><th scope="col">거리</th></tr></thead><tbody>{attempts.map((a,i)=><tr key={i}><td>{a.angle}°</td><td>{POWERS.find(p=>p.id===a.power)!.label}</td><td>{a.range}m</td></tr>)}</tbody></table>}
   {best!==null&&attempts.filter(a=>a.power===power).length>=3&&<p className="sports-guide">지금 세기에서는 {best}°로 던졌을 때 가장 멀리 갔어요. 더 멀리 가는 각도가 있을까요?</p>}
  </section>
  <section className="recipe-card" aria-label="생각해 보기"><h2>찾아보기</h2><ul className="sports-rules"><li>같은 세기로 30°와 60°를 던지면 어디에 떨어질까요?</li><li>가장 멀리 가는 각도는 몇 도 근처일까요?</li><li>너무 낮게(15°) 또는 너무 높게(75°) 던지면 왜 멀리 가지 못할까요?</li></ul>
   <h3>운동장에서 확인하기</h3><p>콩주머니를 낮게, 비스듬히, 높게 세 가지로 던져 떨어진 곳에 고깔을 놓아요. 던지는 쪽에 사람이 없는지 먼저 확인하고, 신호에 맞춰 한 방향으로만 던져요.</p>
   <p className="sports-muted">화면 속 공은 공기 저항이 없고 땅 높이에서 던진다고 가정했어요. 실제로는 던지는 높이와 공의 종류에 따라 조금 달라져요.</p>
   <div className="flagship-row"><Link to="/sports/longjump">멀리뛰기 수업</Link><Link to="/sports/baseball">야구 수업</Link></div></section>
 </section></FlowShell>;
}
