import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {keyToFunCommand} from '../src/application/funCommandBus';
import {CANCEL_GAP_MS,COUNTDOWN_SPOKEN,DEFAULT_SPEECH_PREFS,PRIORITY_HOLD_MS,VOICE_WAIT_MS,REPEAT_GAP_MS,countdownSpeech,createAnnouncer,parseSpeechPrefs,speechText,surpriseSpeech,type SpeechPrefs,type SpeechUtteranceLike} from '../src/application/speechAnnouncer';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

/** 가짜 speechSynthesis: 읽은 문장과 끊은 횟수를 기록한다. */
function setup(opts:{voices?:{lang:string}[];prefs?:SpeechPrefs}={}){
 let t=10_000;
 const voices=opts.voices??[{lang:'ko-KR'}];
 const log:{spoken:SpeechUtteranceLike[];cancels:number}={spoken:[],cancels:0};
 let speaking:SpeechUtteranceLike|null=null;
 const synth={
  speak(u:SpeechUtteranceLike){log.spoken.push(u);speaking=u;},
  cancel(){log.cancels++;speaking=null;},
  getVoices:()=>voices,
 };
 const a=createAnnouncer({synth,utterance:text=>({text,lang:'',rate:1,volume:1,pitch:1}),now:()=>t,prefs:opts.prefs});
 return {a,log,speaking:()=>speaking,advance:(ms:number)=>{t+=ms;}};
}

test('speechText strips emoji and symbols and reads numbers naturally',()=>{
 assert.equal(speechText('🌟 황금 신호! 점수 ×2'),'황금 신호! 점수 두 배');
 assert.equal(speechText('🙋‍♀️ 손 들기 👍🏽'),'손 들기');
 assert.equal(speechText('🇰🇷 태극기 자세'),'태극기 자세');
 assert.equal(speechText('정답 +1점'),'정답 1점 더');
 assert.equal(speechText('실수 -2'),'실수 2점 빼기');
 assert.equal(speechText('3-2-1 출발'),'3, 2, 1 출발');
 assert.equal(speechText('라운드 2/5'),'라운드 5 중 2');
 assert.equal(speechText('「앉기」 · 서기 → 점프'),'앉기, 서기, 점프');
 assert.equal(speechText('오른손 (천천히)'),'오른손, 천천히');
 assert.equal(speechText('★★★'),'');
 assert.equal(speechText('🎉'),'');
 assert.equal(speechText(undefined),'');
});

test('speechText cuts long text at a sentence end unless asked for long reading',()=>{
 const long=`${'가'.repeat(40)}. ${'나'.repeat(40)}. ${'다'.repeat(40)}.`;
 const cut=speechText(long);
 assert.ok(cut.length<=90);
 assert.ok(cut.endsWith('.'));
 assert.equal(speechText(long,Infinity),long);
});

test('countdown reads 10, 5, 3, 2, 1 only, and surprises have short Korean lines',()=>{
 assert.deepEqual(COUNTDOWN_SPOKEN,[10,5,3,2,1]);
 assert.equal(countdownSpeech(10),'10초 남았어요');
 assert.equal(countdownSpeech(5),'5초');
 assert.equal(countdownSpeech(3),'3');
 assert.equal(countdownSpeech(1),'1');
 for(const s of [9,8,7,6,4,0,11])assert.equal(countdownSpeech(s),null);
 assert.equal(surpriseSpeech('golden'),'황금 신호! 점수 두 배!');
 for(const k of ['golden','reverse','freeze','speed'] as const)assert.ok(speechText(surpriseSpeech(k)).length>0);
});

test('parseSpeechPrefs falls back to defaults on broken storage',()=>{
 assert.deepEqual(parseSpeechPrefs(null),DEFAULT_SPEECH_PREFS);
 assert.deepEqual(parseSpeechPrefs('not json'),DEFAULT_SPEECH_PREFS);
 assert.deepEqual(parseSpeechPrefs('[1]'),DEFAULT_SPEECH_PREFS);
 assert.deepEqual(parseSpeechPrefs('{"on":false,"rate":"slow","volume":"soft"}'),{on:false,rate:'slow',volume:'soft'});
 assert.deepEqual(parseSpeechPrefs('{"on":"yes","rate":"fast","volume":9}'),DEFAULT_SPEECH_PREFS);
});

