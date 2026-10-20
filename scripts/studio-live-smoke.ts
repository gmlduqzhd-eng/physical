// Explicit manual smoke test using synthetic, non-personal lesson conditions.
import {config} from 'dotenv';
import {writeFile} from 'node:fs/promises';
import {generateStudioAdvice} from '../server/geminiStudio';
config({path:'.env.gemini.local',quiet:true});
if(process.argv[3]) process.env.GEMINI_MODEL=process.argv[3];
const task=process.argv[2]??'group';
const base={task,activityId:['alternative','recommend'].includes(task)?null:'space-occupier',grade:'3~4학년군',goal:'협동과 소통',place:'체육관',device:'태블릿 PC',deviceCount:'모둠별 1대',minutes:40,groupSize:6,classSize:24,consent:true,adultTeacher:true,activityMinutes:10,weather:task==='alternative'?'비로 실내 전환':'제약 없음',observations:task==='observation'?['협동이 활발함']:[],aggregate:task==='group'?{groups:'3~5모둠',participants:'모둠당 5~8명',completion:'절반 정도 완료',cooperation:'관찰 부족'}:null};
const original=globalThis.fetch;let metadata:unknown;
globalThis.fetch=async(...args)=>{const r=await original(...args);const data=await r.clone().json().catch(()=>null);await writeFile('.ai-diagnostic.local',JSON.stringify(data));metadata={status:r.status,finishReason:data?.candidates?.[0]?.finishReason,textLength:data?.candidates?.[0]?.content?.parts?.filter((p:{thought?:boolean})=>!p.thought).map((p:{text?:string})=>p.text??'').join('').length,usage:data?.usageMetadata};return r;};
try {const start=Date.now();const result=await generateStudioAdvice(base);await writeFile('../../outputs/Gemini-'+task+'-실제결과.json',JSON.stringify({input:base,...result},null,2));console.log(JSON.stringify({task,ok:true,elapsedSeconds:Math.round((Date.now()-start)/1000),metadata}));}
catch(e){console.log(JSON.stringify({task,ok:false,metadata,errorType:e instanceof Error?e.name:'unknown',safeMessage:e instanceof Error&&/^(검증|원문|필수|잘못된|근거|조건|목록)/.test(e.message)?e.message:undefined,causeType:(e as {cause?:{name?:string}})?.cause?.name,validation:(e as {issues?:{code:string;path:unknown}[]})?.issues?.map(i=>({code:i.code,path:i.path}))}));process.exitCode=1;}
finally {globalThis.fetch=original;}
