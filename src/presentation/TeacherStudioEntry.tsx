import { Link } from 'react-router-dom';
import './TeacherAi.css';

export function TeacherStudioEntry() {
  return <main className="teacher-ai">
    <header><strong>교사 수업 준비실</strong><Link to="/hub">활동 탐색으로 돌아가기</Link></header>
    <section className="ai-intro">
      <p className="ai-eyebrow">땀방울 원정대 · GEMINI TEACHER STUDIO</p>
      <h1>교사 전용 AI 도구에서<br/>수업 준비를 이어가세요.</h1>
      <p>활동 추천·난이도 조절·지도안과 성찰 질문은 별도 교사 도구에서 생성합니다.</p>
    </section>
    <section className="ai-form" aria-labelledby="studio-entry-title">
      <h2 id="studio-entry-title">Gemini 교사 수업 준비실</h2>
      <p className="ai-notice">기존 교사 접근 코드로 로그인하고 교사 확인을 해 주세요. 새 화면에서 수업 조건을 선택하고 개인정보 전송 확인에 체크하면 생성할 수 있습니다.</p>
      <a className="inline-flex items-center justify-center rounded-xl bg-cyan-700 text-white px-5 py-4 font-bold min-h-12" href="https://physical-teacher-studio.vercel.app/" rel="noreferrer">Gemini 교사 도구 열기 →</a>
      <p className="ai-notice">학생 앱의 기록·메모와 여기서 선택했던 조건은 자동 전송하지 않습니다. 학생에게 교사 도구 주소나 접근 코드를 공유하지 마세요.</p>
    </section>
  </main>;
}
