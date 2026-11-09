import type { IncomingMessage, ServerResponse } from 'node:http';
export default async function handler(req:IncomingMessage,res:ServerResponse){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
 if(req.method!=='GET'){res.statusCode=405;res.end(JSON.stringify({ok:false}));return;}
 const url=process.env.VITE_SUPABASE_URL, key=process.env.VITE_SUPABASE_ANON_KEY;
 try{
  if(!url||!key||new URL(url).protocol!=='https:')throw Error('Missing configuration');
  const result=await fetch(new URL('/rest/v1/rpc/classroom_service_health',url),{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});
  if(!result.ok||(await result.json())!==true)throw Error('Database unavailable');
  res.statusCode=200;res.end(JSON.stringify({ok:true,database:true}));
 }catch{res.statusCode=503;res.end(JSON.stringify({ok:false,database:false}));}
}
