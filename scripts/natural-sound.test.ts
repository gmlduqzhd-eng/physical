import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bestKoreanVoice,createAnnouncer,EARCON_LEAD_MS,EARCON_QUIET_MS,REMOTE_VOICE_WAIT_MS,speechText,type SpeechUtteranceLike,type VoiceLike} from '../src/application/speechAnnouncer';
import {createPhrasePicker,nativeCounts,PHRASE_VARIANTS,TONE_PROSODY} from '../src/application/speechText';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('small counts are read with native Korean numbers, labels stay as numbers', () => {
 assert.equal(nativeCounts('3명이 모여요'),'세 명이 모여요');
 assert.equal(nativeCounts('2개를 골라요'),'두 개를 골라요');
 assert.equal(nativeCounts('1바퀴 돌아요'),'한 바퀴 돌아요');
 assert.equal(nativeCounts('2번째 친구'),'두 번째 친구');
 assert.equal(nativeCounts('1번째'),'첫 번째');
 assert.equal(nativeCounts('2번 더 뛰어요'),'두 번 더 뛰어요');
 assert.equal(nativeCounts('3번 뛰어요'),'세 번 뛰어요');
 assert.equal(nativeCounts('5번씩 해요'),'다섯 번씩 해요');
 // 번호로 쓴 '번'은 그대로
 assert.equal(nativeCounts('1번 과제'),'1번 과제');
 assert.equal(nativeCounts('3번 칸으로 가요'),'3번 칸으로 가요');
 // 큰 수·초는 그대로
 assert.equal(nativeCounts('20명'),'20명');
 assert.equal(nativeCounts('10초 남았어요'),'10초 남았어요');
 assert.equal(speechText('▶ 3명이 모여요 ✓'),'세 명이 모여요');
});

test('number labels, decimals, ranges and loanwords are not turned into native counts', () => {
 // a sentence with two or more "N번" uses them as labels (phone-play-008)
 assert.equal(speechText('1번 걷기 · 2번 팔 펴기 · 3번 손 모으기'),'1번 걷기, 2번 팔 펴기, 3번 손 모으기');
 assert.equal(nativeCounts('2번 주자'),'2번 주자');
 assert.equal(nativeCounts('1번 보기'),'1번 보기');
 assert.equal(speechText('1.5바퀴'),'1 점 5바퀴');
 assert.equal(speechText('3~5명'),'3에서 5명');
 assert.equal(nativeCounts('3개월'),'3개월');
 assert.equal(speechText('Max 3회'),'Max 3회');
 assert.equal(speechText('×2 점수'),'두 배 점수');
 assert.equal(nativeCounts('10번'),'10번');
 assert.equal(nativeCounts('20명'),'20명');
 assert.equal(nativeCounts('1번 과제'),'1번 과제');
 assert.equal(nativeCounts('2분 30초'),'2분 30초');
 assert.equal(nativeCounts('3번 하기'),'세 번 하기');
});

test('phrase variants are pure synonyms (no meaning-changing additions)', () => {
 for(const [key,pool] of Object.entries(PHRASE_VARIANTS)){
  assert.equal(pool[0],key);
  for(const v of pool)assert.doesNotMatch(v,/그대로|얼음|여기까지/,`${key}: ${v}`);
 }
 assert.equal(PHRASE_VARIANTS['멈춰요'],undefined,'stop commands are never reworded');
});

test('the best Korean voice is chosen by quality, robotic desktop voices go last', () => {
 const voices:VoiceLike[]=[
  {lang:'en-US',name:'Samantha'},
  {lang:'ko-KR',name:'Microsoft Heami - Korean (Korean)',localService:true,default:true},
  {lang:'ko-KR',name:'Google 한국의',localService:false},
  {lang:'ko-KR',name:'Microsoft SunHi Online (Natural) - Korean (Korea)',localService:false},
 ];
 assert.equal(bestKoreanVoice(voices)?.name,'Microsoft SunHi Online (Natural) - Korean (Korea)');
 assert.equal(bestKoreanVoice(voices.slice(0,3))?.name,'Google 한국의');
 assert.equal(bestKoreanVoice([{lang:'ko-KR',name:'Yuna'},{lang:'ko-KR',name:'Yuna (향상됨)'}])?.name,'Yuna (향상됨)');
 assert.equal(bestKoreanVoice([{lang:'ko_KR',name:'Heami'}])?.name,'Heami', 'falls back to any Korean voice');
 assert.equal(bestKoreanVoice([{lang:'en-US',name:'Alex'}]),null);
});

