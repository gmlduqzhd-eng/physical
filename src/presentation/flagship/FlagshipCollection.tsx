import {Link} from 'react-router-dom';
import {FlowShell} from '../FlowShell';
import {FLAGSHIPS} from '../../domain/flagship';
import {isAvailableGame} from '../../domain/gameLifecycle';
import './flagship.css';
export function FlagshipCollection(){return <FlowShell utilities><section className="flagship-collection"><p className="eyebrow">함께 움직이면, 세계가 달라져요</p><h1>몸으로 연결하는<br/>세 가지 원정</h1><p>모둠별 비밀 힌트와 리듬으로 협력하고, 마지막에 우리 반 보스 원정으로 이어 가요.</p><div className="flagship-catalog">{FLAGSHIPS.filter(g=>isAvailableGame(g.id)).map((g,i)=><article key={g.id}><span className="flagship-emblem">{g.emoji}</span><small>원정 {String(i+1).padStart(2,'0')}</small><h2>{g.name}</h2><p>{g.desc}</p><p className="muted">{g.device} · 약 {g.minutes}분</p><Link className="primary" to={'/teacher/setup?game='+g.id}>이 원정으로 수업 준비</Link><Link className="secondary" to={'/solo/play/'+g.id}>본 기기에서 연습</Link></article>)}</div><p>카메라·센서는 켜기 전까지 사용하지 않아요. 터치 연습과 짝 확인 결과는 자동 신체 측정과 구분해요.</p><p><Link to="/device-check">카메라·기울기 센서가 안 되나요? 기기에서 직접 확인 →</Link></p><Link to="/hub">기존 활동 자료실 보기 →</Link></section></FlowShell>;}
