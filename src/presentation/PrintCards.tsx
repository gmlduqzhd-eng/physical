import {Link,useSearchParams} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {PRINT_SET_IDS,printSet} from '../domain/printSets';
import './PrintCards.css';

/** 인쇄용 표식·카드 (A4). */
export function PrintCards(){
 const [params]=useSearchParams(),set=printSet(params.get('set'));
 if(!set)return <FlowShell utilities><section className="print-cards" aria-label="인쇄용 표식"><h1>인쇄용 표식·카드</h1><p>필요한 묶음을 골라 인쇄해요.</p><ul className="print-list">{PRINT_SET_IDS.map(id=><li key={id}><Link to={`/print?set=${id}`}>{printSet(id)!.title}</Link><small className="print-muted" style={{display:'block'}}>{printSet(id)!.note}</small></li>)}</ul></section></FlowShell>;
 return <FlowShell utilities back="/print" backLabel="인쇄물 목록"><section className="print-cards" aria-label={set.title} data-set={set.id}>
  <div className="print-head"><h1>{set.title}</h1><p>{set.note}</p><button className="primary" onClick={()=>window.print()}>인쇄하기</button><p className="print-muted">A4 세로로 인쇄해 점선을 따라 잘라요. 바닥에 둘 때는 테이프로 붙여 미끄러지지 않게 해요.</p></div>
  <div className="print-sheet" data-size={set.size}>{set.cards.map((card,i)=><article key={i} className="print-card" style={card.color?{color:card.color,borderColor:card.color}:undefined}>
   <strong>{card.big}</strong>{card.label&&<span>{card.label}</span>}{card.text&&<p>{card.text}</p>}</article>)}</div>
 </section></FlowShell>;
}
