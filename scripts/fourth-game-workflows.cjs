const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),crypto=require('node:crypto');
function world(){
 const env={now:0,paused:false,hidden:false,online:true,status:'playing',fail:false,requests:0,received:[],timers:new Map(),listeners:new Map(),removed:0};let nextTimer=0,active;
 const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const hooks={
  useState(initial){const a=active,i=a.cursor++;if(!(i in a.states))a.states[i]=typeof initial==='function'?initial():initial;return[a.states[i],n=>{const v=typeof n==='function'?n(a.states[i]):n;if(!Object.is(v,a.states[i])){a.states[i]=v;a.dirty=true;}}];},
  useRef(initial){const a=active,i=a.cursor++;return a.states[i]??(a.states[i]={current:initial});},
  useCallback(fn,deps){return hooks.useMemo(()=>fn,deps);},
  useMemo(fn,deps){const a=active,i=a.cursor++,old=a.memo[i];if(!old||!equal(old.deps,deps))a.memo[i]={deps,value:fn()};return a.memo[i].value;},
  useEffect(fn,deps){const a=active,i=a.cursor++,old=a.effects[i];if(!old||!equal(old.deps,deps))a.queue.push(()=>{old?.cleanup?.();a.effects[i]={deps,cleanup:fn()};});},
 };
 hooks.useLayoutEffect=hooks.useEffect;
 const timer=(fn,ms,repeat)=>{const id=++nextTimer;env.timers.set(id,{fn,ms:Math.max(1,ms),at:env.now+Math.max(1,ms),repeat});return id;};
 const events={addEventListener:(name,fn)=>{const set=env.listeners.get(name)??new Set();set.add(fn);env.listeners.set(name,set);},removeEventListener:(name,fn)=>env.listeners.get(name)?.delete(fn)};
 const win={...events,scrollTo(){},setInterval:(fn,ms)=>timer(fn,ms,true),clearInterval:id=>env.timers.delete(id),setTimeout:(fn,ms)=>timer(fn,ms,false),clearTimeout:id=>env.timers.delete(id),speechSynthesis:{cancel(){}}};
 const pose={value:{x:.5,y:.5,angle:45},status:'tracking',video:{current:null},mode:'auto',stop(){pose.value=null;pose.status='off';},async start(){pose.value={x:.5,y:.5,angle:45};pose.status='tracking';}};
 const audio={speak(){},stop(){},playBeep(){}};
 const client={from(table){assert.equal(table,'game_rooms');const q={select(){return q;},eq(){return q;},abortSignal(){return q;},async maybeSingle(){env.requests++;return env.fail?{data:null,error:{message:'synthetic disconnected'}}:{data:{status:env.status},error:null};}};return q;},channel(){const c={on(){return c;},subscribe(){return c;}};return c;},async removeChannel(){env.removed++;}};
 const cache=new Map();
 function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);
  const context={exports,console,crypto,Date,Math,performance:{now:()=>env.now},navigator:{get onLine(){return env.online;}},document:{...events,get hidden(){return env.hidden;}},window:win,queueMicrotask:fn=>fn(),setInterval:win.setInterval,clearInterval:win.clearInterval,setTimeout:win.setTimeout,clearTimeout:win.clearTimeout,AbortController,structuredClone,
   require(name){if(name==='react')return hooks;if(name==='react/jsx-runtime')return {jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key}),Fragment:'fragment'};
    if(name==='lucide-react')return new Proxy({},{get:(_,key)=>function Icon(){return key;}});
    if(name==='react-router-dom')return {useNavigate:()=>()=>{},useLocation:()=>({pathname:'/',search:'',hash:''})};
    if(name.endsWith('ActivityPauseContext'))return {useActivityPause:()=>env.paused};
    if(name.endsWith('useLocalPose'))return {useLocalPose:()=>pose};
    if(name.endsWith('useVoiceCoach'))return {useVoiceCoach:()=>audio};
    if(name.endsWith('useAudio'))return {useAudio:()=>audio};
    if(name.endsWith('soundEffects'))return new Proxy({},{get:()=>()=>{}});
    if(name.endsWith('deviceStatusContext'))return {useReportDevice(){}};
    if(name.endsWith('ActivityReviewRecord'))return {ActivityReviewRecord(){return null;}};
    if(name.endsWith('/domain/gamesData'))return {AVAILABLE_GAMES:['heatwave-pm25-shield'].map(type=>({type}))};
    if(name.endsWith('/data/supabase'))return {supabase:client};
    if(name.endsWith('.css'))return {};
    if(name.startsWith('.')){let target=path.resolve(path.dirname(file),name.replace(/\.js$/,''));target=fs.existsSync(target+'.ts')?target+'.ts':fs.existsSync(target+'.tsx')?target+'.tsx':target;return load(target);}
    return require(name);
   }};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context,{filename:file});return exports;
 }
 const actors=[];
 function actor(fn,props={}){const a={states:[],memo:[],effects:[],queue:[],cursor:0,dirty:true,props,root:null,render(){active=a;a.cursor=0;a.queue=[];a.dirty=false;a.root=fn(a.props);for(const effect of a.queue)effect();return a.root;},flush(){let limit=0;while(a.dirty){if(++limit>30)throw Error('render loop');a.render();}return a.root;},dispose(){for(const e of a.effects)e?.cleanup?.();}};actors.push(a);a.flush();return a;}
 function advance(ms){const end=env.now+ms;let limit=0;while(true){let pair=[...env.timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!pair)break;if(++limit>20000)throw Error('timer loop');env.now=pair[1].at;if(pair[1].repeat)pair[1].at+=pair[1].ms;else env.timers.delete(pair[0]);pair[1].fn();for(const a of actors)a.flush();}env.now=end;for(const a of actors)a.flush();}
 const flush=async()=>{for(let i=0;i<8;i++){await Promise.resolve();for(const a of actors)a.flush();}};
 return {env,pose,load,actor,advance,flush,emit(name){for(const fn of env.listeners.get(name)??[])fn();}};
}
function nodes(root){if(root==null||typeof root==='boolean')return [];if(Array.isArray(root))return root.flatMap(nodes);if(typeof root!=='object')return [];return [root,...nodes(root.props?.children)];}
function text(root){if(root==null||typeof root==='boolean')return '';if(Array.isArray(root))return root.map(text).join('');if(typeof root!=='object')return String(root);return text(root.props?.children);}
function view(a,complete=()=>{}){const r=a.flush();return typeof r.props?.children==='function'?r.props.children({onComplete:complete}):r;}
function button(a,name,complete){const list=nodes(view(a,complete)).filter(n=>n.type==='button');const b=list.find(n=>typeof name==='string'?text(n).replace(/\s+/g,' ').trim()===name:name.test(text(n)));assert(b,'button '+name+'; available: '+list.map(text).join(' | '));return b;}
function click(a,name,complete){const b=button(a,name,complete);assert(!b.props.disabled,'disabled '+name);b.props.onClick();a.flush();}
function inputLabel(a,label,checked=true){const l=nodes(view(a)).find(n=>n.type==='label'&&text(n).includes(label));assert(l,'label '+label);const n=nodes(l).find(n=>n.type==='input');assert(n);n.props.onChange({target:{checked}});a.flush();}
function pause(w,a,value){w.env.paused=value;a.dirty=true;a.flush();}

