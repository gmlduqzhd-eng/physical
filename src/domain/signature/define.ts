import {seededRandom} from '../funLoop.js';
import type {SignatureCueContext,SignatureGameDef} from './types.js';

type Optional='scoreLabel'|'teamsDefault'|'teamsMin'|'mergedFrom'|'equipment'|'intensity'|'teachingTips'|'spaces'|'grades'|'players';
/** 기본값을 채워 대표 게임 정의를 만든다. */
export function defineSignatureGame(def:Omit<SignatureGameDef,Optional>&Partial<Pick<SignatureGameDef,Optional>>):SignatureGameDef{
 return {
  scoreLabel:'점수',teamsDefault:2,teamsMin:2,mergedFrom:[],equipment:['교사 화면 1대(TV·전자칠판)','준비물 없음'],intensity:'보통',
  teachingTips:[],spaces:['교실','체육관','다목적실'],grades:['1~2학년','3~4학년군','5~6학년군'],players:{min:4,max:30},
  ...def,
 };
}

/**
 * 목록에서 신호를 고른다. 같은 (seed, phase, index)면 늘 같은 값이고, 바로 앞 신호와 같은 것은 피한다.
 * 목록을 seed로 섞은 '주머니'를 차례로 꺼내는 방식이라 골고루 나온다.
 */
export function pickCue<T>(list:readonly T[],ctx:Pick<SignatureCueContext,'seed'|'phase'|'index'>,salt=0):T{
 if(list.length<=1)return list[0];
 const phaseSalt=ctx.phase==='tutorial'?1:ctx.phase==='play'?2:3;
 const bagOf=(bag:number)=>{
  const rnd=seededRandom(ctx.seed*1009+bag*131+salt*7+phaseSalt);
  const order=list.map((_,k)=>k);
  for(let k=order.length-1;k>0;k--){const j=Math.floor(rnd()*(k+1));[order[k],order[j]]=[order[j],order[k]];}
  return order;
 };
 // 주머니의 첫 신호가 바로 앞 주머니의 마지막 신호와 같으면 첫째·둘째를 바꾼다(앞 주머니부터 차례로 정한다).
 const target=Math.floor(Math.max(0,ctx.index)/list.length);
 let prevLast=-1,order:number[]=[];
 for(let b=0;b<=target;b++){
  order=bagOf(b);
  if(order[0]===prevLast)[order[0],order[1]]=[order[1],order[0]];
  prevLast=order[order.length-1];
 }
 return list[order[Math.max(0,ctx.index)%list.length]];
}
