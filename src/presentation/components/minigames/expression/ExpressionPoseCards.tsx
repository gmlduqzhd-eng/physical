import type {PoseSetId} from './expressionKidText';

/**
 * 표현 활동 단계별 동작 그림 카드. 막대 사람(앞에서 본 모습)과 위에서 본 대형 그림을 SVG로 그린다.
 * 각도는 팔·다리가 아래로 곧게 내려간 상태를 0도로, 몸 바깥쪽으로 벌어질수록 커진다(180도 = 위로).
 * 음수 각도는 몸 안쪽(가운데)으로 향한다.
 */
type Limb=[number,number];
interface Pose {la:Limb;ra:Limb;ll?:Limb;rl?:Limb;crouch?:number;mark?:'heart'|'heel'|'fling'|'tiptoe'}
type Card={label:string}&({pose:Pose}|{formation:'circle'|'center'|'snake'|'inout'});

const P=(la:Limb,ra:Limb,extra:Partial<Pose>={}):Pose=>({la,ra,...extra});
const BENT:Partial<Pose>={ll:[25,-12],rl:[25,-12],crouch:7};
const POSES:Record<'highV'|'T'|'lowV',Pose>={highV:P([145,145],[145,145]),T:P([90,90],[90,90]),lowV:P([32,32],[32,32])};

const POSE_CARDS:Record<PoseSetId,Card[][]>={
 cheer:[[{label:'하이 V',pose:POSES.highV},{label:'T',pose:POSES.T},{label:'로우 V',pose:POSES.lowV}],[{label:'박수',pose:P([40,-150],[40,-150])}],[{label:'앞줄: 무릎 꿇기',pose:P([30,30],[30,30],{ll:[20,-80],rl:[10,10],crouch:14})},{label:'뒷줄: 하이 V',pose:POSES.highV}]],
 taebo:[[{label:'앞으로 콕',pose:P([30,-160],[90,90])},{label:'반대 손 쭉',pose:P([90,90],[30,-160])}],[{label:'아래서 위로',pose:P([30,-160],[35,178],BENT)}],[{label:'발끝 짚기',pose:P([25,25],[25,25],{rl:[38,38]})}]],
 talchum:[[{label:'무릎 굽혔다 펴기',pose:P([60,85],[60,85],{ll:[28,-15],rl:[28,-15],crouch:9})}],[{label:'팔 뿌리기',pose:P([120,140],[120,140],{mark:'fling'})}],[{label:'까치걸음',pose:P([70,50],[70,50],{rl:[18,-55],mark:'tiptoe'})}]],
 ganggang:[[{label:'큰 원 · 천천히',formation:'circle'}],[{label:'가운데 나와 춤',formation:'center'}],[{label:'구불구불 한 줄',formation:'snake'}]],
 folk:[[{label:'훌라 손짓',pose:P([-70,-95],[70,95],{ll:[12,-6],rl:[12,-6],crouch:3})}],[{label:'안으로 4걸음, 밖으로 4걸음',formation:'inout'}],[{label:'뒤꿈치-발끝',pose:P([40,-120],[40,-120],{rl:[24,24],mark:'heel'})}]],
 kpop:[[{label:'무릎 바운스',pose:P([20,20],[20,20],BENT)}],[{label:'가슴 앞 하트',pose:P([35,-150],[35,-150],{mark:'heart'})}],[{label:'끝 자세',pose:P([40,40],[165,165])}]],
};

