import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './SimpleFlow.css';
import { useBackgroundMusic } from '../application/BackgroundMusicContext';
import { HeaderUtilities } from './components/HeaderUtilities';
import {ForestBrand} from './components/ForestIdentity';
export function FlowShell({ children, back = '/', backLabel = '처음으로', utilities = false, className = '' }: { children: ReactNode; back?: string; backLabel?: string; utilities?: boolean; className?: string }) {
  const {enabled,toggle}=useBackgroundMusic();
  return <main className={`flow${utilities ? ' activity-tools-scope' : ''} ${className}`}><div className="flow-wrap"><header><Link className="activity-brand" to="/" style={{textDecoration:'none'}}><ForestBrand subtitle="함께 움직이는 체육 시간"/></Link><nav className="row activity-header-actions" aria-label="이용 설정">{utilities ? <HeaderUtilities/> : <button aria-pressed={enabled} onClick={toggle}>{enabled?'음악 끄기':'음악 켜기'}</button>}<Link to={back}>{backLabel}</Link></nav></header>{children}<footer><Link to="/demo">예시로 사용법 둘러보기</Link> · <Link to="/privacy">개인정보·공용 기기 관리</Link></footer></div></main>;
}