test('frequent lines rotate between natural variants without repeating, other sentences stay', () => {
 let r=0;const seq=[0,0,0.99,0.5,0];
 const picker=createPhrasePicker(()=>seq[r++%seq.length]);
 const seen=[picker.vary('잘했어요!'),picker.vary('잘했어요!'),picker.vary('잘했어요!')];
 for(const s of seen)assert.ok(PHRASE_VARIANTS['잘했어요'].some(v=>s===`${v}!`),s);
 assert.notEqual(seen[0],seen[1]);assert.notEqual(seen[1],seen[2]);
 assert.equal(picker.vary('청팀 잘했어요!'),'청팀 잘했어요!','partial matches are not changed');
 assert.match(picker.vary('준비. 시작해요!'),/^.+\. .+!$/);
});

function setup(voices:VoiceLike[]=[{lang:'ko-KR',name:'Google 한국의',localService:false}]){
 let t=100_000;
 const spoken:SpeechUtteranceLike[]=[];const speakingLog:boolean[]=[];let earcons=0;const leads:{fn:()=>void;ms:number}[]=[];
 const synth={speak(u:SpeechUtteranceLike){spoken.push(u);},cancel(){},getVoices:()=>voices};
 const a=createAnnouncer({synth,utterance:text=>({text,lang:'',rate:1,volume:1,pitch:1}),now:()=>t,random:()=>0,onSpeaking:s=>speakingLog.push(s),earcon:()=>{earcons++;},later:(fn,ms)=>{leads.push({fn,ms});return leads.length;},clearLater:()=>{}});
 return {a,spoken,speakingLog,earcons:()=>earcons,advance:(ms:number)=>{t+=ms;},flush:()=>{const fns=leads.splice(0);fns.forEach(l=>l.fn());return fns.map(l=>l.ms);}};
}

test('tone changes rate and pitch; the chosen voice is used and reported', () => {
 const {a,spoken,advance,flush}=setup();
 a.say('차분하게 숨 쉬어요',{tone:'calm'});flush();advance(3000);
 a.say('마지막 승부!',{tone:'excited'});advance(3000);
 a.say('신호를 봐요');
 assert.equal(spoken[0].rate,TONE_PROSODY.calm.rate);assert.equal(spoken[0].pitch,TONE_PROSODY.calm.pitch);
 assert.equal(spoken[1].rate,TONE_PROSODY.excited.rate);assert.equal(spoken[1].pitch,TONE_PROSODY.excited.pitch);
 assert.equal(spoken[2].rate,1);assert.equal(spoken[2].pitch,1);
 assert.equal((spoken[0].voice as VoiceLike).name,'Google 한국의');
 assert.equal(a.voiceName(),'Google 한국의');
});

test('an online voice that never starts (offline) gives way to an on-device voice', () => {
 const timers:{fn:()=>void;ms:number}[]=[];const spoken:SpeechUtteranceLike[]=[];
 const voices:VoiceLike[]=[{lang:'ko-KR',name:'Google 한국의',localService:false},{lang:'ko-KR',name:'Yuna',localService:true}];
 const synth={speak(u:SpeechUtteranceLike){spoken.push(u);},cancel(){},getVoices:()=>voices,speaking:false,pending:false};
 let t=0;
 const a=createAnnouncer({synth,utterance:text=>({text,lang:'',rate:1,volume:1,pitch:1}),now:()=>t,later:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearLater:()=>{}});
 a.say('하나');
 assert.equal((spoken[0].voice as VoiceLike).name,'Google 한국의');
 const watch=timers.find(x=>x.ms===REMOTE_VOICE_WAIT_MS);assert.ok(watch);watch.fn();
 t+=5000;a.say('둘');
 assert.equal((spoken[1].voice as VoiceLike).name,'Yuna','next line uses the on-device voice');
});

