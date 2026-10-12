const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const state=[], refs=[], effects=[], handlers={}, timers=new Map();
let cursor=0,refCursor=0,effectCursor=0,nextTimer=1,reads=0,templateReads=0,roomId='room-a',room={id:'room-a',template_id:'template-a',status:'playing'},template={id:'template-a',name:'original'},groups=[{id:'group-a',score:0}],fail=false;
const hooks={
  useState(initial){const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return [state[i],v=>state[i]=typeof v==='function'?v(state[i]):v];},
  useRef(initial){const i=refCursor++;if(!(i in refs))refs[i]={current:initial};return refs[i];},
  useCallback(fn){return fn;},
  useEffect(fn,deps){const i=effectCursor++,old=effects[i];if(!old||deps.some((v,j)=>v!==old.deps[j])){old?.cleanup?.();effects[i]={deps,cleanup:fn()};}},
};
const channel={on(type,filter,fn){handlers[filter.table]=fn;return this;},subscribe(){return this;}};
const db={channel(){return channel;},removeChannel(){},from(table){const query={select(){return query;},eq(){return query;},order(){return query;},maybeSingle(){return query;},then(resolve){reads++;if(table==='mission_templates')templateReads++;return Promise.resolve({data:table==='game_rooms'?{...room}:table==='room_groups'?groups:{...template},error:fail?new Error('network'):null}).then(resolve);}};return query;}};
const win={setTimeout(fn){const id=nextTimer++;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},setInterval(){return 99;},clearInterval(){},addEventListener(){},removeEventListener(){}};
const exportsHook={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/application/useGameLogic.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsHook,window:win,document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},navigator:{onLine:true},require(name){return name==='react'?hooks:{supabase:db};}});
const render=()=>{cursor=refCursor=effectCursor=0;return exportsHook.useGameLogic(roomId);};
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const flush=async()=>{const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());await settle();};
(async()=>{
  render();await settle();assert.equal(render().template.name,'original');assert.equal(templateReads,1);
  reads=0;groups=[{id:'group-a',score:200}];for(let i=0;i<20;i++)handlers.room_groups({});
  assert.equal(timers.size,1);await flush();assert.equal(reads,2);assert.equal(templateReads,1);assert.equal(render().scores[0].score,200);
  console.log('PASS 20 score events use one refresh and reuse the mission template');
  room={...room,status:'paused'};handlers.game_rooms({eventType:'UPDATE',new:room});assert.equal(render().gameRoom.status,'paused');await flush();
  console.log('PASS pause applies immediately without waiting for batched reads');
  template={...template,name:'edited'};handlers.mission_templates({});await flush();assert.equal(render().template.name,'edited');assert.equal(templateReads,2);
  console.log('PASS template edits invalidate the cache and appear in the UI');
  fail=true;render().refresh();await settle();assert(render().error);fail=false;render().refresh();await settle();assert.equal(render().error,null);
  console.log('PASS temporary request failure can recover through manual refresh');
  handlers.room_groups({});roomId='room-b';room={id:roomId,template_id:'template-b',status:'playing'};template={id:'template-b',name:'different room'};render();await settle();assert.equal(timers.size,0);assert.equal(render().template.name,'different room');
  console.log('PASS room changes cancel queued refreshes and do not reuse another room template');
  effects.forEach(effect=>effect.cleanup?.());
})().catch(e=>{console.error(e);process.exitCode=1;});
