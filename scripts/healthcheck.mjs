// Read-only checks. No teacher credentials, student records or model calls.
const targets = [
 ['main','https://physical-pi.vercel.app/'],
 ['classroom API','https://physical-pi.vercel.app/api/health'],
 ['teacher studio','https://physical-teacher-studio.vercel.app/'],
 ['teacher API','https://physical-teacher-studio.vercel.app/api/studio?action=health'],
];
const report=await Promise.all(targets.map(async([name,url])=>{
 const started=Date.now();
 try{const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});const type=r.headers.get('content-type')??'';const data=type.includes('json')?await r.json():await r.text();const ok=r.status===200&&(typeof data==='string'?data.includes('<html'):data.ok===true);return {name,ok,status:r.status,ms:Date.now()-started};}
 catch{return {name,ok:false,ms:Date.now()-started};}
}));
console.log(JSON.stringify({checkedAt:new Date().toISOString(),checks:report},null,2));
if(report.some(r=>!r.ok))process.exitCode=1;
