import type {GameDef} from '../../domain/gamesData';
import {teacherGuide} from '../../domain/teacherGuide';

/** 활동 카드의 '선생님 안내': 발문, 활용 팁, 교육과정 연결. 추천 기준은 접어 두고 '원문 확인' 안내를 한 번만 적는다. */
export function TeacherGuidePanel({game}:{game:GameDef}){
 const guide=teacherGuide(game);
 const fromData=guide.standards.filter(s=>s.source==='data'),suggested=guide.standards.filter(s=>s.source==='suggested');
 return <section className="teacher-guide" aria-label={`${game.name} 선생님 안내`}>
  <h3>📘 선생님 안내</h3>
  <h4>발문</h4>
  <ol>{guide.questions.map(q=><li key={q}>{q}</li>)}</ol>
  {guide.tips.length>0&&<><h4>활용 팁</h4><ul>{guide.tips.map(t=><li key={t}>{t}</li>)}</ul></>}
  <h4>교육과정 연결</h4>
  <ul>
   {guide.lowGradeTheme&&<li><strong>1~2학년군</strong> · 즐거운 생활 연계 주제: {guide.lowGradeTheme} <small>(1~2학년군은 체육 교과가 따로 없어요)</small></li>}
   {fromData.map(s=><li key={s.grade}><strong>{s.grade}</strong> · {s.standards.map(x=>`${x.code} ${x.subArea}`).join(', ')} <small>(활동 자료)</small></li>)}
  </ul>
  {suggested.length>0&&<details className="teacher-guide-suggested"><summary>추천 성취기준 보기 · 수업 전 원문 확인</summary><ul>{suggested.map(s=><li key={s.grade}><strong>{s.grade}</strong> · {s.standards.map(x=>`${x.code} ${x.subArea}`).join(', ')}</li>)}</ul></details>}
 </section>;
}
