import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CircleHelp, Home } from 'lucide-react';
import './SimpleFlow.css';
import { HeaderToolbar } from './components/HeaderToolbar';
import {ForestBrand} from './components/ForestIdentity';
export function FlowShell({ children, back = '/', backLabel = '처음으로', className = '' }: { children: ReactNode; back?: string; backLabel?: string; utilities?: boolean; className?: string }) {
  return <main className={`flow activity-tools-scope ${className}`}><div className="flow-wrap"><header><Link className="activity-brand" to="/" style={{textDecoration:'none'}}><ForestBrand subtitle="함께 움직이는 체육 시간"/></Link><HeaderToolbar><Link className="icon-toolbar-action" to={back} title={backLabel}>{back === '/' ? <Home aria-hidden="true"/> : <ArrowLeft aria-hidden="true"/>}<span>{backLabel}</span></Link><Link className="icon-toolbar-action" to="/manual" title="이용 안내"><CircleHelp aria-hidden="true"/><span>이용 안내</span></Link></HeaderToolbar></header>{children}<footer><Link to="/demo">예시로 사용법 둘러보기</Link> · <Link to="/privacy">개인정보·공용 기기 관리</Link></footer></div></main>;
}