test('speaking start and end are reported for music ducking, and the earcon only plays after a quiet spell', () => {
 const {a,spoken,speakingLog,earcons,advance,flush}=setup();
 assert.ok(a.say('시작해요'));
 assert.equal(earcons(),1,'first line after silence gets the soft chime');
 assert.equal(spoken.length,0,'speech waits until the chime has finished');
 assert.deepEqual(flush(),[EARCON_LEAD_MS]);
 (spoken[0].onstart as ()=>void)();(spoken[0].onend as ()=>void)();
 assert.deepEqual(speakingLog,[true,false]);
 advance(2000);a.say('다음 신호');
 assert.equal(earcons(),1,'rapid follow-up lines skip the chime');
 advance(EARCON_QUIET_MS+10);a.say('세 명이 모여요',{noEarcon:true});
 assert.equal(earcons(),1,'noEarcon skips it');
 assert.equal(spoken.at(-1)?.text,'세 명이 모여요');
});

type Node={kind:string;type?:string;connect:()=>void;disconnect:()=>void;[k:string]:unknown};
function fakeAudio(){
 const made:Node[]=[];
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(v:number){this.value=v;}});
 const node=(kind:string,extra:Record<string,unknown>={}):Node=>{const n:Node={kind,connect(){},disconnect(){},...extra};made.push(n);return n;};
 class AudioContext{
  state='running';currentTime=0;sampleRate=8000;destination={};
  resume(){return Promise.resolve();}
  createGain(){return node('gain',{gain:param()});}
  createOscillator(){return node('osc',{type:'sine',frequency:param(),start(){},stop(){}});}
  createBuffer(_c:number,len:number){return {getChannelData:()=>new Float32Array(len)};}
  createBufferSource(){return node('src',{start(){},stop(){}});}
  createBiquadFilter(){return node('filter',{type:'lowpass',frequency:param(),Q:param()});}
  createConvolver(){return node('verb');}
  createDynamicsCompressor(){return node('comp',{threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()});}
  createStereoPanner(){return node('pan',{pan:param()});}
 }
 return {made,AudioContext};
}

test('new effects use rounded waves, a shared reverb and limiter, and skip identical repeats', async () => {
 const {made,AudioContext}=fakeAudio();
 const g=globalThis as unknown as {window?:unknown;navigator?:unknown};
 g.window={AudioContext};
 const sfx=await import('../src/application/soundEffects');
 sfx.setSoundRandom(()=>0.5);
 for(const fn of [sfx.sfxTap,sfx.sfxSuccess,sfx.sfxFail,sfx.sfxCountdown,sfx.sfxPop,sfx.sfxCoin,sfx.sfxWhoosh,sfx.sfxClick,sfx.sfxWhistle,sfx.sfxUrgentWarning,sfx.sfxFanfare])fn();
 sfx.sfxTimerTick(2);sfx.sfxBeat(true);sfx.sfxDirectionalBell(1);
 const types=made.filter(n=>n.kind==='osc').map(n=>n.type);
 assert.ok(types.length>20);
 assert.ok(types.every(t=>t==='sine'||t==='triangle'),`no square/sawtooth: ${[...new Set(types)].join(',')}`);
 assert.equal(made.filter(n=>n.kind==='comp').length,1,'one shared limiter');
 assert.equal(made.filter(n=>n.kind==='verb').length,1,'one shared reverb');
 const before=made.length;sfx.sfxSuccess();
 assert.equal(made.length,before,'the same effect within 70ms plays once');
 // 음성이 나오는 동안 배경음악을 줄였다가 되돌린다.
 sfx.startBgm(0.175);
 sfx.duckForSpeech(true);assert.equal(sfx.isSpeechDucking(),true);
 sfx.duckForSpeech(false);assert.equal(sfx.isSpeechDucking(),false);
 sfx.stopBgm();
 sfx.setSoundRandom(null);
});

test('the TV voice ducks music, shows the chosen voice, the result plays a fanfare, and a sound check page exists', () => {
 const tv=read('src/application/useTvVoice.ts');
 assert.match(tv,/onSpeaking:duckForSpeech/);assert.match(tv,/earcon:sfxEarcon/);
 assert.match(read('src/presentation/components/TvVoiceToggle.tsx'),/목소리: \{voice\.voiceName/);
 assert.match(read('src/presentation/components/fun/useFunEngine.ts'),/state\.phase==='result'\)sfxFanfare\(\)/);
 assert.match(read('src/App.tsx'),/path="\/sound-check"/);
 const sig=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 assert.match(sig,/tone:state\.phase==='climax'\?'excited'/);
 assert.doesNotMatch(read('src/application/soundEffects.ts'),/'square'|'sawtooth'/);
});
