// 앱 화면 녹화용 가짜 서버(Supabase REST·RPC·실시간, /api/teacher). 실제 서버에는 요청하지 않는다.
// scripts/classroom-journeys.ts 의 수업방 고정 자료를 4모둠으로 넓힌 것.
import {randomUUID} from 'node:crypto';

const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS'};
const PINS=['2468','1357','8024','5791'];

/** 아무 서버 자료도 없는 화면(홈·오늘 수업·대표 게임)용. 로그인은 안 된 상태. */
export async function installBlank(context){
  await context.route('**/fake-supa.invalid/**',r=>{if(r.request().method()==='OPTIONS')return r.fulfill({json:{},headers:CORS});const u=new URL(r.request().url());if(u.pathname.startsWith('/auth/'))return r.fulfill({status:401,json:{},headers:CORS});return r.fulfill({json:[],headers:CORS});});
  await context.route('**/api/teacher**',r=>r.fulfill({json:{authenticated:false,configured:true}}));
}

/** 수업방 하나(모둠 groups개)의 상태. status: waiting | playing | finished */
export function makeClassroom({status='waiting',groups=4,name='갈림길 보급 작전',gameType='zigzag'}={}){
  const roomId=randomUUID(),teacherId=randomUUID(),templateId=randomUUID(),missionId=randomUUID();
  const now=new Date().toISOString();
  const room={id:roomId,name,teacher_id:teacherId,status,pin_code:'12345678',template_id:templateId,global_time_modifier:2100,setup_minutes:40,goal_percent:75,created_at:now,started_at:status==='playing'?now:null};
  const list=Array.from({length:groups},(_,i)=>({id:randomUUID(),room_id:roomId,group_name:`${i+1}모둠`,score:0,completed_missions:[],pending_missions:[],stats:{}}));
  const template={id:templateId,name,buttons:[{id:missionId,gameType,title:name+' 활동 완료',desc:'게임을 마치고 결과를 확인해요.',requires_approval:false,amount:10,cooldown:0}]};
  return {roomId,teacherId,missionId,templateId,room,groups:list,group:list[0],groupId:list[0].id,template,roster:[],created:false,unhandled:[],actions:new Set()};
}

