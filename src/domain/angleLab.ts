/** 각도 실험: 던지는 각도와 세기에 따라 공이 얼마나 멀리 가는지. 공기 저항이 없고 땅 높이에서 던진다고 가정한다. */
export const GRAVITY=9.8;
export const ANGLE_PRESETS=[15,30,45,60,75] as const;
export const POWERS=[{id:'soft',label:'살살',speed:8},{id:'normal',label:'보통',speed:11},{id:'strong',label:'세게',speed:14}] as const;
export type PowerId=typeof POWERS[number]['id'];
export const FIELD_METERS=22;
export const HIT_TOLERANCE=1;
/** 과녁 거리(m). 모두 어떤 세기로든 닿을 수 있는 거리다. */
export const ANGLE_TARGETS=[5,9,12,16,19] as const;

export const clampAngle=(angle:number)=>Math.max(0,Math.min(90,Math.round(Number.isFinite(angle)?angle:45)));
export const powerSpeed=(id:PowerId)=>POWERS.find(p=>p.id===id)!.speed;
export interface Flight {range:number;peak:number;time:number}
export function flight(angleDeg:number,speed:number):Flight{
 const a=clampAngle(angleDeg)*Math.PI/180,vx=speed*Math.cos(a),vy=speed*Math.sin(a),time=2*vy/GRAVITY;
 const round=(n:number)=>Math.round(n*10)/10;
 return {range:round(Math.max(0,vx*time)),peak:round(vy*vy/(2*GRAVITY)),time:round(time)};
}
/** 날아가는 길 위의 점들(m). 그림을 그릴 때 쓴다. */
export function flightPath(angleDeg:number,speed:number,points=24):[number,number][]{
 const a=clampAngle(angleDeg)*Math.PI/180,vx=speed*Math.cos(a),vy=speed*Math.sin(a),time=2*vy/GRAVITY;
 return Array.from({length:points+1},(_,i)=>{const t=time*i/points;return [vx*t,Math.max(0,vy*t-GRAVITY*t*t/2)] as [number,number];});
}
export const isHit=(range:number,target:number)=>Math.abs(range-target)<=HIT_TOLERANCE;
export function hitFeedback(range:number,target:number){
 if(isHit(range,target))return '과녁에 맞았어요!';
 const gap=Math.round(Math.abs(range-target)*10)/10;
 return range<target?`${gap}m 못 미쳤어요. 각도나 세기를 바꿔 봐요.`:`${gap}m 넘어갔어요. 각도나 세기를 바꿔 봐요.`;
}
export interface Attempt {angle:number;power:PowerId;range:number}
/** 같은 세기로 던진 기록 가운데 가장 멀리 간 각도. 기록이 없으면 null. */
export function bestAngle(attempts:readonly Attempt[],power:PowerId){
 const mine=attempts.filter(a=>a.power===power);
 return mine.length?mine.reduce((best,a)=>a.range>best.range?a:best).angle:null;
}