test('a new cue cancels the previous utterance and reads in Korean with chosen speed and volume',()=>{
 const {a,log,speaking,advance}=setup({prefs:{on:true,rate:'slow',volume:'soft'}});
 assert.equal(a.say('🏃 달리기'),true);
 advance(500);
 assert.equal(a.say('✋ 멈춰!'),true);
 assert.deepEqual(log.spoken.map(u=>u.text),['달리기','멈춰!']);
 assert.equal(log.cancels,2,'each new line cancels whatever was being read');
 assert.equal(speaking()?.text,'멈춰!');
 assert.equal(log.spoken[1].lang,'ko-KR');
 assert.ok(log.spoken[1].rate<1);
 assert.ok(log.spoken[1].volume<1);
 assert.equal(a.last(),'멈춰!');
});

test('pause stops speech and blocks new lines until resumed (test button still works)',()=>{
 const {a,log,speaking,advance}=setup();
 a.say('앉기');
 const before=log.cancels;
 a.setPaused(true);
 assert.equal(log.cancels,before+1);
 assert.equal(speaking(),null);
 advance(3000);
 assert.equal(a.say('서기'),false);
 assert.equal(a.say('10초 남았어요',{priority:true}),false);
 assert.equal(a.say('목소리 확인',{force:true}),true);
 a.setPaused(false);
 advance(3000);
 assert.equal(a.say('서기'),true);
});

test('rate limit: same line is not repeated quickly and cues wait briefly after a priority line',()=>{
 const {a,log,advance}=setup();
 assert.equal(a.say('점프'),true);
 advance(REPEAT_GAP_MS-100);
 assert.equal(a.say('점프'),false);
 advance(200);
 assert.equal(a.say('점프'),true);
 assert.equal(a.say('황금 신호! 점수 두 배!',{priority:true}),true,'priority lines always cut in');
 advance(PRIORITY_HOLD_MS-100);
 assert.equal(a.say('앉기'),false,'a cue right after a countdown/event does not cut it off');
 assert.equal(a.say('3',{priority:true}),true);
 assert.equal(a.say('3',{priority:true}),false,'a re-render does not repeat the same countdown number');
 advance(PRIORITY_HOLD_MS+10);
 assert.equal(a.say('앉기'),true);
 assert.deepEqual(log.spoken.map(u=>u.text),['점프','점프','황금 신호! 점수 두 배!','3','앉기']);
});

test('off, unsupported and no Korean voice stay silent; unknown voice list still tries',()=>{
 const off=setup({prefs:{...DEFAULT_SPEECH_PREFS,on:false}});
 assert.equal(off.a.say('앉기'),false);
 assert.equal(off.log.spoken.length,0);
 const on=setup();on.a.say('앉기');on.a.setPrefs({...DEFAULT_SPEECH_PREFS,on:false});
 assert.equal(on.speaking(),null,'turning off cuts the current line');

 const none=createAnnouncer({synth:null,utterance:null});
 assert.equal(none.status(),'unsupported');
 assert.equal(none.say('앉기'),false);
 none.unlock();none.cancel();

 const en=setup({voices:[{lang:'en-US'}]});
 assert.equal(en.a.status(),'no-korean');
 assert.equal(en.a.say('앉기'),false);
 assert.equal(en.log.spoken.length,0);

 const unknown=setup({voices:[]});
 assert.equal(unknown.a.status(),'unknown');
 assert.equal(unknown.a.say('앉기'),true);

 const ok=setup({voices:[{lang:'en-US'},{lang:'ko_KR'}]});
 assert.equal(ok.a.status(),'ok');
 ok.a.say('앉기');
 assert.equal((ok.log.spoken[0].voice as {lang:string}).lang,'ko_KR');
});

test('unlock speaks one silent line only once',()=>{
 const {a,log}=setup();
 a.unlock();a.unlock();
 assert.equal(log.spoken.length,1);
 assert.equal(log.spoken[0].volume,0);
});

test('an empty voice list turns into no-voices after waiting, and a late list still recovers',()=>{
 const voices:{lang:string}[]=[];
 let t=0;
 const a=createAnnouncer({synth:{speak(){},cancel(){},getVoices:()=>voices},utterance:text=>({text,lang:'',rate:1,volume:1,pitch:1}),now:()=>t});
 assert.equal(a.status(),'unknown');
 t=VOICE_WAIT_MS-1;assert.equal(a.status(),'unknown');
 t=VOICE_WAIT_MS;assert.equal(a.status(),'no-voices');
 assert.equal(a.say('앉기'),false,'no voice at all: stay silent instead of pretending to be on');
 voices.push({lang:'ko-KR'});
 assert.equal(a.status(),'ok','voiceschanged later brings it back');
});

