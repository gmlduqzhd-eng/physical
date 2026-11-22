import type { IncomingMessage, ServerResponse } from 'node:http';
export default async function handler(req:IncomingMessage,res:ServerResponse){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
 if(req.method!=='GET'){res.statusCode=405;res.end(JSON.stringify({ok:false}));return;}
 const url=process.env.VITE_SUPABASE_URL, key=process.env.VITE_SUPABASE_ANON_KEY;
 try{
  if(!url||!key||new URL(url).protocol!=='https:')throw Error('Missing configuration');
  const result=await fetch(new URL('/rest/v1/rpc/classroom_service_health',url),{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});
  if(!result.ok||(await result.json())!==true)throw Error('Database unavailable');
  // 정상 응답만 CDN이 15초 동안 대신 답한다(밖에서 반복 호출해도 DB 호출이 그만큼 늘지 않게). 브라우저는 보관하지 않고, 실패(503)는 보관하지 않는다.
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=15');
  res.statusCode=200;res.end(JSON.stringify({ok:true,database:true}));
 }catch{res.statusCode=503;res.end(JSON.stringify({ok:false,database:false}));}
}
