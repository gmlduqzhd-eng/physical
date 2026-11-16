import {Link} from 'react-router-dom';
import {layoutFor,type LayoutSpec} from '../../domain/layoutDiagrams';
import {printHref} from '../../domain/printSets';
import './LayoutDiagram.css';

const W=320,H=190;
/** 위에서 본 배치 그림. 표식 자리, 거리, 기기 거치 자리를 한 장에 보여 준다. */
export function LayoutDiagram({activity}:{activity:string}){
 const spec=layoutFor(activity),print=printHref(activity);
 if(!spec&&!print)return null;
 return <figure className="layout-diagram" data-layout={spec?.kind??'print'}>
  {spec&&<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`배치 그림: ${spec.caption}`}><Shapes spec={spec}/></svg>}
  <figcaption>{spec&&<span>{spec.caption}</span>}{print&&<Link to={print} className="layout-print">🖨️ 인쇄용 표식·카드</Link>}</figcaption>
 </figure>;
}
function Marker({x,y,label,square}:{x:number;y:number;label:string;square?:boolean}){
 return <g className="ld-marker">{square?<rect x={x-15} y={y-15} width={30} height={30} rx={5}/>:<circle cx={x} cy={y} r={15}/>}<text x={x} y={y+5} textAnchor="middle">{label}</text></g>;
}
function Device({x=W-28,y=22}:{x?:number;y?:number}){return <g className="ld-device"><rect x={x-11} y={y-15} width={22} height={30} rx={4}/><text x={x} y={y+30} textAnchor="middle">기기</text></g>;}
function Distance({x1,y1,x2,y2,label}:{x1:number;y1:number;x2:number;y2:number;label:string}){return <g className="ld-distance"><line x1={x1} y1={y1} x2={x2} y2={y2}/><text x={(x1+x2)/2} y={(y1+y2)/2-6} textAnchor="middle">{label}</text></g>;}
function Shapes({spec}:{spec:LayoutSpec}){
 const labels=spec.labels;
 switch(spec.kind){
  case 'row':{const n=labels.length,gap=(W-80)/Math.max(1,n-1);return <><Device/>{labels.map((l,i)=><Marker key={i} x={40+i*gap} y={110} label={l}/>)}{n>1&&<Distance x1={40} y1={145} x2={40+gap} y2={145} label={spec.distance??''}/>}<text className="ld-note" x={W/2} y={180} textAnchor="middle">{spec.note??''}</text></>;}
  case 'grid':{const cols=spec.cols??3,rows=Math.ceil(labels.length/cols),gx=60,gy=48,x0=W/2-(cols-1)*gx/2,y0=H/2-(rows-1)*gy/2+6;return <><Device/>{labels.map((l,i)=><Marker key={i} x={x0+(i%cols)*gx} y={y0+Math.floor(i/cols)*gy} label={l} square/>)}<Distance x1={x0} y1={y0+(rows-1)*gy+28} x2={x0+gx} y2={y0+(rows-1)*gy+28} label={spec.distance??''}/></>;}
  case 'cross':return <><Device/>{[[0,-1,'앞'],[-1,0,'왼'],[1,0,'오'],[0,1,'뒤']].map(([dx,dy,l])=><Marker key={String(l)} x={W/2+Number(dx)*44} y={98+Number(dy)*44} label={String(l)} square/>)}<text className="ld-note" x={W/2} y={102} textAnchor="middle">●</text></>;
  case 'star':return <><Device/>{labels.map((l,i)=>{const a=-Math.PI/2+i*2*Math.PI/labels.length;return <Marker key={i} x={W/2+Math.cos(a)*68} y={100+Math.sin(a)*62} label={l}/>;})}<text className="ld-note" x={W/2} y={104} textAnchor="middle">{spec.note??''}</text></>;
  case 'targets':return <><Device/><line className="ld-line" x1={30} y1={160} x2={W-30} y2={160}/><text className="ld-note" x={W/2} y={180} textAnchor="middle">던지는 선 · 앞에 사람 없음</text>{labels.map((l,i)=><Marker key={i} x={W/2+(i-(labels.length-1)/2)*70} y={120-i*30} label={l}/>)}</>;
  case 'wall':return <><rect className="ld-wall" x={20} y={20} width={W-40} height={10}/><text className="ld-note" x={W/2} y={46} textAnchor="middle">벽</text>{labels.map((l,i)=><Marker key={i} x={70+i*90} y={130} label={l}/>)}<Distance x1={W-40} y1={30} x2={W-40} y2={130} label={spec.distance??''}/><Device x={30} y={160}/></>;
  case 'lanes':{const n=labels.length,gap=(W-60)/n;return <><Device/>{labels.map((l,i)=><g key={i}><line className="ld-lane" x1={30+gap*(i+.5)} y1={50} x2={30+gap*(i+.5)} y2={165}/><Marker x={30+gap*(i+.5)} y={165} label="출" square/><Marker x={30+gap*(i+.5)} y={55} label={l}/></g>)}<text className="ld-note" x={16} y={110}>{spec.distance??''}</text></>;}
  case 'pair':return <><Device/><Marker x={70} y={100} label="A"/><Marker x={250} y={100} label="B"/>{labels.map((l,i)=><Marker key={i} x={250} y={40+i*60} label={l} square/>)}<Distance x1={85} y1={150} x2={235} y2={150} label={spec.distance??''}/></>;
  case 'zones':return <><Device/>{labels.map((l,i)=><g key={i}><rect className="ld-zone" x={24+i*150} y={50} width={128} height={100} rx={10}/><text className="ld-zone-label" x={88+i*150} y={104} textAnchor="middle">{l}</text></g>)}</>;
  case 'carry':return <><Device/><Marker x={50} y={110} label="출" square/><Marker x={W-50} y={110} label="도" square/><line className="ld-lane" x1={70} y1={110} x2={W-70} y2={110}/><text className="ld-note" x={W/2} y={96} textAnchor="middle">{labels[0]??''}</text><text className="ld-note" x={W/2} y={140} textAnchor="middle">{spec.distance??''}</text></>;
 }
}
