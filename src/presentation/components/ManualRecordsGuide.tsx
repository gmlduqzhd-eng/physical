import {Link} from 'react-router-dom';

const ITEMS:readonly {icon:string;title:string;to:string;go:string;steps:readonly string[]}[]=[
 {icon:'🏫',title:'반 관리 — 여러 반을 따로 기록하기',to:'/class-progress',go:'우리 반 반응 열기',steps:['‘반 관리 · 기록 보관’을 눌러 “5학년 2반”처럼 반을 추가해요.','‘기록할 반’에서 반을 고르면 👍/👎 반응과 원정 지도 도장이 그 반에 쌓여요.','오늘 수업 화면에서도 반을 고를 수 있고, 게임이 끝나면 어느 반에 기록되는지 보여 줘요.']},
 {icon:'📅',title:'여러 차시 계획 — 한 번에 2~8차시 짜기',to:'/week',go:'여러 차시 계획 열기',steps:['학년·장소·시간과 차시 수를 골라요.','본게임은 반의 반응을 보고 골라요. 👍가 많았던 활동과 안 해 본 활동이 먼저 나와요.','‘이 계획으로 정하기’를 누르면 그 주 계획이 고정되고, 차시를 누르면 그 수업이 바로 열려요.']},
 {icon:'📄',title:'학기 정리 — 한 장으로 모아 보기',to:'/class-progress?tab=term',go:'학기 정리 열기',steps:['기간, 수업한 날, 판 수, 영역별 판 수, 반응이 좋았던 활동을 한 장으로 모아요.','‘인쇄하기’나 엑셀·한글·PDF로 받아 평가·학부모 안내 자료에 써요.','학생 개인 기록은 없고, 평가 문구를 대신 써 주지는 않아요.']},
 {icon:'💾',title:'기록 보관 — 파일로 받거나 계정에 올리기',to:'/class-progress',go:'기록 보관 열기',steps:['기록은 이 기기의 브라우저에 있어요. 컴퓨터를 바꾸거나 기록을 지우기 전에 ‘기록 파일로 보관’으로 받아 두세요.','새 기기에서는 ‘기록 파일 가져오기’로 이어 써요.','선생님으로 로그인하면 ‘계정에 올리기 / 계정에서 가져오기’도 쓸 수 있어요(누를 때만 동작해요).']},
];

/** 사용 설명서: 우리 반 기록과 여러 차시 계획 쓰는 법. */
export function ManualRecordsGuide(){
 return <section className="space-y-4" aria-labelledby="manual-records-title" data-manual-records>
  <h3 id="manual-records-title" className="text-lg sm:text-xl font-black text-cyan-300">🗂 우리 반 기록과 여러 차시 계획</h3>
  <p className="text-sm text-slate-300 leading-relaxed">게임을 마칠 때 남긴 기록을 반마다 모으고, 그 기록으로 다음 수업을 짜요. 모두 수업 도구 화면 맨 위 ‘우리 반 기록’에서 들어갈 수 있어요.</p>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">{ITEMS.map(item=><div key={item.title} className="bg-slate-950/80 p-4 rounded-2xl border border-slate-700 space-y-2">
   <h4 className="font-black text-white text-base"><span aria-hidden="true">{item.icon}</span> {item.title}</h4>
   <ol className="list-decimal pl-5 text-sm text-slate-300 leading-relaxed space-y-1">{item.steps.map(step=><li key={step}>{step}</li>)}</ol>
   <Link to={item.to} className="inline-flex items-center min-h-[44px] font-bold text-cyan-300 underline">{item.go} →</Link>
  </div>)}</div>
 </section>;
}
