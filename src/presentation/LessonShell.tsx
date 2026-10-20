import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import brandLogo from '../assets/brand-logo.png';
import { HeaderUtilities } from './components/HeaderUtilities';
import './SimpleFlow.css';
import './LessonShell.css';

export function LessonShell({ children, audience }: { children: ReactNode; audience: 'teacher' | 'student' }) {
  return <main className={`flow lesson-shell lesson-${audience}`}><div className="lesson-wrap">
    <header className="lesson-header"><Link className="lesson-brand" to="/" aria-label="땀방울 원정대 홈"><img src={brandLogo} alt="" width="38" height="44"/><span>땀방울 원정대<small>{audience === 'teacher' ? '선생님 수업 준비실' : '학생 수업 참여'}</small></span></Link><nav className="lesson-header-actions" aria-label="이용 설정"><HeaderUtilities/><Link className="lesson-home-link" to="/">홈으로</Link></nav></header>
    {children}
    <footer className="lesson-footer"><Link to="/demo">{audience === 'teacher' ? '처음이라면? 예시 수업 체험' : '처음이라면? 참여 방법 보기'} ↗</Link><Link to="/privacy">개인정보 안내</Link></footer>
  </div></main>;
}
