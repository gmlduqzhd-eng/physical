import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CircleHelp, Home } from 'lucide-react';
import {ForestBrand} from './components/ForestIdentity';
import {screenNameFor} from '../domain/glossary';
import { HeaderToolbar } from './components/HeaderToolbar';
import './SimpleFlow.css';
import './LessonShell.css';

export function LessonShell({ children, audience, className = '', back = '/', backLabel: givenBackLabel }: { children: ReactNode; audience: 'teacher' | 'student'; className?: string; back?: string; backLabel?: string }) {
  // 뒤로 가기 이름은 따로 적지 않으면 용어 사전의 화면 이름을 쓴다(같은 화면은 늘 같은 이름).
  const backLabel = givenBackLabel ?? (back === '/' ? '홈으로' : screenNameFor(back) ?? '홈으로');
  return <main className={`flow lesson-shell lesson-${audience} ${className}`}><div className="lesson-wrap">
    <header className="lesson-header"><Link className="lesson-brand" to="/" aria-label="땀방울 원정대 홈"><ForestBrand subtitle={audience === 'teacher' ? '선생님 수업 준비' : '학생 수업 참여'}/></Link><HeaderToolbar studentMode={audience === 'student'}><Link className="icon-toolbar-action" to={back} title={backLabel}>{back === '/' ? <Home aria-hidden="true"/> : <ArrowLeft aria-hidden="true"/>}<span>{backLabel}</span></Link>{audience !== 'student' && <Link className="icon-toolbar-action" to="/manual" title="이용 안내"><CircleHelp aria-hidden="true"/><span>이용 안내</span></Link>}</HeaderToolbar></header>
    {children}
    <footer className="lesson-footer"><Link to="/demo">{audience === 'teacher' ? '처음이라면? 예시 수업 체험' : '처음이라면? 참여 방법 보기'} ↗</Link><Link to="/privacy">개인정보 안내</Link></footer>
  </div></main>;
}