test('a device whose voice list stays empty but can speak is promoted once a line really starts',()=>{
 const spoken:SpeechUtteranceLike[]=[];let t=0;let heard=0;
 const a=createAnnouncer({synth:{speak(u){spoken.push(u);},cancel(){},getVoices:()=>[]},utterance:text=>({text,lang:'',rate:1,volume:1,pitch:1}),now:()=>t,onHeard:()=>{heard++;}});
 t=VOICE_WAIT_MS;
 assert.equal(a.status(),'no-voices');
 assert.equal(a.say('앉기'),false,'ordinary cues stay silent');
 assert.equal(a.say('목소리 확인',{force:true,priority:true}),true,'the voice check button may still try');
 assert.equal(a.status(),'no-voices','not promoted until sound really starts');
 (spoken[0].onstart as ()=>void)();
 assert.equal(a.status(),'ok');assert.equal(heard,1);
 t+=REPEAT_GAP_MS+PRIORITY_HOLD_MS;
 assert.equal(a.say('앉기'),true,'from then on cues are read');
 (spoken[1].onstart as ()=>void)();assert.equal(heard,1,'announced once');
});

test('the first voice check speaks inside the same gesture: it queues behind the silent unlock line instead of waiting',()=>{
 const spoken:SpeechUtteranceLike[]=[];let pending=false;let cancels=0;const timers:(()=>void)[]=[];
 const synth={speak(u:SpeechUtteranceLike){spoken.push(u);pending=true;},cancel(){cancels++;pending=false;},getVoices:()=>[{lang:'ko-KR'}],get pending(){return pending;}};
 const a=createAnnouncer({synth,utterance:text=>({text,lang:'',rate:1,volume:1,pitch:1}),now:()=>0,later:fn=>{timers.push(fn);return timers.length;},clearLater:()=>{}});
 a.unlock();
 assert.equal(a.say('목소리 확인',{force:true,priority:true}),true);
 assert.deepEqual(spoken.map(u=>u.text),[' ','목소리 확인'],'spoken at once, not on a timer');
 assert.equal(timers.length,0);assert.equal(cancels,0,'the silent line is not cut');
});

test('while a line is playing, cancel then wait a moment before the new line (Safari drop)',()=>{
 const spoken:string[]=[];let busy=false;const timers=new Map<number,()=>void>();let next=0;let t=0;
 const flush=()=>{const fns=[...timers.values()];timers.clear();fns.forEach(fn=>fn());};
 const synth={speak(u:SpeechUtteranceLike){spoken.push(u.text);busy=true;},cancel(){busy=false;},getVoices:()=>[{lang:'ko-KR'}],get speaking(){return busy;}};
 const a=createAnnouncer({synth,utterance:text=>({text,lang:'',rate:1,volume:1,pitch:1}),now:()=>t,later:(fn,ms)=>{assert.equal(ms,CANCEL_GAP_MS);timers.set(++next,fn);return next;},clearLater:id=>{timers.delete(id as number);}});
 assert.equal(a.say('앉기'),true);assert.deepEqual(spoken,['앉기'],'idle: speaks at once');
 t+=REPEAT_GAP_MS;busy=true;
 assert.equal(a.say('서기'),true);assert.deepEqual(spoken,['앉기'],'busy: waits for the gap');
 t+=REPEAT_GAP_MS;
 assert.equal(a.say('점프'),true,'a newer line replaces the waiting one');
 assert.deepEqual(spoken,['앉기'],'the replacing line also waits: the cut happened a moment ago');
 assert.equal(timers.size,1,'only the newest line is waiting');
 flush();
 assert.deepEqual(spoken,['앉기','점프']);
 a.say('박수',{priority:true,force:true});a.cancel();flush();
 assert.deepEqual(spoken,['앉기','점프'],'cancel drops a waiting line');
});

