import {useState} from 'react';
import {Link} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {readJsonStorage,writeStorage} from '../application/browserStorage';
import {EMPTY_POOL,parsePoolPrep,poolQuestions,splitLines,type PoolPrep} from '../domain/poolPrep';
import './PlayExperiences.css';
import './SportsClassroom.css';
import './PoolPrepPage.css';

const POOL_KEY='physical_pool_prep_v1';

/** 안전 교실 · 수영장 가기 전: 선생님이 안내를 적고 → TV로 함께 확인하고 → 참관 과제를 인쇄한다. */
export function PoolPrepPage(){
 const [prep,setPrep]=useState<PoolPrep>(()=>parsePoolPrep(readJsonStorage(POOL_KEY)));
 const [itemsText,setItemsText]=useState(()=>prep.items.join('\n')),[promiseText,setPromiseText]=useState(()=>prep.promises.join('\n'));
 const [step,setStep]=useState<'edit'|'tv'>('edit'),[card,setCard]=useState(0),[shown,setShown]=useState(false);
 const save=(next:PoolPrep)=>{setPrep(next);writeStorage(POOL_KEY,JSON.stringify(next));};
 const field=(k:'date'|'place'|'travel')=>(e:React.ChangeEvent<HTMLInputElement>)=>save({...prep,[k]:e.target.value.slice(0,80)});
 const qs=poolQuestions(prep),now=qs[Math.min(card,qs.length-1)];
 const print=()=>{document.body.classList.add('pool-printing');const off=()=>{document.body.classList.remove('pool-printing');window.removeEventListener('afterprint',off);};window.addEventListener('afterprint',off);window.print();window.setTimeout(off,1500);};
 return <FlowShell utilities back="/safety" backLabel="안전 교실"><section className="play-experiences sports-lesson pool-prep" aria-label="수영장 가기 전" data-pool-step={step}>
  <p className="eyebrow">안전 교실 · 생존수영</p><h1>🏊 수영장 가기 전</h1>
  <p>학교와 수영장의 안내를 확인한 뒤 아래에 적어요. 적은 내용으로 TV 확인 질문과 참관 과제가 만들어져요. 이 기기에만 저장돼요.</p>
  <div className="sports-stages" role="group" aria-label="단계"><button aria-current={step==='edit'?'step':undefined} onClick={()=>setStep('edit')}>1. 안내 적기</button><button aria-current={step==='tv'?'step':undefined} onClick={()=>{setStep('tv');setCard(0);setShown(false);}} data-pool-tv>2. TV로 함께 확인</button><button onClick={print} data-pool-print>3. 참관 과제 인쇄</button></div>
  {step==='edit'?<section className="recipe-card pool-form">
   <label>날짜·시간<input value={prep.date} onChange={field('date')} placeholder="예: 6월 10일(화) 3~4교시" data-pool-date/></label>
   <label>장소<input value={prep.place} onChange={field('place')} placeholder="예: ○○ 수영장" data-pool-place/></label>
   <label>이동<input value={prep.travel} onChange={field('travel')} placeholder="예: 버스로 이동, 안전띠 매기, 자리에 앉아 있기" data-pool-travel/></label>
   <label>준비물 <small>(한 줄에 하나)</small><textarea rows={5} value={itemsText} onChange={e=>{setItemsText(e.target.value);save({...prep,items:splitLines(e.target.value)});}} data-pool-items/></label>
   <label>우리 학교·수영장 약속 <small>(한 줄에 하나, 최대 10개)</small><textarea rows={4} value={promiseText} onChange={e=>{setPromiseText(e.target.value);save({...prep,promises:splitLines(e.target.value)});}} placeholder={'예: 안전요원 선생님의 호루라기에 바로 멈춰요\n예: 수영장 가장자리에서 뛰지 않아요'} data-pool-promises/></label>
   <div className="flagship-row"><button type="button" className="primary" onClick={()=>{setStep('tv');setCard(0);setShown(false);}}>TV로 함께 확인 →</button><button type="button" onClick={()=>{save(EMPTY_POOL);setItemsText(EMPTY_POOL.items.join('\n'));setPromiseText('');}} data-pool-clear>새로 적기</button></div>
   <p className="sports-muted">적은 안내는 학교와 시설의 안내를 확인한 뒤 써 주세요. 학생 이름은 적지 않아요.</p>
  </section>
  :<section className="recipe-card pool-tv" aria-live="polite" data-pool-card={card+1}>
   <p className="pool-count">{card+1} / {qs.length}</p>
   <h2 className="pool-q">{now.q}</h2>
   {shown?<p className="pool-a" data-pool-answer>{now.a}</p>:<button type="button" className="primary" onClick={()=>setShown(true)} data-pool-show>정답 보기</button>}
   <div className="flagship-row"><button type="button" disabled={card===0} onClick={()=>{setCard(card-1);setShown(false);}}>← 이전</button><button type="button" className="primary" disabled={card>=qs.length-1} onClick={()=>{setCard(card+1);setShown(false);}} data-pool-next>다음 →</button></div>
   <p className="sports-muted">손을 들어 말해 보고 정답을 확인해요. 물 밖에서 돕는 방법은 <Link to="/play/water-rescue-throw">🛟 물 밖에서 돕기</Link>로 몸으로 연습해요.</p>
  </section>}
  <section className="pool-print" aria-hidden="true">
   <h2>🏊 수영장 가기 전 · 참관 과제</h2>
   <p>{[prep.date,prep.place].filter(Boolean).join(' · ')||'날짜·장소: ____________'}</p>
   {prep.travel&&<p>이동: {prep.travel}</p>}
   <h3>준비물 확인</h3><ul>{prep.items.map(x=><li key={x}>☐ {x}</li>)}</ul>
   {prep.promises.length>0&&<><h3>우리가 지킬 약속</h3><ol>{prep.promises.map(x=><li key={x}>{x}</li>)}</ol></>}
   <h3>참관하며 적어요</h3>
   <p>1. 오늘 확인한 약속 한 가지</p><div className="pool-line"/>
   <p>2. 친구가 잘 지킨 안전 행동</p><div className="pool-line"/>
   <p>3. 다음에 선생님께 물어볼 질문</p><div className="pool-line"/>
   <p>___학년 ___반 ___번</p>
  </section>
 </section></FlowShell>;
}
