import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COUNTDOWN_SPOKEN,DEFAULT_SPEECH_PREFS,PRIORITY_HOLD_MS,REPEAT_GAP_MS,countdownSpeech,createAnnouncer,parseSpeechPrefs,speechText,surpriseSpeech,type SpeechPrefs,type SpeechUtteranceLike} from '../src/application/speechAnnouncer';

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
 assert.match(toggle,/이 기기는 음성 안내를 지원하지 않아요/);
 assert.match(toggle,/목소리 확인/);
 assert.match(toggle,/aria-pressed/);
});
