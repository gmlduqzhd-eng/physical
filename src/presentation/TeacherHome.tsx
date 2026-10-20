import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { LessonShell } from './LessonShell';

export function TeacherHome() {
  return <LessonShell audience="teacher">
    <section className="lesson-intro"><p className="lesson-eyebrow">선생님을 위한 수업 공간</p><h1>오늘의 수업을,<br/>차근차근 준비해요.</h1><p>활동을 고르고 모둠을 정하면,<br/>학생에게 보여 줄 참여 QR이 준비됩니다.</p></section>
    <div className="teacher-workspace"><section className="lesson-new"><div className="lesson-card-top"><span className="lesson-icon"><Plus aria-hidden="true"/></span><h2>새 수업 준비</h2></div><ol className="lesson-steps"><li><b>1</b>활동 선택</li><li><b>2</b>모둠·시간</li><li><b>3</b>QR로 참여</li></ol><Link className="lesson-action lesson-primary" to="/teacher/setup">수업 준비 시작 <ArrowRight aria-hidden="true"/></Link><Link className="lesson-action lesson-secondary" style={{marginTop:10}} to="/teacher/setup?reuse=1">지난 설정으로 빠르게 준비 <ArrowRight aria-hidden="true"/></Link></section>
      <section className="lesson-resume"><span className="lesson-icon"><RotateCcw aria-hidden="true"/></span><h2>준비하던 수업 이어가기</h2><p>교사 인증 후 이 기기에서 만든<br/>수업을 확인하세요.</p><Link className="lesson-action lesson-secondary" to="/teacher/setup?resume=1">내 수업 찾기 <ArrowRight aria-hidden="true"/></Link></section></div>
    <p className="lesson-section-label">다른 준비 방법</p><nav className="lesson-aids" aria-label="다른 준비 방법"><Link to="/teacher-ai"><Sparkles aria-hidden="true"/><span>AI로 수업 준비<small>아이디어가 필요할 때</small></span><ArrowRight aria-hidden="true"/></Link><Link to="/hub"><BookOpen aria-hidden="true"/><span>활동 둘러보기<small>활동부터 고르고 싶을 때</small></span><ArrowRight aria-hidden="true"/></Link></nav>
    <details className="lesson-more"><summary>더 많은 교사 도구</summary><nav className="quiet-links"><Link to="/admin">기존 상세 제어 패널</Link><Link to="/kiosk">공용 패드 모드</Link><Link to="/board">전광판 연결</Link><Link to="/manual">전체 사용 설명서</Link><Link to="/about">앱 소개·접속 QR</Link></nav></details>
  </LessonShell>;
}
