export type TimeLevel='ok'|'warn'|'danger';
/**
 * 남은 시간 색 단계. 기준은 단계 길이에 비례한다(짧은 시범·연습 판이 처음부터 노랑·빨강으로 시작하지 않게).
 * 노랑: 남은 시간이 min(20초, 단계의 30%) 이하. 빨강: min(10초, 단계의 15%) 이하.
 */
export function timeLevel(left:number,total:number):TimeLevel{
 if(!(total>0))return 'ok';
 const danger=Math.min(10,total*0.15),warn=Math.min(20,total*0.3);
 return left<=danger?'danger':left<=warn?'warn':'ok';
}
