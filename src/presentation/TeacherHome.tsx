import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { LessonShell } from './LessonShell';
import { TeacherRoomGuide } from './components/TeacherRoomGuide';

export function TeacherHome() {
  return <LessonShell audience="teacher">
    <section className="lesson-intro"><p className="lesson-eyebrow">선생님을 위한 수업 공간</p><h1>오늘의 수업을,<br/>차근차근 준비해요</h1><p>활동을 고르고 모둠을 정하면,<br/>학생에게 보여 줄 참여 QR이 준비됩니다.</p></section>
    <TeacherRoomGuide />
    <div className="teacher-workspace"><section className="lesson-new"><div className="lesson-card-top"><span className="lesson-icon"><Plus aria-hidden="true"/></span><h2>새 수업 준비</h2></div><ol className="lesson-steps"><li><b>1</b>활동 선택</li><li><b>2</b>모둠·시간</li><li><b>3</b>QR로 참여</li></ol><Link className="lesson-action lesson-primary" to="/teacher/setup">수업 준비 시작 <ArrowRight aria-hidden="true"/></Link><Link className="lesson-action lesson-secondary" style={{marginTop:10}} to="/teacher/setup?reuse=1">지난 설정으로 빠르게 준비 <ArrowRight aria-hidden="true"/></Link></section>
      <section className="lesson-resume"><span className="lesson-icon"><RotateCcw aria-hidden="true"/></span><h2>준비하던 수업 이어가기</h2><p>교사 인증 후 이 기기에서 만든<br/>수업을 확인하세요.</p><Link className="lesson-action lesson-secondary" to="/teacher/setup?resume=1">내 수업 찾기 <ArrowRight aria-hidden="true"/></Link></section></div>
    <section className="lesson-new"><h2>공간·기기만 맞춰 바로 준비</h2><p>체육관 모둠별 한 대 수업, 교실 작은 동작 합주 수업, 공용 화면 입문을 한 장으로 확인해요.</p><Link className="lesson-action lesson-primary" to="/lessons">수업 꾸러미 보기 →</Link></section>
    <nav className="quiet-links" aria-label="시간별 수업 꾸러미">{[10,20,40].map(n=><Link key={n} to={"/teacher/setup?package="+n}>{n}분 수업 꾸러미 →</Link>)}</nav><p className="lesson-section-label"><Link to="/expeditions">대표 원정 3가지 살펴보기 →</Link></p>
    <p className="lesson-section-label">다른 준비 방법</p><nav className="lesson-aids" aria-label="다른 준비 방법"><Link to="/teacher-ai"><Sparkles aria-hidden="true"/><span>AI로 수업 준비<small>아이디어가 필요할 때</small></span><ArrowRight aria-hidden="true"/></Link><Link to="/hub"><BookOpen aria-hidden="true"/><span>활동 고르기<small>활동부터 고르고 싶을 때</small></span><ArrowRight aria-hidden="true"/></Link><Link to="/sports"><BookOpen aria-hidden="true"/><span>종목 교실<small>종목별 리드업 게임과 점수판</small></span><ArrowRight aria-hidden="true"/></Link><Link to="/tools"><BookOpen aria-hidden="true"/><span>수업 도구<small>대진표·레이스 시계·뽑기</small></span><ArrowRight aria-hidden="true"/></Link></nav>
    <details className="lesson-more"><summary>더 많은 교사 도구</summary><nav className="quiet-links"><Link to="/device-check">수업 전 기기·연결 확인</Link><Link to="/teacher/manage">수업 정리·운영 관리</Link><Link to="/admin">교사 제어 패널(예전 화면)</Link><Link to="/kiosk">공용 패드 화면</Link><Link to="/board">TV 점수판 연결</Link><Link to="/manual">전체 사용 설명서</Link><Link to="/about">앱 소개·접속 QR</Link></nav></details>
  </LessonShell>;
}
