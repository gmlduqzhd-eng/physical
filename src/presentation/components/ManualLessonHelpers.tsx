import {Link} from 'react-router-dom';
import {LESSON_HELPERS as HELPERS} from '../../domain/lessonHelpers';

export function ManualLessonHelpers(){
 return <section className="space-y-4" aria-labelledby="manual-helpers-title" data-manual-helpers>
  <h3 id="manual-helpers-title" className="text-lg sm:text-xl font-black text-cyan-300">🧰 수업 중에 바로 쓰는 도구와 안내</h3>
  <p className="text-sm text-slate-300 leading-relaxed">TV 한 대로 쓰고, 학생 이름은 받지 않아요. 활동 찾기에서 ‘줄넘기’, ‘수영’, ‘배드민턴’처럼 검색해도 바로 나와요.</p>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">{HELPERS.map(item=><div key={item.title} className="bg-slate-950/80 p-4 rounded-2xl border border-slate-700 space-y-2">
   <h4 className="font-black text-white text-base"><span aria-hidden="true">{item.icon}</span> {item.title}</h4>
   <ol className="list-decimal pl-5 text-sm text-slate-300 leading-relaxed space-y-1">{item.steps.map(step=><li key={step}>{step}</li>)}</ol>
   <Link to={item.to} className="inline-flex items-center min-h-[44px] font-bold text-cyan-300 underline">{item.go} →</Link>
  </div>)}</div>
 </section>;
}
