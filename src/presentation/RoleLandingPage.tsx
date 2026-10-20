import { Link } from 'react-router-dom';
import { FlowShell } from './FlowShell';
export function RoleLandingPage() {
  return <FlowShell back="/manual" backLabel="이용 안내"><p className="eyebrow">함께 움직이는 즐거운 체육 시간</p><h1>반가워요!<br/>어떻게 참여하시나요?</h1><p className="muted">선생님 또는 학생을 선택해 주세요.</p><div className="grid" style={{marginTop:32}}>
    <Link to="/teacher" className="card role"><span className="role-icon" aria-hidden="true">📋</span><h2>선생님이에요</h2><p className="muted">활동을 고르고, 수업을 준비하고 진행해요.</p><strong>수업 준비하기 →</strong></Link>
    <Link to="/lobby" className="card role"><span className="role-icon" aria-hidden="true">🙌</span><h2>학생이에요</h2><p className="muted">선생님이 보여주신 QR이나 코드로 참여해요.</p><strong>수업 참여하기 →</strong></Link>
  </div><nav className="quiet-links" aria-label="다른 이용 방법"><Link to="/hub">혼자 활동하기</Link><Link to="/demo">처음이라면? 예시로 둘러보기</Link></nav></FlowShell>;
}
