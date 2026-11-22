import {Link} from 'react-router-dom';
import {PRIMARY_EXPERIENCES} from '../../domain/primaryExperiences';
import '../PlayExperiences.css';
export function FeaturedExperiences(){return <section className="featured-experiences" aria-labelledby="featured-play-title"><p className="eyebrow">서로의 신호가 만나면 달라져요</p><h2 id="featured-play-title">먼저, 한 번 연결해 보세요.</h2><div className="experience-cards">{PRIMARY_EXPERIENCES.map((g,i)=><article key={g.id}><span className="experience-number">0{i+1}</span><h3>{g.name}</h3><p>{g.description}</p><small>{g.equipment} · 약 {g.minutes}분</small><Link className="primary" to={'/try/'+g.id}>원리 체험하기 →</Link><Link to={'/teacher/setup?game='+g.game+'&package=20'}>교사 수업으로 열기</Link></article>)}</div></section>;}
