import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlowShell } from './FlowShell';
export function DemoLesson() {
  const [role,setRole]=useState<'teacher'|'student'>('teacher');const [step,setStep]=useState(0);const [score,setScore]=useState(0);
  const titles=role==='teacher'?['활동을 골라요','모둠과 시간을 정해요','학생 참여를 안내해요','결과를 함께 돌아봐요']:['우리 모둠에 입장해요','선생님 설명을 들어요','활동을 마치고 점수를 올려요','오늘 활동을 돌아봐요'];
  return <FlowShell><p className="demo-banner">예시 체험 · 실제 수업방·QR·학생 기록을 만들지 않으며 AI를 호출하지 않습니다.</p><h1>처음이라면 함께 해 봐요</h1><div className="chips"><button aria-pressed={role==='teacher'} onClick={()=>{setRole('teacher');setStep(0);setScore(0);}}>선생님 체험</button><button aria-pressed={role==='student'} onClick={()=>{setRole('student');setStep(0);setScore(0);}}>학생 체험</button></div><ol className="steps">{titles.map((t,i)=><li key={t} aria-current={step===i?'step':undefined}>{i+1}. {t}</li>)}</ol><section className="card"><span className="pill">예시 {step+1}/4</span><h2 style={{marginTop:16}}>{titles[step]}</h2>
    {step===0&&<><p>{role==='teacher'?'목적에 맞는 활동 카드를 보고 ‘이 활동 선택’을 누릅니다.':'수업 QR을 촬영하거나 모둠 PIN을 입력한 뒤 학급 번호와 별명을 입력해 입장해요.'}</p><div className="preview"><strong>{role==='teacher'?'스마트 코트: 빈 공간 점령 작전':'1모둠 참여'}</strong><p>{role==='teacher'?'약 15분 · 팀 조끼·4색 콘':'실명 대신 학급 번호와 별명으로 안전하게 참여해요.'}</p></div></>}
    {step===1&&<><p>{role==='teacher'?'모둠 수와 활동 시간을 고르고 안전 확인을 합니다.':'입장 후에는 선생님의 활동 설명과 안전 안내를 기다려요.'}</p><div className="preview">예시 수업: 6모둠 · 20분 · 공간과 기기 확인</div></>}
    {step===2&&<><p>{role==='teacher'?'각 모둠에게 해당 QR이나 4자리 입장 PIN을 보여 주세요.':'활동을 마치면 우리 모둠 점수와 완료 현황에 즉시 반영됩니다.'}</p><div className="preview">{role==='teacher'?'[예시 QR 자리 — 실제로 스캔되지 않습니다]':'[예시] 미션 완료 · 모둠 점수 즉시 반영'}</div></>}
    {step===3&&<><p>{role==='teacher'?'모둠별 활동 결과와 오늘의 회고를 한눈에 살펴보세요.':'친구와 어떤 도움을 주고받았는지 이야기해 봐요.'}</p><p className="big-number">예시 1모둠 · {score}점</p>{role==='teacher'&&<button disabled={score>0} onClick={()=>setScore(10)}>{score?'예시 점수 반영됨':'예시 미션 완료 체험'}</button>}<p className="notice">이 결과는 체험용이며 실제 기록이나 AI 결과가 아닙니다.</p></>}
    <div className="row" style={{marginTop:24}}>{step>0&&<button onClick={()=>setStep(step-1)}>이전 단계</button>}{step<3?<button className="primary" onClick={()=>setStep(step+1)}>{step===0?(role==='teacher'?'예시 활동 선택':'예시 모둠 확인'):'다음 단계 체험'}</button>:<Link className="primary" to={role==='teacher'?'/teacher':'/lobby'}>{role==='teacher'?'내 수업 준비하기':'실제 수업 참여하기'}</Link>}</div></section></FlowShell>;
}
