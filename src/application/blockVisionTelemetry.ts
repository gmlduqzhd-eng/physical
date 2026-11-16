/**
 * MediaPipe 자세 인식 라이브러리는 1분마다 Google(odml.pa.googleapis.com)로 사용 통계를 보낸다.
 * 영상은 보내지 않지만 학생 기기 정보가 나가므로, 앱 안내("외부로 보내지 않아요")에 맞게 이 주소로 가는 요청만 막는다.
 * 다른 요청은 그대로 통과한다.
 */
const BLOCKED_HOSTS=new Set(['odml.pa.googleapis.com']);
let installed=false;
export function isBlockedTelemetry(input:RequestInfo|URL):boolean{
 try{const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,'http://local.invalid');return BLOCKED_HOSTS.has(url.hostname);}catch{return false;}
}
export function blockVisionTelemetry(){
 if(installed||typeof window==='undefined'||typeof window.fetch!=='function')return;
 installed=true;
 const original=window.fetch.bind(window);
 window.fetch=((input:RequestInfo|URL,init?:RequestInit)=>isBlockedTelemetry(input)?Promise.resolve(new Response(null,{status:204})):original(input,init)) as typeof window.fetch;
}
