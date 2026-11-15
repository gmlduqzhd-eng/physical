import {useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {sfxPop,unlockAudio} from '../application/soundEffects';
import {CROWD_DRILLS,CROWD_DRILL_RULE,CROWD_GRADES,CROWD_PROMISES,CROWD_SOURCE,CROWD_STEPS,CROWD_THEMES,CROWD_WHY,crowdCheckResult,crowdChecks,crowdDecisions,crowdTheme,isCrowdGrade,type CrowdGrade} from '../domain/crowdSafety';
import {SAFETY_LESSONS,SAFETY_LESSON_IDS} from '../domain/safetyLessons';
import './PlayExperiences.css';
import './SportsClassroom.css';
import './SafetyClassroom.css';

/** 안전 교실 첫 화면: 학년군과 상황 주제를 고르고, 응급·건강 안전 수업으로도 간다. */
export function SafetyClassroom(){
 const [grade,setGrade]=useState<CrowdGrade>('3-4'),[theme,setTheme]=useState('sports');
 return <FlowShell utilities><section className="play-experiences sports-classroom" aria-label="안전 교실">
  <p className="eyebrow">체육수업 대백과 · 안전 교실</p><h1>안전한 선택을 몸으로 익혀요</h1>
  <p>사람이 많이 모이는 곳에서 어떻게 움직일지, 상황을 보고 판단하고 몸으로 연습해요. 체육대회·현장체험학습 전에 쓰기 좋아요.</p>
  <section className="recipe-card" aria-label="다중밀집 안전 수업 고르기"><h2>사람이 많은 곳의 안전</h2>
   <h3 id="safety-grade">1. 학년군</h3><div className="safety-options" role="group" aria-labelledby="safety-grade">{CROWD_GRADES.map(g=><button key={g.id} aria-pressed={grade===g.id} onClick={()=>setGrade(g.id)}><strong>{g.label}</strong><small>{g.focus}</small></button>)}</div>
   <h3 id="safety-theme">2. 상황 주제</h3><div className="safety-options" role="group" aria-labelledby="safety-theme">{CROWD_THEMES.map(t=><button key={t.id} aria-pressed={theme===t.id} onClick={()=>setTheme(t.id)}><strong><span aria-hidden="true">{t.icon}</span> {t.label}</strong><small>상황 {t.situations.length||6}개</small></button>)}</div>
   <Link className="primary safety-start" to={`/safety/crowd?theme=${theme}&grade=${grade}`}>수업 시작하기 →</Link>
   <p className="sports-muted">상황 판단 → 몸으로 익히기 → 생각 확인 → 우리 반 약속 순서예요. 15~20분쯤 걸려요.</p></section>
  <h2>응급·건강 안전</h2><p className="sports-muted">상황 카드와 몸짓으로 익히는 안전 수업이에요.</p>
  <div className="sports-grid">{SAFETY_LESSON_IDS.map(id=>{const lesson=SAFETY_LESSONS[id];return <Link key={id} className="sports-card" to={`/play/${id}`} data-safety={id}><span className="sports-icon" aria-hidden="true">{lesson.emoji}</span><strong>{lesson.name}</strong><span>{lesson.description}</span></Link>;})}</div>
 </section></FlowShell>;
}

/** 다중밀집 안전 수업 한 차시 */
export function CrowdSafetyLesson(){
 const [params]=useSearchParams();
 const grade:CrowdGrade=isCrowdGrade(params.get('grade'))?params.get('grade') as CrowdGrade:'3-4',theme=crowdTheme(params.get('theme'));
 const cards=crowdDecisions(theme.id,grade),checks=crowdChecks(grade);
 const [step,setStep]=useState(0),[card,setCard]=useState(0),[picked,setPicked]=useState<(number|null)[]>(()=>cards.map(()=>null));
 const [drill,setDrill]=useState(0),[answers,setAnswers]=useState<(number|null)[]>(()=>checks.map(()=>null)),[promise,setPromise]=useState<number|null>(null);
 useEffect(()=>{window.scrollTo(0,0);},[step]);
 const id=CROWD_STEPS[step].id,now=cards[card],choice=picked[card],result=crowdCheckResult(grade,answers),answered=answers.every(a=>a!==null);
 const gradeLabel=CROWD_GRADES.find(g=>g.id===grade)!.label,d=CROWD_DRILLS[drill];
 return <FlowShell utilities back="/safety" backLabel="안전 교실"><section className="play-experiences sports-lesson safety-lesson" aria-label={`${theme.label} 안전 수업`} data-step={id} data-theme={theme.id} data-grade={grade}>
  <p className="eyebrow">안전 교실 · {gradeLabel}</p><h1><span aria-hidden="true">{theme.icon}</span> {theme.label}에서 안전하게</h1>
  <ol className="sports-stages" aria-label="수업 단계">{CROWD_STEPS.map((s,i)=><li key={s.id}><button aria-current={i===step?'step':undefined} onClick={()=>setStep(i)}>{i+1}. {s.label}</button></li>)}</ol>
  <section className="recipe-card sports-stage">
   {id==='decide'&&<><p className="sports-muted">상황 {card+1} / {cards.length}</p><h2>{now.title}</h2><p className="safety-situation">{now.situation}</p>
    <div className="safety-choices" role="group" aria-label="어떻게 할까요">{now.choices.map((c,i)=><button key={c.text} aria-pressed={choice===i} data-result={choice===null?'open':c.safe?'safe':choice===i?'risky':'open'} onClick={()=>{if(choice!==null)return;unlockAudio();sfxPop();setPicked(picked.map((p,j)=>j===card?i:p));}}>{c.text}</button>)}</div>
    {choice!==null&&<div className="sports-guide" role="status"><strong>{now.choices[choice].safe?'안전한 선택이에요. ':'다시 생각해 봐요. '}</strong>{now.choices[choice].feedback}</div>}
    {choice===null&&<p className="sports-muted">먼저 모둠에서 손을 들어 의견을 모은 뒤, 화면에서 하나를 골라요.</p>}
    <div className="sports-nav"><button disabled={card===0} onClick={()=>setCard(card-1)}>← 이전 상황</button>{card<cards.length-1?<button className="primary" disabled={choice===null} onClick={()=>setCard(card+1)}>다음 상황 →</button>:<button className="primary" disabled={choice===null} onClick={()=>setStep(1)}>몸으로 익히기 →</button>}</div></>}
   {id==='move'&&<><p className="sports-muted">연습 {drill+1} / {CROWD_DRILLS.length}</p><h2><span aria-hidden="true">{d.icon}</span> {d.title}</h2><p className="safety-situation">{d.how}</p><p className="sports-guide">함께 말해요 · {d.say}</p><p><strong>왜?</strong> {CROWD_WHY[d.goal]}</p><p className="safety-rule">{CROWD_DRILL_RULE}</p>
    <div className="sports-nav"><button disabled={drill===0} onClick={()=>setDrill(drill-1)}>← 이전 연습</button>{drill<CROWD_DRILLS.length-1?<button className="primary" onClick={()=>setDrill(drill+1)}>다음 연습 →</button>:<button className="primary" onClick={()=>setStep(2)}>생각 확인 →</button>}</div></>}
   {id==='check'&&<><h2>생각 확인 · 여섯 가지 질문</h2><ol className="safety-checks">{checks.map((c,i)=><li key={c.goal}><p><strong>{c.question}</strong></p>
     <div className="safety-choices" role="group" aria-label={`${i+1}번 질문`}>{c.options.map((option,o)=><button key={option} aria-pressed={answers[i]===o} data-result={answers[i]===null?'open':o===c.answer?'safe':answers[i]===o?'risky':'open'} onClick={()=>{if(answers[i]!==null)return;setAnswers(answers.map((a,j)=>j===i?o:a));}}>{option}</button>)}</div>
     {answers[i]!==null&&answers[i]!==c.answer&&<p className="sports-muted" role="status">{CROWD_WHY[c.goal]}</p>}</li>)}</ol>
    {answered&&<div className="sports-guide" role="status">{result.total}개 가운데 {result.correct}개를 안전하게 골랐어요.{result.missed.length>0&&' 표시된 설명을 다시 읽어 봐요.'}</div>}
    <div className="sports-nav"><button onClick={()=>setAnswers(checks.map(()=>null))} disabled={answers.every(a=>a===null)}>다시 풀기</button><button className="primary" disabled={!answered} onClick={()=>setStep(3)}>우리 반 약속 →</button></div></>}
   {id==='promise'&&<><h2>우리 반 안전 약속</h2><p>오늘 가장 기억하고 싶은 약속을 하나 골라 함께 소리 내어 읽어요.</p>
    <div className="safety-choices" role="group" aria-label="약속 고르기">{CROWD_PROMISES.map((p,i)=><button key={p} aria-pressed={promise===i} onClick={()=>setPromise(i)}>{p}</button>)}</div>
    {promise!==null&&<p className="safety-promise" role="status">“{CROWD_PROMISES[promise]}”</p>}
    <p className="sports-muted">자료: <a href={CROWD_SOURCE.url} target="_blank" rel="noreferrer">{CROWD_SOURCE.label}</a> ({CROWD_SOURCE.checked} 확인). 실제 위급한 상황에서는 주변 어른에게 알리고 119에 신고해요.</p>
    <div className="flagship-row"><Link className="primary" to="/safety">다른 주제 고르기</Link><Link to="/sports">종목 교실</Link></div></>}
  </section>
 </section></FlowShell>;
}
