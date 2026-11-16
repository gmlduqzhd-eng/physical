import {Link,useParams} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {QuickExperience} from './flagship/QuickExperience';
import {experienceById,PRIMARY_EXPERIENCES} from '../domain/playRecipes';
import './PlayExperiences.css';

export function PlayExperiencePage(){
 const {kind}=useParams(),game=experienceById(kind);
 return <FlowShell utilities><section className="play-experiences"><p className="eyebrow">30초 원리 체험 · 로그인·PIN 없이</p><h1>{game?.name??'함께할 때 달라지는 두 가지 놀이'}</h1><p>짧게 조작해 보고, 실제 수업에서는 친구와 몸으로 신호를 연결해요. 이 화면은 학생 기록·수업 점수에 반영되지 않아요.</p>
  <nav className="experience-tabs" aria-label="원리 체험 선택">{PRIMARY_EXPERIENCES.map(g=><Link key={g.id} to={'/try/'+g.id} aria-current={kind===g.id?'page':undefined}>{g.title}</Link>)}</nav>
  {game?<><QuickExperience key={game.id} kind={game.id}/><section className="experience-next"><h2>친구와 실제로 해볼까요?</h2><p>{game.equipment} · 약 {game.minutes}분. 실제 수업은 교사 인증과 기존 모둠 입장으로 연결합니다.</p><div className="flagship-row"><Link className="primary" to={'/teacher/setup?game='+game.game+'&package=20'}>이 게임으로 수업 준비</Link><Link to={'/solo/play/'+game.game}>전체 규칙을 혼자 연습</Link><Link to="/lessons">완성형 수업 꾸러미 보기</Link></div></section></>:<p>위에서 한 게임을 고르면 바로 체험할 수 있어요.</p>}
 </section></FlowShell>;
}