test('stretch clock freezes during classroom pause and one performed pose remains partial',()=>{
 const w=world(),a=w.actor(w.load('src/presentation/components/minigames/StretchTimer.tsx').StretchTimer,{enqueueAction:x=>w.env.received.push(x)});
 click(a,'내 속도로 스트레칭 시작');w.advance(2000);assert(text(view(a)).includes('5초'));pause(w,a,true);w.advance(10000);assert(text(view(a)).includes('5초'));pause(w,a,false);w.advance(1000);assert(text(view(a)).includes('4초'));
 click(a,'안내를 멈추고 수행 확인');inputLabel(a,'편한 범위');click(a,'참여 확인하고 다음 동작');
 for(const last of [false,true]){click(a,'내 속도로 스트레칭 시작');click(a,'안내를 멈추고 수행 확인');click(a,last?'쉬었어요 · 마치기':'쉬었어요 · 다음 동작');}
 assert.equal(w.env.received.length,1);assert.equal(w.env.received[0].payload.details.completion,'partial');
});
test('phone fourth-beat selector is cleared between rounds and requires a valid new choice',()=>{
 const w=world(),play=w.load('src/domain/phonePlayCatalog.ts').PHONE_PLAY_BY_ID.get('phone-play-033');
 const a=w.actor(w.load('src/presentation/components/minigames/common/PhonePlay.tsx').PhonePlay,{play,solo:true,groupId:'test',onExit(){},enqueueAction(){}});
 click(a,'놀이 방법 익히기');let select=nodes(view(a)).find(n=>n.type==='select');select.props.onChange({target:{value:'멈춤'}});a.flush();assert(!button(a,'짧게 연습하기').props.disabled);click(a,'이번 과제 관찰 참여 · 0점 기록');assert(button(a,'짧게 연습하기').props.disabled);assert.equal(nodes(view(a)).find(n=>n.type==='select').props.value,'');
});
test('pending network actions preserve a rhythm take, while real suspension cancels it',async()=>{
 const w=world(),s=w.load('src/application/useExpedition.ts').practiceSnapshot('expedition-loop'),a=w.actor(w.load('src/presentation/flagship/LoopGame.tsx').LoopGame,{snapshot:s,send(){},disabled:false,pending:false});
 click(a,'4박 준비 후 박자 기록');await w.flush();w.advance(3000);click(a,'박자 입력 · 손뼉/동작 후 누르기');a.props.pending=true;a.dirty=true;a.flush();w.advance(4200);assert(!text(view(a)).includes('기록 도중 멈췄어요'));inputLabel(a,'모둠이 몸으로');assert(button(a,'우리 리듬을 도시에 연결').props.disabled);a.props.pending=false;a.dirty=true;a.flush();assert(!button(a,'우리 리듬을 도시에 연결').props.disabled);a.props.disabled=true;a.dirty=true;a.flush();assert(button(a,'우리 리듬을 도시에 연결').props.disabled);
});
test('shadow keeps the recorded path when the same input or a recovery input is selected',()=>{
 const w=world(),a=w.actor(w.load('src/presentation/flagship/ShadowGame.tsx').ShadowGame,{disabled:false,onSolved(){},onMode(){},onReset(){}});
 click(a,'8지점 움직임 기록 시작');for(const key of ['ArrowRight','ArrowDown','ArrowDown','ArrowLeft','ArrowLeft','ArrowUp','ArrowUp','ArrowRight','ArrowRight']){nodes(view(a)).find(n=>n.props?.role==='application').props.onKeyDown({key,preventDefault(){}});a.flush();w.advance(650);}
 click(a,'시범·따라 하기 잠깐 멈추기');const pathBefore=nodes(view(a)).find(n=>n.type==='polyline').props.points;
 const controls=()=>nodes(view(a)).find(n=>n.type?.name==='PoseControls');controls().props.setAssisted(true);a.flush();assert.equal(nodes(view(a)).find(n=>n.type==='polyline').props.points,pathBefore);controls().props.setAssisted(false);a.flush();assert.equal(nodes(view(a)).find(n=>n.type==='polyline').props.points,pathBefore);
});
test('rescue flight stops during suspension and camera updates cannot change an already launched angle',()=>{
 const w=world(),a=w.actor(w.load('src/presentation/flagship/RescueGame.tsx').RescueGame,{disabled:false,onSolved(){},onMode(){},onReset(){}});
 const controls=()=>nodes(view(a)).find(n=>n.type?.name==='PoseControls');controls().props.setAssisted(false);a.flush();click(a,'추진력 충전 시작');w.advance(200);click(a,'지금 발사');w.advance(100);
 const angle=nodes(view(a)).find(n=>n.type==='input'&&n.props.type==='range').props.value;
 w.pose.value={x:.5,y:.5,angle:75};a.dirty=true;a.flush();assert.equal(nodes(view(a)).find(n=>n.type==='input'&&n.props.type==='range').props.value,angle);
 const position=()=>nodes(view(a)).filter(n=>n.type==='circle').map(n=>n.props.cx).join(',');const before=position();a.props.disabled=true;a.dirty=true;a.flush();w.advance(3000);assert.equal(position(),before);a.props.disabled=false;a.dirty=true;a.flush();w.advance(100);assert.notEqual(position(),before);
});
test('curling can replace the second of five attempts without losing the other four',()=>{
 const w=world(),a=w.actor(w.load('src/presentation/components/minigames/RollingCurling.tsx').RollingCurling,{groupId:'test',enqueueAction(){}});for(let i=0;i<5;i++)click(a,/중앙 표적 \(3점\)/);click(a,'2회 · 3점 수정');click(a,/표적 이탈 \(0점\)/);let result;click(a,'컬링 원정 결과 저장하기',(_,d)=>result=d);assert(result);assert.match(result.metrics['표적 점수'],/^12\/15/);assert.match(result.metrics['다섯 번 결과'],/2차 이탈 · 0점/);assert.match(result.metrics['다섯 번 결과'],/5차 중앙 · 3점/);
});
test('retrying emotion role A preserves the already completed role B',()=>{
 const w=world(),a=w.actor(w.load('src/presentation/components/minigames/EmotionThermometer.tsx').EmotionThermometer,{groupId:'test'});
 const perform=(emotion,guess)=>{click(a,new RegExp(emotion));click(a,'감정 설정 완료! 15초 신체 표현 시작');w.advance(15000);click(a,new RegExp(guess));click(a,'서로의 감정온도 비교하기');};
 perform('기쁨','기쁨');click(a,'역할 바꾸어 두 번째 표현하기');perform('긴장','놀람');click(a,'A 역할만 다시 표현하기');perform('차분함','차분함');click(a,'역할 바꾸어 두 번째 표현하기');let result;click(a,'두 역할 비교하고 완료하기',(_,d)=>result=d);assert.match(result.metrics['친구 A 표현'],/차분함/);assert.match(result.metrics['친구 B 표현'],/긴장.*놀람/);
});
test('safety review uses another context and does not add fake learning points or duplicate results',()=>{
 const w=world(),id='heatwave-pm25-shield',spec=w.load('src/domain/safetyLessons.ts').SAFETY_LESSONS[id],a=w.actor(w.load('src/presentation/components/minigames/common/SafetyLesson.tsx').SafetyLesson,{gameId:id,enqueueAction:x=>w.env.received.push(x)});
 click(a,'안전 상황 살펴보기');
 const answer=(index,first=false)=>{if(first)click(a,spec.scenarios[index].choices.find(c=>c.id!=='safe').label);click(a,spec.scenarios[index].choices.find(c=>c.id==='safe').label);inputLabel(a,'안전한 선택의 이유');click(a,'교실 역할 표현으로');inputLabel(a,'안전한 교실 표현');click(a,index===2||text(view(a)).includes('다른 상황에서 이유 확인')?'읽고 설명을 확인했어요 · 학습 정리':'읽고 설명을 확인했어요 · 다음 상황');};
 answer(0,true);answer(1);answer(2);assert.equal(w.env.received.length,0);click(a,'다른 상황으로 이유 한 번 더 확인');assert(text(view(a)).includes('뜨거운 운동장'));answer(0);click(a,'세 상황의 학습 결과 기록하기');assert.equal(w.env.received.length,1);const result=w.env.received[0].payload;assert.equal(w.load('src/domain/gameResultDetails.ts').classroomResultScore(result.amount,result.details),0);assert.equal(result.details.learning.confirmed,3);
});
test('actual classroom status hook handles pause, disconnection, recovery, ended rooms and cleanup',async()=>{
 const w=world(),hook=w.load('src/application/useClassroomActivityStatus.ts').useClassroomActivityStatus,a=w.actor(()=>hook('synthetic-room'));
 assert(a.root.paused);await w.flush();assert(!a.root.paused);w.env.status='paused';w.advance(1500);await w.flush();assert(a.root.paused);w.env.fail=true;w.advance(1500);await w.flush();assert.equal(a.root.status,'unavailable');w.env.fail=false;w.env.status='playing';w.advance(1500);await w.flush();assert(!a.root.paused);w.env.online=false;w.emit('offline');a.flush();assert(a.root.paused);w.env.online=true;w.env.status='finished';w.emit('online');await w.flush();assert.equal(a.root.status,'finished');a.dispose();assert.equal(w.env.removed,1);assert.equal(w.env.timers.size,0);
});

