import {Link} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {SIBLING_APPS} from '../domain/encyclopedia';
import './PlayExperiences.css';
import './SportsClassroom.css';

/** 쉬는 시간·더 보기: 엽쌤의 다른 웹앱으로 가는 길 */
export function MoreApps(){
 return <FlowShell utilities><section className="play-experiences sports-classroom more-apps" aria-label="쉬는 시간과 더 보기">
  <p className="eyebrow">체육수업 대백과 · 쉬는 시간·더 보기</p><h1>엽쌤의 다른 수업 앱</h1>
  <p>땀방울 원정대에 아이디어를 보탠 앱들이에요. 누르면 새 창에서 열리고, 땀방울 원정대의 수업방·기록과는 이어지지 않아요.</p>
  <ul className="sports-grid">{SIBLING_APPS.map(app=><li key={app.id}><a className="sports-card" href={app.url} target="_blank" rel="noreferrer" data-app={app.id}><span className="sports-icon" aria-hidden="true">{app.icon}</span><strong>{app.title}</strong><span>{app.summary}</span><em>새 창에서 열기 ↗</em></a>
   {app.inApp&&<p className="more-inapp">땀방울 원정대 안에서는 <Link to={app.inApp.to}>{app.inApp.label}</Link></p>}</li>)}</ul>
 </section></FlowShell>;
}