// auth: 선생님 로그인 상태(/api/teacher). Supabase 세션(학생 익명 세션 포함)은 늘 내준다.
export async function installClassroom(context,st,{auth=true,realtime=true}={}){
  await context.route('**/api/teacher**',r=>r.fulfill({json:new URL(r.request().url()).searchParams.get('action')==='status'?{authenticated:auth,configured:true,aiReady:false,localSetup:false}:{authorized:auth}}));
  await context.route('**/fake-supa.invalid/**',async route=>{
    const req=route.request(),u=new URL(req.url());let body={};try{body=req.postDataJSON()||{}}catch{}
    const reply=(json,status=200)=>route.fulfill({json,status,headers:CORS});
    if(req.method()==='OPTIONS')return reply({});
    const {room,groups,template,roster,teacherId,roomId,missionId}=st;
    if(u.pathname.startsWith('/auth/')){
      const user={id:teacherId,aud:'authenticated',role:'authenticated',email:'',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
      const exp=Math.floor(Date.now()/1000)+86400;const token=['e30',Buffer.from(JSON.stringify({sub:teacherId,exp})).toString('base64url'),'fixture'].join('.');
      return reply(u.pathname.endsWith('/user')?user:{access_token:token,refresh_token:'fixture',token_type:'bearer',expires_in:86400,expires_at:exp,user});
    }
    if(u.pathname.includes('/rpc/')){
      const rpc=u.pathname.split('/').at(-1);
      if(rpc==='create_guided_classroom'){st.created=true;return reply(room);}
      if(rpc==='get_classroom_invites')return reply(groups.map((g,i)=>({group_name:g.group_name,code:'fixture'+i,short_pin:PINS[i%PINS.length]})));
      if(rpc==='get_classroom_device_codes')return reply({board_code:'fixture-board',recovery_code:'fixture-recovery'});
      if(rpc==='get_classroom_roster')return reply(roster);
      if(rpc==='join_classroom_short_pin_profile'||rpc==='join_classroom_invite_profile'){
        const gi=body.entry_pin?PINS.indexOf(body.entry_pin):0;if(gi<0||gi>=groups.length)return reply({error:'invalid_pin'});
        const g=groups[gi];roster.push({group_id:g.id,student_number:body.student_number,nickname:body.nickname});
        return reply({room_id:roomId,group_id:g.id,group_name:g.group_name});
      }
      if(rpc==='get_my_classroom_profile')return reply(roster[0]||null);
      if(rpc==='set_classroom_help')return reply(true);
      if(rpc==='submit_classroom_score'||rpc==='increment_classroom_score'){
        const g=groups.find(x=>x.id===body.group_id)||groups[0];
        if(!st.actions.has(body.action_id)){st.actions.add(body.action_id);g.score+=body.amount||0;}
        return reply(rpc==='submit_classroom_score'?{state:'saved'}:true);
      }
      if(rpc==='classroom_operations')return reply(body.operation==='status'?{reviewScores:false,maxPoints:10000}:true);
      if(rpc==='review_classroom_score'||rpc==='activity_review_records')return reply([]);
      if(rpc==='save_guided_reflection'){groups[0].stats.guided_reflections={[missionId]:body.choice};return reply(true);}
      if(rpc==='submit_classroom_mission'){groups[0].completed_missions=[missionId];return reply(true);}
      if(rpc==='teacher_login_policy'||rpc==='teacher_transition_status'||rpc==='classroom_maintenance_status')return reply({});
      st.unhandled.push(rpc);return reply(false,400);
    }
    const table=u.pathname.split('/').at(-1);
    const idEq=(u.searchParams.get('id')||'').replace(/^eq\./,'');
    if(req.method()==='PATCH'){const target=table==='game_rooms'?room:(groups.find(g=>g.id===idEq)||groups[0]);Object.assign(target,body);return reply([target]);}
    if(table==='game_rooms')return reply(idEq?room:st.created||room.status!=='waiting'?[room]:[]);
    if(table==='room_groups'){if(idEq)return reply(groups.find(g=>g.id===idEq)||groups[0]);return reply([...groups].sort((a,b)=>b.score-a.score));}
    if(table==='mission_templates')return reply(idEq?template:[template]);
    st.unhandled.push(u.pathname);return reply(null,400);
  });
  if(realtime)await context.routeWebSocket(/realtime/,ws=>{ws.onMessage(data=>{try{const m=JSON.parse(String(data));if(Array.isArray(m)){const [jr,ref,topic]=m;ws.send(JSON.stringify([jr,ref,topic,'phx_reply',{status:'ok',response:{postgres_changes:[]}}]));}}catch{}});});
}

/** TV와 휴대폰 리모컨(/fun-remote)을 잇는 가짜 실시간 중계. 같은 broker를 두 컨텍스트에 붙인다. */
export function broker(){
  const subs=[];
  return async context=>context.routeWebSocket(/realtime/,ws=>{
    const me={ws,topics:new Set()};subs.push(me);
    ws.onMessage(d=>{
      if(typeof d!=='string'){ // 이진 broadcast(push) → 이진 broadcast(receive)로 바꿔 다른 구독자에게 보낸다
        const B=Buffer.from(d);if(B[0]!==3)return;
        const [jl,rl,tl,el,ml,enc]=[B[1],B[2],B[3],B[4],B[5],B[6]];let o=7+jl+rl;
        const topic=B.slice(o,o+tl).toString();o+=tl;const ev=B.slice(o,o+el);o+=el;const meta=B.slice(o,o+ml);o+=ml;const pay=B.slice(o);
        const out=Buffer.concat([Buffer.from([4,tl,el,ml,enc]),Buffer.from(topic),ev,meta,pay]);
        for(const s of subs)if(s!==me&&s.topics.has(topic))s.ws.send(out);return;
      }
      let m;try{m=JSON.parse(String(d))}catch{return}
      if(!Array.isArray(m))return;const [jr,ref,topic,ev,pl]=m;
      if(ev==='phx_join'){me.topics.add(topic);ws.send(JSON.stringify([jr,ref,topic,'phx_reply',{status:'ok',response:{postgres_changes:[]}}]));}
      else if(ev==='heartbeat'||ev==='phx_leave'||ev==='access_token')ws.send(JSON.stringify([jr,ref,topic,'phx_reply',{status:'ok',response:{}}]));
      else if(ev==='broadcast'){if(ref)ws.send(JSON.stringify([jr,ref,topic,'phx_reply',{status:'ok',response:{}}]));for(const s of subs)if(s!==me&&s.topics.has(topic))s.ws.send(JSON.stringify([null,null,topic,'broadcast',pl]));}
    });
    ws.onClose(()=>{const i=subs.indexOf(me);if(i>=0)subs.splice(i,1)});
  });
}
