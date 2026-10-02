import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
if (process.env.CLASSROOM_LIVE_TEST !== '1') throw new Error('Set CLASSROOM_LIVE_TEST=1 to opt into live classroom fixture tests.');
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(line => line.includes('=')).map(line => { const cut=line.indexOf('='); return [line.slice(0,cut),line.slice(cut+1).replace(/^['"]|['"]$/g,'')]; }));
assert.equal(new URL(env.VITE_SUPABASE_URL).hostname, 'tjrrtgdhtjdkofwqnxnz.supabase.co');
const db=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
const must = result => { if(result.error) throw new Error(result.error.code + ': ' + result.error.message); return result.data; };
let room;
let template;
let foreignRoom;
try {
  template=must(await db.from('mission_templates').insert({name:'Codex classroom regression fixture',buttons:[{id:'review-test',title:'Test mission',amount:25,cooldown:1,requires_approval:true}]}).select('id').single());
  for(let retry=0;retry<20;retry++) {
    const result=await db.from('game_rooms').insert({name:'Codex classroom regression fixture',pin_code:String(Math.floor(1000+Math.random()*9000)),template_id:template.id,status:'playing',started_at:new Date().toISOString()}).select('id').single();
    if(result.error?.code==='23505') continue;
    room=must(result);break;
  }
  assert.ok(room);
  const group=must(await db.from('room_groups').insert({room_id:room.id,group_name:'Test group'}).select('id').single());
  const stable=crypto.randomUUID();
  const duplicate=await Promise.all(Array.from({length:8},()=>db.rpc('increment_classroom_score',{row_id:group.id,amount:10,action_id:stable})));
  duplicate.forEach(must);
  must(await db.from('room_groups').select('score').eq('id',group.id).single());
  assert.equal(must(await db.from('room_groups').select('score').eq('id',group.id).single()).score,10);
  const distinct=await Promise.all(Array.from({length:20},()=>db.rpc('increment_classroom_score',{row_id:group.id,amount:1,action_id:crypto.randomUUID()})));
  distinct.forEach(must);
  assert.equal(must(await db.from('room_groups').select('score').eq('id',group.id).single()).score,30);
  assert.equal((await db.rpc('increment_classroom_score',{row_id:group.id,amount:20,action_id:stable})).error?.code,'22023');
  await Promise.all(Array.from({length:5},async()=>must(await db.rpc('submit_classroom_mission',{row_id:group.id,mission_id:'review-test'}))));
  assert.deepEqual(must(await db.from('room_groups').select('pending_missions').eq('id',group.id).single()).pending_missions,['review-test']);
  const approvals=await Promise.all(Array.from({length:8},()=>db.rpc('review_classroom_mission',{row_id:group.id,mission_id:'review-test',approve:true})));
  approvals.forEach(must);
  assert.equal(approvals.filter(result=>result.data===true).length,1);
  const final=must(await db.from('room_groups').select('score,completed_missions,pending_missions').eq('id',group.id).single());
  assert.equal(final.score,55);assert.deepEqual(final.completed_missions,['review-test']);assert.deepEqual(final.pending_missions,[]);
  must(await db.rpc('increment_classroom_score',{row_id:group.id,amount:500,action_id:crypto.randomUUID()}));
  must(await db.from('game_rooms').update({flash_sale:true,status:'boss_raid',boss_hp:1000,boss_max_hp:1000}).eq('id',room.id));
  const purchases=await Promise.all(Array.from({length:8},()=>db.rpc('purchase_classroom_buff',{row_id:group.id})));
  purchases.forEach(must);assert.equal(purchases.filter(result=>result.data===true).length,1);
  assert.equal(must(await db.from('room_groups').select('score').eq('id',group.id).single()).score,455);
  const damage=await Promise.all(Array.from({length:20},()=>db.rpc('damage_classroom_boss',{room_uuid:room.id,amount:10})));
  damage.forEach(must);assert.equal(must(await db.from('game_rooms').select('boss_hp').eq('id',room.id).single()).boss_hp,800);
  const target=must(await db.from('room_groups').insert({room_id:room.id,group_name:'Attack target',score:999}).select('id').single());
  for(let retry=0;retry<20;retry++) {
    const result=await db.from('game_rooms').insert({name:'Codex cross-room attack regression fixture',pin_code:String(Math.floor(1000+Math.random()*9000))}).select('id').single();
    if(result.error?.code==='23505') continue;
    foreignRoom=must(result);break;
  }
  assert.ok(foreignRoom);
  const foreignTarget=must(await db.from('room_groups').insert({room_id:foreignRoom.id,group_name:'Other classroom'}).select('id').single());
  for(const invalid of [{target_id:target.id,cost:-300},{target_id:group.id,cost:150},{target_id:foreignTarget.id,cost:150},{target_id:target.id,cost:300}]) {
    assert.equal((await db.rpc('attack_group',{attacker_id:group.id,...invalid})).error?.code,'22023');
    assert.equal(must(await db.from('room_groups').select('score').eq('id',group.id).single()).score,455);
  }
  assert.equal((await db.rpc('attack_group',{attacker_id:group.id,target_id:crypto.randomUUID(),cost:150})).error?.code,'23503');
  const attacks=await Promise.all(Array.from({length:8},()=>db.rpc('attack_group',{attacker_id:group.id,target_id:target.id,cost:150})));
  assert.equal(attacks.filter(result=>!result.error).length,1);
  assert(attacks.filter(result=>result.error).every(result=>result.error.code==='22023'));
  assert.equal(must(await db.from('room_groups').select('score').eq('id',group.id).single()).score,305);
  assert.equal(must(await db.from('room_groups').select('is_hacked').eq('id',target.id).single()).is_hacked,true);
  must(await db.from('room_groups').update({score:149}).eq('id',group.id));
  must(await db.from('room_groups').update({is_hacked:false}).eq('id',target.id));
  assert.equal((await db.rpc('attack_group',{attacker_id:group.id,target_id:target.id,cost:150})).error?.code,'22023');
  assert.equal(must(await db.from('room_groups').select('score').eq('id',group.id).single()).score,149);
  must(await db.rpc('reset_group_scores',{room_uuid:room.id}));
  assert.equal(must(await db.from('room_groups').select('score').eq('id',group.id).single()).score,0);
  const damageId=crypto.randomUUID();
  const retriedDamage=await Promise.all(Array.from({length:8},()=>db.rpc('apply_classroom_boss_damage',{room_uuid:room.id,amount:10,action_id:damageId})));
  retriedDamage.forEach(must);
  assert.equal(must(await db.from('game_rooms').select('boss_hp').eq('id',room.id).single()).boss_hp,790);
  assert.equal((await db.rpc('apply_classroom_boss_damage',{room_uuid:room.id,amount:20,action_id:damageId})).error?.code,'22023');
  const lastHits=await Promise.all(Array.from({length:8},()=>db.rpc('apply_classroom_boss_damage',{room_uuid:room.id,amount:200,action_id:crypto.randomUUID()})));
  lastHits.forEach(must);
  const defeated=must(await db.from('game_rooms').select('status,boss_hp,announcement').eq('id',room.id).single());
  assert.equal(defeated.status,'playing');assert.equal(defeated.boss_hp,null);assert(defeated.announcement.includes('2000점'));
  assert(must(await db.from('room_groups').select('score').eq('room_id',room.id)).every(group=>group.score===2000));
  must(await db.rpc('damage_classroom_boss',{room_uuid:room.id,amount:100}));
  assert(must(await db.from('room_groups').select('score').eq('room_id',room.id)).every(group=>group.score===2000));
  console.log(JSON.stringify({passed:true,checks:['8 concurrent retries awarded once','20 concurrent unique actions summed correctly','conflicting id rejected','5 concurrent approval requests stored once','8 teacher approvals awarded once','8 purchases charged flash price once','20 boss damage requests accumulated','negative/wrong-price/self/missing/cross-room attacks rejected without charge','8 concurrent attacks charged once at current sale price','insufficient attack balance never becomes negative','legacy reset succeeds with invoker permissions','8 retries apply boss damage once; conflicting damage id rejected','8 concurrent final hits complete the raid and reward every group exactly once without an admin']},null,2));
} finally {
  if(foreignRoom) must(await db.from('game_rooms').delete().eq('id',foreignRoom.id));
  if(room) must(await db.from('game_rooms').delete().eq('id',room.id));
  if(template) must(await db.from('mission_templates').delete().eq('id',template.id));
  console.log('Only generated verification rows removed.');
}
