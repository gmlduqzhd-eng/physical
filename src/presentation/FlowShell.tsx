import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './SimpleFlow.css';
import { useBackgroundMusic } from '../application/BackgroundMusicContext';
export function FlowShell({ children, back = '/', backLabel = '처음으로' }: { children: ReactNode; back?: string; backLabel?: string }) {
  const {enabled,toggle}=useBackgroundMusic();
  return <main className="flow"><div className="flow-wrap"><header><Link to="/" style={{textDecoration:'none'}}><strong>💧 땀방울 원정대</strong></Link><div className="row"><button aria-pressed={enabled} onClick={toggle}>{enabled?'음악 끄기':'음악 켜기'}</button><Link to={back}>{backLabel}</Link></div></header>{children}<footer><Link to="/demo">예시로 사용법 둘러보기</Link> · <Link to="/privacy">개인정보·공용 기기 관리</Link></footer></div></main>;
}
