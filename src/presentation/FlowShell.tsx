import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CircleHelp, Home } from 'lucide-react';
import './SimpleFlow.css';
import { HeaderToolbar } from './components/HeaderToolbar';
import {ForestBrand} from './components/ForestIdentity';
import {screenNameFor} from '../domain/glossary';
export function FlowShell({ children, back = '/', backLabel: givenBackLabel, className = '', studentMode }: { children: ReactNode; back?: string; backLabel?: string; utilities?: boolean; className?: string; studentMode?: boolean }) {
  // 뒤로 가기 이름은 따로 적지 않으면 용어 사전의 화면 이름을 쓴다(같은 화면은 늘 같은 이름).
  const backLabel = givenBackLabel ?? (back === '/' ? '처음으로' : screenNameFor(back) ?? '처음으로');
  return <main className={`flow activity-tools-scope ${className}`}><div className="flow-wrap"><header><Link className="activity-brand" to="/" style={{textDecoration:'none'}}><ForestBrand/></Link><HeaderToolbar studentMode={studentMode}><Link className="icon-toolbar-action" to={back} title={backLabel}>{back === '/' ? <Home aria-hidden="true"/> : <ArrowLeft aria-hidden="true"/>}<span>{backLabel}</span></Link>{!studentMode && <Link className="icon-toolbar-action" to="/manual" title="이용 안내"><CircleHelp aria-hidden="true"/><span>이용 안내</span></Link>}</HeaderToolbar></header>{children}<footer><Link to="/demo">예시로 사용법 둘러보기</Link> · <Link to="/privacy">개인정보·공용 기기 관리</Link></footer></div></main>;
}