const rad=(d:number)=>d*Math.PI/180;
function limb(x:number,y:number,[a,b]:Limb,side:1|-1,l1:number,l2:number){
 const ex=x+side*Math.sin(rad(a))*l1,ey=y+Math.cos(rad(a))*l1,hx=ex+side*Math.sin(rad(b))*l2,hy=ey+Math.cos(rad(b))*l2;
 return `M${x} ${y} L${ex.toFixed(1)} ${ey.toFixed(1)} L${hx.toFixed(1)} ${hy.toFixed(1)}`;
}
function Figure({pose}:{pose:Pose}){
 const c=pose.crouch??0,sh=34+c,hip=68+c;
 return <svg viewBox="0 0 100 124" className="expression-pose-svg" aria-hidden="true">
  <line x1="10" y1="118" x2="90" y2="118" className="expression-pose-floor"/>
  <path d={`M50 ${sh-4} L50 ${hip}`}/>
  <path d={limb(43,sh,pose.la,-1,18,16)}/><path d={limb(57,sh,pose.ra,1,18,16)}/><path d={`M43 ${sh} L57 ${sh}`}/>
  {/* 머리는 팔 위에 그려, 위로 든 팔이 얼굴을 가리지 않게 한다. */}
  <circle cx="50" cy={20+c} r="10" className="expression-pose-head"/>
  <path d={limb(50,hip,pose.ll??[8,8],-1,24,24-c*0.6)}/><path d={limb(50,hip,pose.rl??[8,8],1,24,24-c*0.6)}/>
  {pose.mark==='heart'&&<text x="50" y={sh+6} textAnchor="middle" className="expression-pose-mark">♥</text>}
  {pose.mark==='fling'&&<path d="M18 30 Q10 14 26 6 M82 30 Q90 14 74 6" className="expression-pose-motion"/>}
  {pose.mark==='heel'&&<circle cx="72" cy="114" r="4" className="expression-pose-mark-dot"/>}
  {pose.mark==='tiptoe'&&<text x="50" y="112" textAnchor="middle" className="expression-pose-mark-small">사뿐</text>}
 </svg>;
}
function Formation({kind}:{kind:'circle'|'center'|'snake'|'inout'}){
 const ring=Array.from({length:10},(_,i)=>{const a=i/10*Math.PI*2;return [50+Math.cos(a)*34,56+Math.sin(a)*34] as const;});
 const snake=Array.from({length:10},(_,i)=>[14+i*8,56+Math.sin(i/1.5)*22] as const);
 const dots=kind==='snake'?snake:ring;
 return <svg viewBox="0 0 100 112" className="expression-pose-svg" aria-hidden="true">
  {kind==='snake'&&<path d={'M'+snake.map(([x,y])=>`${x} ${y.toFixed(1)}`).join(' L')} className="expression-pose-path"/>}
  {kind==='circle'&&<path d="M84 40 A34 34 0 0 1 76 82" className="expression-pose-motion" markerEnd="url(#pose-arrow)"/>}
  {kind==='inout'&&ring.filter((_,i)=>i%2===0).map(([x,y],i)=><path key={i} d={`M${x} ${y} L${(50+(x-50)*0.55).toFixed(1)} ${(56+(y-56)*0.55).toFixed(1)}`} className="expression-pose-motion" markerEnd="url(#pose-arrow)"/>)}
  <defs><marker id="pose-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" className="expression-pose-arrowhead"/></marker></defs>
  {dots.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="5" className="expression-pose-person"/>)}
  {kind==='center'&&<circle cx="50" cy="56" r="6" className="expression-pose-person expression-pose-lead"/>}
  {kind==='snake'&&<circle cx={snake[9][0]} cy={snake[9][1]} r="6" className="expression-pose-person expression-pose-lead"/>}
 </svg>;
}
export function ExpressionPoseCards({set,step}:{set:PoseSetId;step:number}){
 const cards=POSE_CARDS[set][Math.min(step,POSE_CARDS[set].length-1)];
 return <ul className="expression-pose-cards" aria-label="동작 그림 카드">{cards.map(card=><li key={card.label}>{'pose' in card?<Figure pose={card.pose}/>:<Formation kind={card.formation}/>}<span>{card.label}</span></li>)}</ul>;
}
/** 플래시몹 합류 순서표: 1명 → 2명 → 4명 → 모두. */
export function JoinOrderChart({step}:{step:number}){
 const stages=[{n:0,label:'평소처럼'},{n:1,label:'1번 시작'},{n:3,label:'2명 합류'},{n:5,label:'2명 더'},{n:8,label:'모두!'}];
 const active=step===0?0:step===1?1:4;
 return <ol className="expression-join-chart" aria-label="합류 순서표">{stages.map((s,i)=><li key={s.label} data-active={i===active||(step>=2&&i>=2)?'yes':'no'}><span aria-hidden="true">{s.n?'🕺'.repeat(Math.min(s.n,4))+(s.n>4?'+':''):'📖'}</span><strong>{s.label}</strong></li>)}</ol>;
}
