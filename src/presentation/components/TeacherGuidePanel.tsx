import type {GameDef} from '../../domain/gamesData';
import {teacherGuide} from '../../domain/teacherGuide';

/** 활동 카드의 '선생님 안내': 교육과정 연결(활동 자료 또는 추천), 발문, 활용 팁. */
export function TeacherGuidePanel({game}:{game:GameDef}){
 const guide=teacherGuide(game);
 return <section className="teacher-guide" aria-label={`${game.name} 선생님 안내`}>
  <h3>📘 선생님 안내</h3>
  <h4>교육과정 연결</h4>
  <ul>
   {guide.lowGradeTheme&&<li><strong>1~2학년</strong> · 즐거운 생활 연계 주제: {guide.lowGradeTheme} <small>(1~2학년은 체육 교과가 따로 없어요)</small></li>}
   {guide.standards.map(s=><li key={s.grade}><strong>{s.grade}</strong> · {s.standards.map(x=>`${x.code} ${x.subArea}`).join(', ')} <small>{s.source==='data'?'(활동 자료)':'(추천 · 수업 전 원문 확인)'}</small></li>)}
  </ul>
  <h4>발문</h4>
  <ol>{guide.questions.map(q=><li key={q}>{q}</li>)}</ol>
  {guide.tips.length>0&&<><h4>활용 팁</h4><ul>{guide.tips.map(t=><li key={t}>{t}</li>)}</ul></>}
 </section>;
}
