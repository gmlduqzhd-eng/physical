import type {Pose} from '../../../domain/signature/types';
import {figureJoints,type P} from './stickFigureJoints';

const SH:P=[50,36];
const line=(a:P,b:P,key:string)=><line key={key} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}/>;

/** 막대 사람 자세 그림(시범·신호 옆 그림). 색은 currentColor를 따른다. seated면 앉은 자세로 그린다. */
export function StickFigure({pose,size=160,title,seated=false}:{pose:Pose;size?:number;title?:string;seated?:boolean}){
 const j=figureJoints(pose,seated),neck:P=[j.head[0],j.head[1]+10],sh:P=[j.head[0]+(SH[0]-50),j.head[1]+18];
 return <svg className="fun-figure" data-pose={pose} data-seated={seated||undefined} viewBox="0 0 100 120" width={size} height={size*1.2} role={title?'img':undefined} aria-hidden={title?undefined:true} aria-label={title}>
  <g fill="none" stroke="currentColor" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
   <circle cx={j.head[0]} cy={j.head[1]} r={9} fill="currentColor" stroke="none"/>
   {line(neck,j.hip,'body')}
   {line(sh,j.lElbow,'la1')}{line(j.lElbow,j.lHand,'la2')}
   {line(sh,j.rElbow,'ra1')}{line(j.rElbow,j.rHand,'ra2')}
   {line(j.hip,j.lKnee,'ll1')}{line(j.lKnee,j.lFoot,'ll2')}
   {line(j.hip,j.rKnee,'rl1')}{line(j.rKnee,j.rFoot,'rl2')}
  </g>
  {seated&&<line x1={30} y1={80} x2={68} y2={80} stroke="currentColor" strokeWidth={4} strokeLinecap="round" opacity={0.55}/>}
 </svg>;
}
