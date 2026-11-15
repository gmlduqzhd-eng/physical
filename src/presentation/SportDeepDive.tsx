import {useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {DEEP_TABS,deepDive,quizResult,termTopics,type DeepTabId} from '../domain/sportDeepDive';
import {SPORT_BY_ID} from '../domain/sportsClassroom';
import './PlayExperiences.css';
import './SportsClassroom.css';
import './SafetyClassroom.css';
import './SportDeepDive.css';

/** 종목 깊이 보기: 처음 배우기 → 기술 → 포지션 → 퀴즈 */
export function SportDeepDive(){
 const {sportId}=useParams(),dive=deepDive(sportId),sport=SPORT_BY_ID.get(sportId??'');
 const [tab,setTab]=useState<DeepTabId>('learn'),[skill,setSkill]=useState(0),[position,setPosition]=useState(0),[answers,setAnswers]=useState<(number|null)[]>([]);
 if(!dive||!sport)return <FlowShell utilities back="/sports" backLabel="종목 고르기"><section className="play-experiences"><h1>깊이 보기 자료가 아직 없어요</h1><Link className="primary" to="/sports">종목 고르기로</Link></section></FlowShell>;
 const s=dive.skills[skill],p=dive.positions[position],picked=dive.quiz.map((_,i)=>answers[i]??null),result=quizResult(dive,picked),done=picked.every(a=>a!==null);
 return <FlowShell utilities back={`/sports/${dive.sportId}`} backLabel={`${sport.name} 수업`}><section className="play-experiences sports-lesson deep-dive" aria-label={dive.title} data-tab={tab}>
  <p className="eyebrow">종목 교실 · 깊이 보기</p><h1><span aria-hidden="true">{sport.icon}</span> {dive.title}</h1><p>{dive.lead}</p><p className="safety-rule">{dive.note}</p>
  <nav className="sports-stages" aria-label="깊이 보기 갈래">{DEEP_TABS.map((t,i)=><button key={t.id} aria-current={tab===t.id?'page':undefined} onClick={()=>setTab(t.id)}>{i+1}. {t.label}</button>)}</nav>
  <section className="recipe-card sports-stage">
   {tab==='learn'&&<><h2>꼭 알아 둘 규칙</h2><ul className="deep-cards">{dive.rules.map(r=><li key={r.id}><span className="deep-symbol" aria-hidden="true">{r.symbol}</span><div><strong>{r.name}</strong><p>{r.summary}</p><p className="sports-muted">{r.example}</p></div></li>)}</ul>
    {termTopics(dive).map(topic=><section key={topic} aria-label={`${topic} 용어`}><h3>{topic} 용어</h3><dl className="deep-terms">{dive.terms.filter(t=>t.topic===topic).map(t=><div key={t.id}><dt>{t.name}</dt><dd>{t.summary}<small>{t.example}</small></dd></div>)}</dl></section>)}
    <div className="sports-nav"><span/><button className="primary" onClick={()=>setTab('skills')}>기술 배우기 →</button></div></>}
   {tab==='skills'&&<><div className="sports-filters" role="group" aria-label="기술 고르기">{dive.skills.map((x,i)=><button key={x.id} aria-pressed={skill===i} onClick={()=>setSkill(i)}>{x.name}</button>)}</div>
    <h2>{s.name} <small className="deep-sub">{s.subtitle}</small></h2><p className="sports-guide">{s.purpose}</p><p><strong>준비 자세</strong> · {s.preparation}</p>
    <h3>따라 하기</h3><ol className="sports-rules">{s.steps.map(x=><li key={x}>{x}</li>)}</ol>
    <h3>이런 실수가 많아요</h3><ul className="sports-rules">{s.mistakes.map(x=><li key={x}>{x}</li>)}</ul>
    <h3>연습해 봐요</h3><ul className="sports-rules">{s.drills.map(x=><li key={x}>{x}</li>)}</ul>
    <div className="sports-nav"><button disabled={skill===0} onClick={()=>setSkill(skill-1)}>← 이전 기술</button>{skill<dive.skills.length-1?<button className="primary" onClick={()=>setSkill(skill+1)}>다음 기술 →</button>:<button className="primary" onClick={()=>setTab('positions')}>포지션 알아보기 →</button>}</div></>}
   {tab==='positions'&&<><div className="sports-filters" role="group" aria-label="포지션 고르기">{dive.positions.map((x,i)=><button key={x.id} aria-pressed={position===i} onClick={()=>setPosition(i)}>{x.name}</button>)}</div>
    <h2><span className="deep-symbol" aria-hidden="true">{p.abbreviation}</span> {p.name} <small className="deep-sub">{p.subtitle}</small></h2>
    <h3>이런 일을 해요</h3><ul className="sports-rules">{p.responsibilities.map(x=><li key={x}>{x}</li>)}</ul><h3>처음 해 보는 친구에게</h3><ul className="sports-rules">{p.tips.map(x=><li key={x}>{x}</li>)}</ul>
    <p className="sports-muted">역할과 자리는 팀마다 달라요. 수업에서는 돌아가며 여러 역할을 해 봐요.</p>
    <div className="sports-nav"><span/><button className="primary" onClick={()=>setTab('quiz')}>퀴즈 풀기 →</button></div></>}
   {tab==='quiz'&&<><h2>퀴즈 · {dive.quiz.length}문제</h2><p>틀려도 괜찮아요. 고르면 바로 풀이가 나와요.</p><ol className="safety-checks">{dive.quiz.map((q,i)=><li key={q.id}><p><strong>{q.question}</strong></p>
     <div className="safety-choices deep-choices" role="group" aria-label={`${i+1}번 문제`}>{q.choices.map((c,o)=><button key={c} aria-pressed={picked[i]===o} data-result={picked[i]===null?'open':o===q.answer?'safe':picked[i]===o?'risky':'open'} onClick={()=>{if(picked[i]!==null)return;const next=[...picked];next[i]=o;setAnswers(next);}}>{c}</button>)}</div>
     {picked[i]!==null&&<p className="sports-muted" role="status">{picked[i]===q.answer?'정답이에요! ':'다음에는 기억할 수 있어요. '}{q.explanation}</p>}</li>)}</ol>
    {done&&<div className="sports-guide" role="status">{result.total}문제 가운데 {result.correct}문제를 맞혔어요.</div>}
    <div className="sports-nav"><button disabled={picked.every(a=>a===null)} onClick={()=>setAnswers([])}>다시 풀기</button><Link className="primary" to={`/sports/${dive.sportId}`}>{sport.name} 수업 하러 가기 →</Link></div></>}
  </section>
 </section></FlowShell>;
}
