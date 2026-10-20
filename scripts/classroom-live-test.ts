// Synthetic integration fixtures only. No browser tokens or real student records.
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { authorizeClassroomTeacher } from '../server/classroomBridge';
config({path:['.env.local','.env.classroom.local'],quiet:true});
const run = randomUUID(); const ids:string[]=[]; let checks=0;
async function user(teacher=false) {
 const c=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const result=await c.auth.signInAnonymously({options:{data:{physical_test_run:run}}});
 if(result.error) throw new Error('Anonymous test authentication failed: '+result.error.code);
 ids.push(result.data.user!.id);
 await writeFile('.classroom-test.local',JSON.stringify({run,ids}));
 if(teacher) await authorizeClassroomTeacher(result.data.session!.access_token);
 return c;
}
const ok=(value:unknown)=>{assert.ok(value);checks++;};
const a=await user(true), b=await user(true), student=await user(), viewer=await user();
let roomA:string|undefined,roomB:string|undefined;
try {
 const ra=await a.rpc('create_secure_classroom',{room_name:'자동 검증용 방 A',template_uuid:null,group_names:['1모둠','2모둠']});ok(!ra.error);roomA=ra.data.id;
 const rb=await b.rpc('create_secure_classroom',{room_name:'자동 검증용 방 B',template_uuid:null,group_names:['1모둠']});ok(!rb.error);roomB=rb.data.id;
 const groups=(await a.from('room_groups').select('id,group_name').eq('room_id',roomA!)).data!;ok(groups.length===2);
 const invites=await a.rpc('get_classroom_invites',{room_uuid:roomA});ok(!invites.error);
 const invite=invites.data.find((v:{group_name:string})=>v.group_name===groups[0].group_name);
 ok((await student.from('game_rooms').select('id')).data?.length===0);
 ok((await a.from('game_rooms').select('id').eq('id',roomB!)).data?.length===0);
 ok(!!(await student.rpc('authorize_classroom_teacher',{bootstrap:'forged-test'})).error);
 ok(!(await student.rpc('join_secure_classroom',{room_uuid:roomA,group_name:groups[0].group_name,invite_code:'wrong'})).data);
 const joined=await student.rpc('join_secure_classroom',{room_uuid:roomA,group_name:groups[0].group_name,invite_code:invite.code});ok(joined.data===groups[0].id);
 ok((await student.from('room_groups').select('id')).data?.length===2);
 ok(!!(await student.rpc('increment_classroom_score',{row_id:groups[1].id,amount:10,action_id:run+'cross'})).error);
 ok(!!(await student.rpc('reset_group_scores',{room_uuid:roomA})).error);
 ok(!!(await student.from('room_groups').update({score:999}).eq('id',groups[0].id)).error);
 ok(!(await student.rpc('increment_classroom_score',{row_id:groups[0].id,amount:10,action_id:run})).error);
 ok(!(await student.rpc('increment_classroom_score',{row_id:groups[0].id,amount:10,action_id:run})).error);
 ok((await a.from('room_groups').select('score').eq('id',groups[0].id).single()).data?.score===10);
 const codes=(await a.rpc('get_classroom_device_codes',{room_uuid:roomA})).data;ok(!!codes?.board_code);
 ok((await viewer.rpc('join_classroom_board',{room_uuid:roomA,board_code:codes.board_code})).data===true);
 ok((await viewer.from('room_groups').select('id')).data?.length===2);
 ok(!!(await viewer.rpc('increment_classroom_score',{row_id:groups[0].id,amount:10,action_id:run+'viewer'})).error);
 ok(!!(await viewer.rpc('damage_classroom_boss',{room_uuid:roomA,amount:10})).error);
 ok(!(await b.rpc('recover_secure_classroom',{pin:ra.data.pin_code,recovery_code:'wrong'})).data);
 ok((await b.rpc('recover_secure_classroom',{pin:ra.data.pin_code,recovery_code:codes.recovery_code})).data?.id===roomA);
 ok((await a.from('game_rooms').select('id').eq('id',roomA!)).data?.length===0);
 ok((await student.from('game_rooms').select('id')).data?.length===0);
 ok((await viewer.from('game_rooms').select('id')).data?.length===0);
 ok((await viewer.rpc('join_classroom_board',{room_uuid:roomA,board_code:codes.board_code})).data===false);
 console.log(JSON.stringify({result:'PASS',checks,scope:'actual HTTPS anonymous Auth + teacher bridge + PostgREST + RPC + RLS',syntheticFixturesOnly:true}));
} finally {
 if(roomA) {const r=await b.from('game_rooms').delete().eq('id',roomA);if(r.error) await a.from('game_rooms').delete().eq('id',roomA);}
 if(roomB) await b.from('game_rooms').delete().eq('id',roomB);
 for(const c of [a,b,student,viewer]) {await c.rpc('logout_classroom');await c.auth.signOut({scope:'local'});}
}
