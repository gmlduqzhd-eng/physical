import fs from 'node:fs';import path from 'node:path';import pg from 'pg';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const file=process.argv[2];if(!file?.endsWith('.local'))throw Error('Explicit private .local test config required');
let c,url;try{c=JSON.parse(fs.readFileSync(file,'utf8'));url=new URL(c.dbUrl);}catch{throw Error('Invalid private fixture configuration; details withheld');}
if(c.runtime!=='native'||c.environmentMarker!=='physical-hardening-native-20261113'||!['postgres:','postgresql:'].includes(url.protocol)||url.hostname!=='127.0.0.1'||url.port!=='54332')throw Error('Dedicated loopback fixture only');
const db=new pg.Client({connectionString:c.dbUrl,ssl:false}),migration=fs.readFileSync('supabase/migrations/20261115094331_cooperative_map_and_group_support.sql','utf8');
const rows=[],check=(ok,label)=>{if(!ok)throw Error(label);rows.push({check:label,status:'PASS'});};let connected=false,roomId=null,bootstrapHash=null;const actors=[];
try{
 await db.connect();connected=true;
 const mark=await db.query("SELECT obj_description(oid,'pg_namespace') AS marker FROM pg_namespace WHERE nspname='physical_api_test_environment'");check(mark.rows[0]?.marker===c.environmentMarker,'isolated native marker verified');
 const fixture=fs.readFileSync('supabase/tests/expedition_workshop.sql','utf8').split("SELECT pg_temp.ws_check(NOT has_function_privilege")[0].replace(/^\\ir .*$/gm,'');
 await db.query('BEGIN');
 // Restore the reviewed legacy implementation only inside this native rollback test.
 const legacy=fs.readFileSync('supabase/migrations/20261111042633_expedition_shared_handoff_and_recording_guards.sql','utf8').match(/CREATE OR REPLACE FUNCTION physical_internal\.expedition_action\([\s\S]*?\$\$;/)?.[0];
 if(!legacy)throw Error('Reviewed legacy function definition missing');
 // Exercise an old active run without replaying a historical migration guard.
 await db.query(legacy);
 await db.query(fixture.replace('BEGIN;',''));
 await db.query("SELECT pg_temp.ws_call('owner','expedition-map','start');UPDATE public.game_rooms SET status='playing' WHERE id=current_setting('ws.room')::uuid");
 const metadata="SELECT to_jsonb(p)-'prosrc' AS attributes FROM pg_proc p WHERE oid='physical_internal.expedition_action(uuid,text,text,uuid,jsonb)'::regprocedure";
 const before=(await db.query(metadata)).rows[0].attributes;
 await db.query(fs.readFileSync('supabase/tests/hardening_snapshot.sql','utf8'));
 const snapshot=async()=>{const x=(await db.query('SELECT pg_temp.hardening_snapshot(false) AS s')).rows[0].s;x.functions=x.functions.map(p=>p.proname==='expedition_action'&&p.prosecdef?{...p,prosrc:'reviewed-body'}:p);return JSON.stringify(x);};
 const preserved=await snapshot();await db.query(migration);check(await snapshot()===preserved,'upgrade preserves all existing rows, policies, ACLs, helpers, cron, publication and other functions');check(JSON.stringify((await db.query(metadata)).rows[0].attributes)===JSON.stringify(before),'RPC OID, owner, ACL, language and execution attributes preserved');
 check((await db.query("SELECT (pg_temp.ws_call('a','expedition-map','view','g1')->'mapRules')='null'::jsonb AS ok")).rows[0].ok,'active legacy expedition keeps its original rules after upgrade');
 const once=(await db.query("SELECT pg_get_functiondef('physical_internal.expedition_action(uuid,text,text,uuid,jsonb)'::regprocedure) AS s")).rows[0].s;await db.query(migration);check((await db.query("SELECT pg_get_functiondef('physical_internal.expedition_action(uuid,text,text,uuid,jsonb)'::regprocedure) AS s")).rows[0].s===once,'migration is idempotent');
 await db.query('SAVEPOINT drift');await db.query('ALTER FUNCTION physical_internal.expedition_action(uuid,text,text,uuid,jsonb) SECURITY INVOKER');let denied=false;try{await db.query(migration);}catch(e){denied=e.code==='P0001';}await db.query('ROLLBACK TO SAVEPOINT drift;RELEASE SAVEPOINT drift');check(denied,'unexpected security attributes fail closed');await db.query('ROLLBACK');
 await db.query(migration);
 await db.query(fixture);
 const sql=fs.readFileSync('supabase/tests/cooperative_map.sql','utf8').replace(/^\\ir .*$/gm,'').replace('BEGIN;','');
 const result=await db.query(sql);const summary=Array.isArray(result)?result.flatMap(r=>r.rows??[]):result.rows;
 check(summary.some(r=>Object.values(r).some(v=>v?.status==='PASS')),'distributed clues, agreements, helper signals and legacy rules pass SQL regression');
 const count=summary.flatMap(r=>Object.values(r)).find(v=>v?.status==='PASS')?.checks;rows.push({check:'cooperative SQL assertions',count,status:'PASS'});
 const api=new URL(c.apiUrl);if(api.protocol!=='http:'||api.hostname!=='127.0.0.1'||api.port!=='54331')throw Error('Dedicated loopback REST fixture only');
 const pristine=(await db.query('SELECT (SELECT count(*)=0 FROM auth.users) AND (SELECT count(*)=0 FROM public.game_rooms) AND (SELECT count(*)=0 FROM physical_internal.classroom_bootstrap) AS ok')).rows[0].ok;check(pristine,'REST fixture begins without app/Auth users');
 const ok=async(request,label)=>{const r=await request;check(!r.error,label);return r.data;},deny=async(request,label)=>{const r=await request;check(r.error?.code==='42501',label);};
 for(const label of ['teacher','other','first','last','signal','viewer']){const client=createClient(c.apiUrl,c.anonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});const auth=await client.auth.signInAnonymously({options:{data:{validation_run:'cooperative-native-20261115'}}});if(auth.error||!auth.data.user)throw Error('Synthetic native Auth sign-in failed');const actor={client,id:auth.data.user.id};actors.push(actor);const verified=await client.auth.getUser();check(!verified.error&&verified.data.user.id===actor.id,label+': Auth-issued JWT verified');}
 const [teacher,other,first,last,signal,viewer]=actors;
 const bootstrap=randomBytes(32).toString('base64url');bootstrapHash=createHash('sha256').update(bootstrap).digest('hex');await db.query('INSERT INTO physical_internal.classroom_bootstrap(id,secret_hash) VALUES(true,$1)',[bootstrapHash]);
 await ok(teacher.client.rpc('authorize_classroom_teacher',{bootstrap}),'legacy teacher fixture authorization');await ok(other.client.rpc('authorize_classroom_teacher',{bootstrap}),'other teacher fixture authorization');
 const room=await ok(teacher.client.rpc('create_secure_classroom',{room_name:'Cooperative native fixture',template_uuid:null,group_names:['1모둠','2모둠','3모둠']}),'native room creation');roomId=room.id;
 const teams=await ok(teacher.client.from('room_groups').select('id,group_name').eq('room_id',roomId).order('id'),'native team list');const invites=await ok(teacher.client.rpc('get_classroom_invites',{room_uuid:roomId}),'native team entry codes');
 for(const [i,student] of [first,last,signal].entries()){const invite=invites.find(x=>x.group_name===teams[i].group_name);await ok(student.client.rpc('join_classroom_short_pin_profile',{entry_pin:invite.short_pin,student_number:i+1,nickname:'합성학생'+(i+1)}),'native student PIN/profile entry '+i);}
 const codes=await ok(teacher.client.rpc('get_classroom_device_codes',{room_uuid:roomId}),'native TV entry code');await ok(viewer.client.rpc('join_classroom_board',{room_uuid:roomId,board_code:codes.board_code}),'native TV read-only entry');
 let current=await ok(teacher.client.rpc('expedition_action',{p_room:roomId,p_game:'expedition-map',p_action:'start',p_data:{mapVersion:2,settings:{level:'normal',members:4}}}),'native new-rules start');
 await ok(teacher.client.from('game_rooms').update({status:'playing'}).eq('id',roomId),'native teacher starts room');
 const view=(a,group=null)=>a.client.rpc('expedition_action',{p_room:roomId,p_game:'expedition-map',p_group:group});
 const briefs=await Promise.all([first,last,signal].map((a,i)=>ok(view(a,teams[i].id),'native own brief '+i)));
 check(briefs[0].mapRules.brief.signals===undefined&&briefs[1].mapRules.brief.signals===undefined&&briefs[2].mapRules.brief.signals.length===3,'REST preserves independent carrying information');
 const tv=await ok(view(viewer),'native TV snapshot');check(tv.mapRules.brief===null&&tv.codes===null,'TV receives no map brief or station tokens');
 await deny(view(first,teams[1].id),'REST rejects another-group brief');await deny(view(other),'REST rejects other teacher');
 const action=async(a,kind,index,data={})=>{await new Promise(r=>setTimeout(r,210));return a.client.rpc('expedition_action',{p_room:roomId,p_game:'expedition-map',p_action:kind,p_group:teams[index].id,p_data:{runId:current.runId,requestId:randomUUID(),...data}});};
 await deny(action(viewer,'support',0,{kind:'offering'}),'REST rejects TV support write');
 const supported=await ok(action(first,'support',0,{kind:'need-clue'}),'native own help signal');check(supported.groups.find(g=>g.id===teams[0].id).support==='need-clue'&&!supported.groups.some(g=>g.done),'help does not complete any team');
 const startStation=briefs[0].mapRules.brief.text.match(/\b(forest|river|tower)\b/)[0],endStation=briefs[1].mapRules.brief.text.match(/\b(forest|river|tower)\b/)[0],order=[startStation,['forest','river','tower'].find(s=>s!==startStation&&s!==endStation),endStation],gestures=briefs[2].mapRules.brief.signals;
 for(let phase=0;phase<3;phase++){
  for(const [i,a] of [first,last,signal].entries()){await ok(action(a,'visit',i,{token:current.codes[order[phase]],movementConfirmed:true}),'native station confirmation '+phase+'/'+i);const r=await ok(action(a,'vote',i,{station:order[phase],gesture:phase===0?(gestures[phase]==='open'?'wings':'open'):gestures[phase]}),'native map vote '+phase+'/'+i);if(i===2){if(phase===0)check(r.phase===0,'REST does not accept correct path with wrong agreement');else check(r.phase===phase+1,'REST gate opens through all three teams '+phase);}}
  if(phase===0)for(const [i,a] of [first,last,signal].entries()){const r=await ok(action(a,'vote',i,{station:order[0],gesture:gestures[0]}),'native corrected agreement '+i);if(i===2)check(r.phase===1,'corrected REST agreements open first gate');}
 }
 const ending=await ok(view(first,teams[0].id),'native map ending');check(ending.phase===3&&ending.mapRules.history.length===3,'REST ending contains the three server-opened gates');
 await ok(teacher.client.from('game_rooms').update({status:'paused'}).eq('id',roomId),'native pause');await deny(action(first,'support',0,{kind:'offering'}),'REST rejects paused support');await ok(teacher.client.from('game_rooms').update({status:'finished'}).eq('id',roomId),'native finish');await deny(action(first,'support',0,{kind:'offering'}),'REST rejects finished support');
}catch(e){rows.push({check:'isolated verification',status:'FAIL',code:e.code??'assertion',reason:e.code?'SQL assertion failed; private details withheld':e.message});process.exitCode=1;}
finally{if(connected){await db.query('ROLLBACK').catch(()=>{});if(roomId)await db.query("DELETE FROM public.game_rooms WHERE id=$1 AND name='Cooperative native fixture'",[roomId]);for(const a of actors){await a.client.auth.signOut({scope:'global'}).catch(()=>{});await db.query("DELETE FROM auth.users WHERE id=$1 AND raw_user_meta_data->>'validation_run'='cooperative-native-20261115'",[a.id]);}if(bootstrapHash)await db.query('DELETE FROM physical_internal.classroom_bootstrap WHERE id AND secret_hash=$1',[bootstrapHash]);await db.end();}}
const report={status:process.exitCode?'FAIL':'PASS',environment:'isolated native Supabase',productionMutated:false,results:rows};fs.writeFileSync(path.join(path.dirname(path.resolve(file)),'cooperative-map-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
