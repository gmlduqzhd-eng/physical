import {config} from 'dotenv';
import {createClient} from '@supabase/supabase-js';
import {writeFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {newSession} from '../server/teacherSession';
config({path:['.env.local','.env.teacher.local'],quiet:true});
const target=process.argv[2]; if(!/^https:\/\/physical-[a-z0-9]+-gmlduqzhd-engs-projects\.vercel\.app$/.test(target??''))throw Error('Expected exact staged deployment URL');
const run=randomUUID(); const c=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const login=await c.auth.signInAnonymously({options:{data:{physical_test_run:run}}});if(login.error)throw Error('Test auth failed');
await writeFile('.classroom-test.local',JSON.stringify({run,ids:[login.data.user!.id]}));
const cookie='physical_teacher='+newSession();
function call(origin:string,withCookie:boolean){
 const lines=['request = "POST"','header = "Content-Type: application/json"','header = "Origin: '+origin+'"',...(withCookie?['header = "Cookie: '+cookie+'"']:[]),'data = '+JSON.stringify(JSON.stringify({accessToken:login.data.session!.access_token}))];
 return writeFile('.vercel-request.local',lines.join('\n')).then(()=>{
 const r=spawnSync('npx',['vercel','curl',target+'/api/teacher?action=classroom-authorize','--scope','gmlduqzhd-engs-projects','--','--ssl-revoke-best-effort','--silent','--config','.vercel-request.local'],{shell:true,encoding:'utf8'});
 assert.equal(r.status,0);return JSON.parse(r.stdout);
 });
}
try{
 assert.equal((await call(target,false)).authorized,undefined);
 assert.equal((await call('https://invalid.example',true)).authorized,undefined);
 assert.equal((await call(target,true)).authorized,true);
 const room=await c.rpc('create_secure_classroom',{room_name:'배포 인증 검증용',template_uuid:null,group_names:['1모둠']});assert.ok(!room.error&&room.data.id);
 await c.from('game_rooms').delete().eq('id',room.data.id);
 console.log(JSON.stringify({result:'PASS',checks:4,scope:'staged Vercel HTTPS -> signed teacher session -> Supabase JWT validation -> DB teacher authorization -> owner-only create',target}));
}finally{await rm('.vercel-request.local',{force:true});await c.rpc('logout_classroom');await c.auth.signOut({scope:'local'});}