test('unlock can be retried until it runs, and is skipped when the device has no voice',()=>{
 const voices:{lang:string}[]=[{lang:'en-US'}];const spoken:SpeechUtteranceLike[]=[];
 const a=createAnnouncer({synth:{speak(u){spoken.push(u);},cancel(){},getVoices:()=>voices},utterance:text=>({text,lang:'',rate:1,volume:1,pitch:1}),now:()=>0});
 a.unlock();assert.equal(a.unlocked(),false,'no Korean voice yet: nothing is spent');
 voices.push({lang:'ko-KR'});
 a.unlock();assert.equal(a.unlocked(),true);assert.equal(spoken.length,1);
 a.unlock();assert.equal(spoken.length,1);
});

test('Space, Enter and arrows on a radio, checkbox or slider keep their own job instead of moving the game',()=>{
 for(const type of ['radio','checkbox','range'])for(const key of [' ','Enter','ArrowRight','ArrowDown'])assert.equal(keyToFunCommand({key,target:{tagName:'INPUT',type}}),null,`${key} on ${type}`);
 assert.deepEqual(keyToFunCommand({key:' ',target:{tagName:'BUTTON'}}),{type:'next'},'Space on a button still means next');
 assert.deepEqual(keyToFunCommand({key:' ',target:{tagName:'DIV'}}),{type:'next'});
});

test('keyboard shortcuts work while a radio or checkbox has focus, but not in text boxes',()=>{
 assert.deepEqual(keyToFunCommand({key:'p',target:{tagName:'INPUT',type:'radio'}}),{type:'pause'});
 assert.deepEqual(keyToFunCommand({key:'1',target:{tagName:'INPUT',type:'checkbox'}}),{type:'score',team:0,delta:1});
 assert.equal(keyToFunCommand({key:'p',target:{tagName:'INPUT',type:'text'}}),null);
 assert.equal(keyToFunCommand({key:'p',target:{tagName:'INPUT'}}),null,'no type means a text box');
 assert.equal(keyToFunCommand({key:'p',target:{tagName:'INPUT',type:'search'}}),null);
 assert.equal(keyToFunCommand({key:'p',target:{tagName:'TEXTAREA'}}),null);
 assert.equal(keyToFunCommand({key:'p',target:{tagName:'DIV',isContentEditable:true}}),null);
});

test('TV screens wire voice: signature arena and class mode share the toggle',()=>{
 const sig=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 assert.match(sig,/useTvVoice\(\{paused:state\.paused\}\)/);
 assert.match(sig,/<TvVoiceToggle voice=\{voice\}/);
 assert.match(sig,/surpriseSpeech\(state\.event\.kind\)/);
 assert.match(sig,/countdownSpeech\(engine\.secondsLeft\)/);
 const cls=read('src/presentation/components/minigames/common/PhonePlayClass.tsx');
 assert.match(cls,/useTvVoice\(\{paused:stopped\}\)/);
 assert.match(cls,/<TvVoiceToggle voice=\{voice\}/);
 assert.doesNotMatch(cls,/new SpeechSynthesisUtterance/,'class mode reuses the shared announcer');
 const toggle=read('src/presentation/components/TvVoiceToggle.tsx');
 assert.match(toggle,/이 기기는 음성 안내가 안 돼요/);
 assert.match(toggle,/Escape/,'the settings panel closes with Esc');
 assert.doesNotMatch(toggle,/>⚙</,'the gear is drawn, not a font glyph');
 assert.match(toggle,/목소리 확인/);
 assert.match(toggle,/aria-pressed/);
});

test('the silent wake-up line alone never promotes a device with no voice list',()=>{
 const spoken:SpeechUtteranceLike[]=[];let t=0;let heard=0;
 const a=createAnnouncer({synth:{speak(u){spoken.push(u);},cancel(){},getVoices:()=>[]},utterance:text=>({text,lang:'',rate:1,volume:1,pitch:1}),now:()=>t,onHeard:()=>{heard++;}});
 t=VOICE_WAIT_MS;
 a.unlock();
 assert.equal(spoken.length,1);assert.equal(spoken[0].volume,0);
 (spoken[0].onstart as ()=>void)();
 assert.equal(a.status(),'no-voices','a silent line starting says nothing about audible speech');
 assert.equal(heard,0);assert.equal(a.unlocked(),true);
 assert.equal(a.say('목소리 확인',{force:true,priority:true}),true);
 (spoken[1].onstart as ()=>void)();
 assert.equal(a.status(),'ok');assert.equal(heard,1);
});
