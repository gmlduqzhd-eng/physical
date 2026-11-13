// Actual local Supabase Auth + PostgREST + Realtime. Never reads app .env files.
// Run only in the disposable native stack documented in SERVER_HARDENING_RUNBOOK.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import WebSocket from 'ws';

const configPath=process.argv[2];
if(!configPath?.endsWith('.local')) throw new Error('Explicit private .local test config required');
let config,api,database;
try{config=JSON.parse(fs.readFileSync(configPath,'utf8'));api=new URL(config.apiUrl);database=new URL(config.dbUrl);}
catch{throw Error('Invalid private fixture configuration; details withheld');}
if(api.hostname!=='127.0.0.1' || api.protocol!=='http:' || api.port!=='54331' || !['postgres:','postgresql:'].includes(database.protocol) || database.hostname!=='127.0.0.1' || database.port!=='54332'
  || config.environmentMarker!=='physical-hardening-native-20261113' || config.runtime!=='native') {
  throw new Error('Only the dedicated loopback native test stack is allowed');
}
const db=new pg.Client({connectionString:config.dbUrl,ssl:false});
const opts={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},realtime:{timeout:30000,transport:WebSocket}};
const actors={},results=[],channels=[],run=randomUUID();
const actorIds=[],roomIds=[];
let bootstrapHash,ownedBootstrap=false,connected=false,phase='connect',failed=false;
function check(ok,label){if(!ok) {const e=new Error(label);e.testLabel=label;throw e;} results.push({check:label,status:'PASS'});}
async function ok(request,label){const r=await request;check(!r.error,label);return r.data;}
async function denied(request,label){const r=await request;check(r.error?.code==='42501'||r.error?.code==='PGRST301',label);}
async function hidden(actor,table,id,label){const r=await actor.client.from(table).select('id').eq('id',id);check(!r.error&&r.data.length===0,label);}
async function visible(actor,table,id,label){const r=await actor.client.from(table).select('id').eq('id',id);check(!r.error&&r.data.length===1,label);}
async function waitFor(fn,label,ms=12000){const end=Date.now()+ms;while(Date.now()<end){if(fn()){check(true,label);return;}await new Promise(r=>setTimeout(r,100));}check(false,label);}
async function actor(name){
 // Separate users represent separate browser profiles. A shared Auth storageKey
 // would incorrectly share the SDK's process-wide session lock in Node.
 const client=createClient(config.apiUrl,config.anonKey,{...opts,auth:{...opts.auth,storageKey:`physical-test-${run}-${name}`}});
 const {data,error}=await client.auth.signInAnonymously();
 check(!error&&!!data.session&&!!data.user?.id,`${name}: Auth issues a real anonymous session`);
 actorIds.push(data.user.id);
 const verified=await client.auth.getUser(data.session.access_token);
 check(!verified.error&&verified.data.user.id===data.user.id,`${name}: Auth verifies issued JWT`);
 const claims=JSON.parse(Buffer.from(data.session.access_token.split('.')[1],'base64url').toString('utf8'));
 check(claims.role==='authenticated',`${name}: classroom role is authenticated`);
 await client.realtime.setAuth(data.session.access_token);
 actors[name]={client,id:data.user.id,token:data.session.access_token,events:[],systems:[]};
 return actors[name];
}
async function watch(name){
 const a=actors[name];
 const channel=a.client.channel(`physical-${run}-${name}`).on('postgres_changes',
  {event:'UPDATE',schema:'public',table:'room_groups'},payload=>a.events.push(payload.new))
  .on('system',{},payload=>a.systems.push({status:payload.status,message:payload.message}));
 channels.push({client:a.client,channel});
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Object.assign(new Error(),{testLabel:`${name}: Realtime subscription timeout`})),45000);
  channel.subscribe((status,error)=>{if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();}
   else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){clearTimeout(timer);reject(Object.assign(new Error(),{testLabel:`${name}: Realtime subscription failed`,testDetail:String(error?.message||status).replace(/eyJ[\w.-]+/g,'[redacted]').replace(/(apikey|token|secret|password)=[^ &]+/gi,'$1=[redacted]')}));}});
 });
 check(true,`${name}: Realtime subscription acknowledged`);
 await waitFor(()=>a.systems.some(s=>s.status==='ok'&&s.message==='Subscribed to PostgreSQL'),`${name}: PostgreSQL change stream ready`,15000);
}
const sql=s=>db.query(s);
try{
 await db.connect();connected=true;
 const marker=await db.query("SELECT obj_description(oid,'pg_namespace') AS marker FROM pg_namespace WHERE nspname='physical_api_test_environment'");
 check(marker.rows[0]?.marker===config.environmentMarker,'dedicated test database marker verified');
 const baseline=await sql('SELECT (SELECT count(*) FROM public.game_rooms)::int AS rooms,(SELECT count(*) FROM auth.users)::int AS users,(SELECT count(*) FROM physical_internal.classroom_bootstrap)::int AS bootstrap');
 check(baseline.rows[0].rooms===0&&baseline.rows[0].users===0&&baseline.rows[0].bootstrap===0,'only pristine disposable test data is used');
 phase='auth';
 const anon=createClient(config.apiUrl,config.anonKey,opts);
 await denied(anon.from('game_rooms').select('id'),'anon direct room REST rejected');
 for(const name of ['teacherA','teacherB','studentPin','studentQr','duplicate','outsider','tv']) await actor(name);
 const {teacherA:A,teacherB:B,studentPin:S,studentQr:Q,duplicate:D,outsider:O,tv:T}=actors;
 await denied(O.client.rpc('create_secure_classroom',{room_name:'unauthorized',template_uuid:null,group_names:['1']}),'authenticated role alone cannot create classrooms');
 const broken=S.token.split('.');broken[2]=(broken[2][0]==='a'?'b':'a')+broken[2].slice(1);
 const tampered=await fetch(`${config.apiUrl}/rest/v1/game_rooms?select=id`,{headers:{apikey:config.anonKey,Authorization:`Bearer ${broken.join('.')}`}});
 check(tampered.status===401,'REST rejects a tampered JWT');
 const bootstrap=randomBytes(32).toString('base64url');bootstrapHash=createHash('sha256').update(bootstrap).digest('hex');
 await db.query('INSERT INTO physical_internal.classroom_bootstrap(id,secret_hash) VALUES(true,$1)',[bootstrapHash]);ownedBootstrap=true;
 check(await ok(A.client.rpc('authorize_classroom_teacher',{bootstrap}),'teacher A bootstrap RPC')===true,'teacher A authorized');
 check(await ok(B.client.rpc('authorize_classroom_teacher',{bootstrap}),'teacher B bootstrap RPC')===true,'teacher B authorized');
 phase='classrooms';
 const template=await ok(A.client.from('mission_templates').insert({name:`API ${run}`,buttons:[]}).select('id').single(),'owned template REST insert');
 await ok(A.client.from('mission_templates').update({name:`API updated ${run}`}).eq('id',template.id),'owned template REST update');
 async function room(owner,label,count=2){const r=await ok(owner.client.rpc('create_secure_classroom',{room_name:`API ${label} ${run}`,template_uuid:owner===A?template.id:null,group_names:Array.from({length:count},(_,i)=>`${i+1}모둠`)}),`${label}: room creation RPC`);roomIds.push(r.id);await ok(owner.client.rpc('classroom_operations',{room_uuid:r.id,operation:'score-policy',review_scores:false,max_points:10000}),'explicit legacy scoring fixture');await ok(owner.client.from('game_rooms').update({status:'playing'}).eq('id',r.id),'start scoring fixture');return r;}
 const ra=await room(A,'A'), rb=await room(B,'B'), rr=await room(A,'recovery',1);
 const ga=await ok(A.client.from('room_groups').select('id,group_name,score').eq('room_id',ra.id).order('group_name'),'owner groups REST');
 const gb=await ok(B.client.from('room_groups').select('id').eq('room_id',rb.id).limit(1).single(),'other owner group REST');
 const invites=await ok(A.client.rpc('get_classroom_invites',{room_uuid:ra.id}),'owner invite RPC');
 const ia=invites.find(i=>i.group_name===ga[0].group_name), iq=invites.find(i=>i.group_name===ga[1].group_name);
 const joinPin=()=>S.client.rpc('join_classroom_short_pin_profile',{entry_pin:ia.short_pin,student_number:1,nickname:'합성하나'});
 check((await ok(joinPin(),'PIN profile entry RPC')).group_id===ga[0].id,'PIN entry assigns correct group');
 check((await ok(Q.client.rpc('join_classroom_invite_profile',{room_uuid:ra.id,group_name:iq.group_name,invite_code:iq.code,student_number:2,nickname:'합성둘둘'}),'QR profile entry RPC')).group_id===ga[1].id,'QR entry assigns correct group');
 check((await ok(D.client.rpc('join_classroom_short_pin_profile',{entry_pin:ia.short_pin,student_number:1,nickname:'중복번호'}),'duplicate number response')).error==='number_taken','duplicate student number rejected');
 await ok(joinPin(),'same JWT reconnect profile RPC');
 const roster=await ok(A.client.rpc('get_classroom_roster',{room_uuid:ra.id}),'owner roster RPC');
 check(roster.length===2&&roster.every(r=>r.nickname),'roster counts unique participants after reconnect');
 for(const [name,a] of [['student',S],['TV before entry',T],['outsider',O],['other owner',B]]) await denied(a.client.rpc('get_classroom_roster',{room_uuid:ra.id}),`${name}: teacher-only roster denied`);
 const codes=await ok(A.client.rpc('get_classroom_device_codes',{room_uuid:ra.id}),'device code RPC');
 check(await ok(T.client.rpc('join_classroom_board',{room_uuid:ra.id,board_code:codes.board_code}),'TV entry RPC')===true,'TV joined read-only');
 await denied(T.client.rpc('get_classroom_roster',{room_uuid:ra.id}),'joined TV cannot read teacher-only roster');
 await visible(S,'game_rooms',ra.id,'student reads joined classroom');await visible(T,'game_rooms',ra.id,'TV reads permitted classroom');
 await hidden(S,'game_rooms',rb.id,'student cannot read other room');await hidden(B,'game_rooms',ra.id,'other teacher cannot read room');await hidden(O,'game_rooms',ra.id,'outsider cannot read room');
 for(const [name,a] of [['student',S],['TV',T]]) await denied(a.client.from('room_groups').update({score:999999}).eq('id',ga[0].id),`${name}: direct score REST update rejected`);
 await denied(S.client.from('room_groups').update({help_requested_at:new Date().toISOString()}).eq('id',ga[0].id),'RPC-only help timestamp direct update rejected');
 await ok(S.client.from('room_groups').update({avatar:'Smile'}).eq('id',ga[0].id),'student allowed group column REST update');
 const cross=await ok(S.client.from('room_groups').update({avatar:'Cross'}).eq('id',ga[1].id).select('id'),'cross-group REST update response');check(cross.length===0,'student cannot update other group');
 const crossRoom=await ok(B.client.from('game_rooms').update({announcement:'forged'}).eq('id',ra.id).select('id'),'cross-owner room update response');check(crossRoom.length===0,'other teacher cannot update room');
 phase='boss';
 await ok(A.client.from('game_rooms').update({status:'boss_raid',boss_hp:100,boss_max_hp:100}).eq('id',ra.id),'owner prepares boss via REST');
 const action=`api-${run}`;
 const [h1,h2]=await Promise.all([1,2].map(()=>ok(S.client.rpc('apply_classroom_boss_damage',{room_uuid:ra.id,amount:10,action_id:action}),'concurrent identical boss damage RPC')));
 check(h1===90&&h2===90,'concurrent duplicate boss request applies damage once');
 const mismatch=await S.client.rpc('apply_classroom_boss_damage',{room_uuid:ra.id,amount:11,action_id:action});check(mismatch.error?.code==='22023','changed duplicate payload rejected');
 const kill=`kill-${run}`;
 await Promise.all([1,2].map(()=>ok(S.client.rpc('apply_classroom_boss_damage',{room_uuid:ra.id,amount:90,action_id:kill}),'concurrent identical winning RPC')));
 const awarded=await ok(A.client.from('room_groups').select('id,score').eq('room_id',ra.id),'boss reward REST read');
 check(awarded.length===2&&awarded.every(g=>g.score===2000),'winning duplicate rewards every group once');
 const ledger=await db.query('SELECT count(*)::int AS n FROM physical_internal.boss_damage_actions WHERE action_id=ANY($1::text[])',[ [action,kill] ]);check(ledger.rows[0].n===2,'one ledger entry per accepted concurrent action');
 await denied(O.client.rpc('apply_classroom_boss_damage',{room_uuid:ra.id,amount:10,action_id:action}),'outsider boss retry denied');
 await denied(B.client.rpc('apply_classroom_boss_damage',{room_uuid:ra.id,amount:10,action_id:action}),'other owner boss retry denied');
 phase='realtime';
 for(const name of ['teacherA','teacherB','studentPin','outsider','tv']) await watch(name);
 const av=`RT-${run}`;await ok(A.client.from('room_groups').update({avatar:av}).eq('id',ga[0].id),'owner emits realtime A update');
 await waitFor(()=>[A,S,T].every(a=>a.events.some(e=>e.id===ga[0].id&&e.avatar===av)),'owner/student/TV receive allowed Realtime event');
 const bv=`RB-${run}`;await ok(B.client.from('room_groups').update({avatar:bv}).eq('id',gb.id),'other owner emits B event');
 await waitFor(()=>B.events.some(e=>e.id===gb.id&&e.avatar===bv),'other owner receives own room event');
 await new Promise(r=>setTimeout(r,3000));
 check(!B.events.some(e=>e.id===ga[0].id),'Realtime filters other owner room server-side');
 check(![A,S,T].some(a=>a.events.some(e=>e.id===gb.id)),'Realtime filters B room for A owner/student/TV');
 check(O.events.length===0,'outsider receives no room-group Realtime records');
 phase='recovery';
 const ri=(await ok(A.client.rpc('get_classroom_invites',{room_uuid:rr.id}),'recovery invites'))[0];
 const rc=await ok(A.client.rpc('get_classroom_device_codes',{room_uuid:rr.id}),'recovery device codes');
 await ok(S.client.rpc('join_classroom_invite_profile',{room_uuid:rr.id,group_name:ri.group_name,invite_code:ri.code,student_number:1,nickname:'복구학생'}),'recovery-room student entry');
 await ok(T.client.rpc('join_classroom_board',{room_uuid:rr.id,board_code:rc.board_code}),'recovery-room TV entry');
 check((await ok(B.client.rpc('recover_secure_classroom',{pin:rr.pin_code,recovery_code:rc.recovery_code}),'teacher B recovery RPC')).teacher_id===B.id,'recovery transfers owner');
 await hidden(A,'game_rooms',rr.id,'recovery revokes previous owner');await hidden(S,'game_rooms',rr.id,'recovery revokes previous student');await hidden(T,'game_rooms',rr.id,'recovery revokes previous TV');
 await visible(B,'game_rooms',rr.id,'recovery grants new owner read');
 const recoveredGroups=await ok(B.client.from('room_groups').select('id').eq('room_id',rr.id).single(),'recovered owner group REST read');
 const recoveredAvatar=`RC-${run}`;
 await ok(B.client.from('room_groups').update({avatar:recoveredAvatar}).eq('id',recoveredGroups.id),'recovered owner emits event');
 await waitFor(()=>B.events.some(e=>e.avatar===recoveredAvatar),'recovered owner receives Realtime event');
 await new Promise(r=>setTimeout(r,3000));
 check(![A,S,T].some(a=>a.events.some(e=>e.avatar===recoveredAvatar)),'recovery revokes existing Realtime subscriptions');
 phase='finish-and-expiry';
 await ok(A.client.from('game_rooms').update({status:'finished'}).eq('id',ra.id),'owner finishes classroom');
 const cleared=await ok(A.client.rpc('get_classroom_roster',{room_uuid:ra.id}),'finished roster read');check(cleared.every(r=>r.student_number===null&&r.nickname===null),'finish clears roster profile fields');
 await visible(S,'game_rooms',ra.id,'student retains unexpired final-result read');await visible(T,'game_rooms',ra.id,'TV retains unexpired final-result read');
 await denied(S.client.rpc('increment_classroom_score',{row_id:ga[0].id,amount:10,action_id:`finished-${run}`}),'finished student score RPC denied');
 await db.query("UPDATE physical_internal.classroom_members SET expires_at=now()-interval '1 second' WHERE room_id=$1 AND user_id=ANY($2::uuid[])",[ra.id,[S.id,Q.id]]);
 await db.query("UPDATE physical_internal.classroom_viewers SET expires_at=now()-interval '1 second' WHERE room_id=$1 AND user_id=$2",[ra.id,T.id]);
 await hidden(S,'game_rooms',ra.id,'expired student loses result read');await hidden(T,'game_rooms',ra.id,'expired TV loses result read');
 const expiredAvatar=`EX-${run}`;await ok(A.client.from('room_groups').update({avatar:expiredAvatar}).eq('id',ga[0].id),'owner emits expiry-stage event');
 await waitFor(()=>A.events.some(e=>e.avatar===expiredAvatar),'owner still receives expiry-stage event');
 await new Promise(r=>setTimeout(r,3000));check(![S,T].some(a=>a.events.some(e=>e.avatar===expiredAvatar)),'existing Realtime subscriptions respect membership expiry');
 await db.query("UPDATE physical_internal.teacher_access SET expires_at=now()-interval '1 second' WHERE user_id=$1",[A.id]);
 await hidden(A,'game_rooms',ra.id,'expired teacher loses owner read');
 await denied(A.client.rpc('get_classroom_roster',{room_uuid:ra.id}),'expired teacher roster denied');
 const teacherExpiredAvatar=`TX-${run}`;
 await db.query('UPDATE public.room_groups SET avatar=$1 WHERE id=$2',[teacherExpiredAvatar,ga[0].id]);
 const controlAvatar=`CTRL-${run}`;
 await ok(B.client.from('room_groups').update({avatar:controlAvatar}).eq('id',gb.id),'active owner emits expiry positive control');
 await waitFor(()=>B.events.some(e=>e.avatar===controlAvatar),'active owner receives expiry positive control');
 await new Promise(r=>setTimeout(r,3000));
 check(!A.events.some(e=>e.avatar===teacherExpiredAvatar),'expired teacher existing Realtime subscription loses row access');
 phase='complete';
}catch(error){failed=true;results.push({check:error.testLabel||`unexpected failure during ${phase}`,status:'FAIL',detail:error.testDetail,code:/^[A-Za-z0-9_]{1,20}$/.test(error.code||'')?error.code:undefined});}
finally{
 for(const {client,channel} of channels){try{await client.removeChannel(channel);}catch{failed=true;}}
 for(const a of Object.values(actors)){try{await a.client.realtime.disconnect();}catch{failed=true;}}
 if(connected){try{
   if(actorIds.length){
    await db.query('DELETE FROM public.game_rooms WHERE teacher_id=ANY($1::uuid[])',[actorIds]);
    await db.query('DELETE FROM public.mission_templates WHERE teacher_id=ANY($1::uuid[])',[actorIds]);
    await db.query('DELETE FROM auth.users WHERE id=ANY($1::uuid[])',[actorIds]);
   }
   if(ownedBootstrap) await db.query('DELETE FROM physical_internal.classroom_bootstrap WHERE secret_hash=$1',[bootstrapHash]);
   const left=await db.query('SELECT (SELECT count(*) FROM public.game_rooms)::int AS rooms,(SELECT count(*) FROM auth.users)::int AS users');
   check(left.rows[0].rooms===0&&left.rows[0].users===0,'all committed API fixtures cleaned up');
  }catch{failed=true;results.push({check:'fixture cleanup requires review',status:'FAIL'});}
  await db.end();}
 const report={date:new Date().toISOString(),environment:'local native Supabase in isolated Linux VM',
  evidence:'real Auth-issued JWT + PostgREST REST/RPC + Realtime postgres_changes',status:failed?'FAIL':'PASS',
  productionConnection:false,fees:0,results,
  realtimeStatus:Object.fromEntries(Object.entries(actors).filter(([,a])=>a.systems.length).map(([name,a])=>[name,a.systems.map(s=>({status:s.status,message:String(s.message).replace(/eyJ[\w.-]+/g,'[redacted]')}))]))};
 fs.writeFileSync(path.join(path.dirname(configPath),'supabase-live-result.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));if(failed)process.exitCode=1;
}
