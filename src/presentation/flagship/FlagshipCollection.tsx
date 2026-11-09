import {Link} from 'react-router-dom';
import {FlowShell} from '../FlowShell';
import {FLAGSHIPS} from '../../domain/flagship';
import './flagship.css';
export function FlagshipCollection(){return <FlowShell utilities><section className="flagship-collection"><p className="eyebrow">함께 움직이면, 세계가 달라져요</p><h1>몸으로 연결하는<br/>여섯 가지 원정</h1><p>모둠별 비밀 단서·공동 조종·리듬·기기 안의 손목 인식으로 협력해요. 기존 활동 자료도 계속 사용할 수 있어요.</p><div className="flagship-catalog">{FLAGSHIPS.map((g,i)=><article key={g.id}><span className="flagship-emblem">{g.emoji}</span><small>원정 {String(i+1).padStart(2,'0')}</small><h2>{g.name}</h2><p>{g.desc}</p><p className="muted">{g.device} · 약 {g.minutes}분</p><Link className="primary" to={'/teacher/setup?game='+g.id}>이 원정으로 수업 준비</Link><Link className="secondary" to={'/solo/play/'+g.id}>본 기기에서 연습</Link></article>)}</div><p>카메라·센서는 켜기 전까지 사용하지 않아요. 터치 연습과 짝 확인 결과는 자동 신체 측정과 구분해요.</p><Link to="/hub">기존 활동 자료실 보기 →</Link></section></FlowShell>;}
