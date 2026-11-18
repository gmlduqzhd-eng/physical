/**
 * TV 음성 안내: 큰 신호를 소리로도 읽어 준다(TV를 보지 않는 학생도 따라오게, 시끄러운 체육관에서도).
 *
 * - 문장은 짧게: 이모지·기호를 빼고, '×2'는 '두 배'처럼 읽기 쉬운 말로 바꾼다.
 * - 새 신호가 나오면 앞 문장을 끊고 새 문장을 읽는다(쌓이지 않게).
 * - 일시정지·꺼짐·지원 안 함이면 읽지 않는다(화면은 그대로 동작).
 * - 같은 말을 짧은 사이에 되풀이하지 않는다. 카운트다운·깜짝 이벤트(우선 안내)를 막 읽었으면 보통 신호는 잠깐 건너뛴다.
 *
 * React와 상관없는 순수 로직이라 Node 테스트에서 가짜 speechSynthesis로 검사한다.
 */

/** 브라우저 speechSynthesis에서 이 모듈이 쓰는 부분만(테스트에서 가짜로 바꿀 수 있게). */
export interface SpeechSynthLike {
 speak(u:SpeechUtteranceLike):void;
 cancel():void;
 getVoices():ReadonlyArray<{lang:string;name?:string}>;
 /** 지금 읽는 중인지(있으면 끊은 뒤 잠깐 쉬고 읽는다: Safari는 cancel 바로 뒤의 speak를 버리기도 한다). */
 readonly speaking?:boolean;
 readonly pending?:boolean;
}
export interface SpeechUtteranceLike {text:string;lang:string;rate:number;volume:number;pitch:number;voice?:unknown;onstart?:((...args:never[])=>unknown)|null;onend?:((...args:never[])=>unknown)|null;onerror?:((...args:never[])=>unknown)|null}
export type UtteranceFactory=(text:string)=>SpeechUtteranceLike;

export type SpeechRate='normal'|'slow';
export type SpeechVolume='normal'|'soft';
export interface SpeechPrefs {on:boolean;rate:SpeechRate;volume:SpeechVolume}
export const DEFAULT_SPEECH_PREFS:SpeechPrefs={on:true,rate:'normal',volume:'normal'};
export const SPEECH_RATE:Readonly<Record<SpeechRate,number>>={normal:1,slow:0.82};
export const SPEECH_VOLUME:Readonly<Record<SpeechVolume,number>>={normal:1,soft:0.6};
export const SPEECH_PREFS_KEY='physical_tv_voice_v1';

/** 지원 상태: ok(한국어 목소리 있음) · no-korean(목소리는 있는데 한국어가 없음) · unsupported(음성 안내 자체가 없음) · no-voices(기다려도 목소리 목록이 비어 있음: '목소리 확인'으로 소리가 나면 ok로 바뀐다) · unknown(목소리 목록을 아직 못 받음). */
export type SpeechStatus='ok'|'no-korean'|'unsupported'|'no-voices'|'unknown';

/** 같은 문장을 다시 읽지 않는 시간. */ export const REPEAT_GAP_MS=1500;
/** 우선 안내(카운트다운·이벤트)를 읽은 뒤 보통 신호를 건너뛰는 시간. */ export const PRIORITY_HOLD_MS=1200;
/** 너무 긴 문장은 이 길이 안에서 문장 끝에서 자른다. */ export const MAX_SPEECH_CHARS=90;
/** 목소리 목록이 이만큼 지나도 비어 있으면 '이 기기는 음성 안내가 안 돼요'로 본다. */ export const VOICE_WAIT_MS=3000;
/** 읽던 말을 끊은 뒤 새 말을 읽기까지 쉬는 시간(Safari가 새 말을 버리지 않게). */ export const CANCEL_GAP_MS=60;

// 그림 문자(이모지)와 그 꾸밈 글자(색 바꿈·ZWJ·피부색·국기 글자)
const PICTOGRAPH=/\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}]|‍|︎|️|⃣/gu;
// 소리 내어 읽지 않는 기호(괄호류는 공백, 가운뎃점·화살표는 쉼표)
const QUIET=/[「」『』《》〈〉“”‘’"'`*_#~|\\^<>[\]{}]/g;
const PAUSE=/[·•→←↔⇒➜▶▷◀◁■□●○▲△▼▽◆◇★☆✔✓✘✗※…/]+/g;

/** TV 신호 문장을 읽기 좋은 말로 바꾼다. 읽을 것이 없으면 빈 문자열. */
export function speechText(raw:string|undefined|null,maxChars=MAX_SPEECH_CHARS):string{
 if(!raw)return '';
 let t=String(raw);
 t=t.replace(PICTOGRAPH,' ');
 // 점수·배수: '×2'·'x2' → '두 배', '+1점'·'+1' → '1점 더'
 t=t.replace(/\s*[×xX]\s*2(?!\d)/g,' 두 배').replace(/\s*[×xX]\s*3(?!\d)/g,' 세 배');
 t=t.replace(/(^|\s)\+(\d+)\s*점?/g,(_m,pre:string,n:string)=>`${pre}${n}점 더`);
 t=t.replace(/(^|\s)[-−](\d+)\s*점?/g,(_m,pre:string,n:string)=>`${pre}${n}점 빼기`);
 // '3-2-1' → '3, 2, 1'
 t=t.replace(/(\d)\s*-\s*(?=\d)/g,'$1, ');
 // 'N/M'(진행) → 'M 중 N'
 t=t.replace(/(\d+)\s*\/\s*(\d+)/g,'$2 중 $1');
 t=t.replace(QUIET,' ').replace(PAUSE,', ');
 // 괄호 안 짧은 설명은 쉼표로 붙여 읽는다
 t=t.replace(/[()（）]/g,', ');
 t=t.replace(/\s*,(\s*,)+/g,',').replace(/\s+([,.!?])/g,'$1').replace(/([,.!?])(?=[^\s,.!?])/g,'$1 ').replace(/\s{2,}/g,' ').trim();
 t=t.replace(/^[,.!?\s]+/,'').replace(/,\s*$/,'');
 if(t.length>maxChars){
  const cut=t.slice(0,maxChars),end=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('! '),cut.lastIndexOf('? '));
  t=(end>20?cut.slice(0,end+1):cut.replace(/[,\s]+\S*$/,'')).trim();
 }
 return /[\p{L}\p{N}]/u.test(t)?t:'';
}

/** 마지막 10초에 읽는 초: 10, 5, 3, 2, 1. */
export const COUNTDOWN_SPOKEN:readonly number[]=[10,5,3,2,1];
export function countdownSpeech(seconds:number):string|null{
 if(!COUNTDOWN_SPOKEN.includes(seconds))return null;
 return seconds===10?'10초 남았어요':seconds===5?'5초':String(seconds);
}
export type SpokenSurprise='golden'|'reverse'|'freeze'|'speed';
const SURPRISE_SPEECH:Readonly<Record<SpokenSurprise,string>>={
 golden:'황금 신호! 점수 두 배!',
 reverse:'거꾸로! 반대로 움직여요!',
 freeze:'모두 얼음! 3초 멈춰요!',
 speed:'빨리빨리! 신호가 빨라져요!',
};
export const surpriseSpeech=(kind:SpokenSurprise)=>SURPRISE_SPEECH[kind];

export function parseSpeechPrefs(raw:string|null|undefined):SpeechPrefs{
 if(!raw)return {...DEFAULT_SPEECH_PREFS};
 try{
  const v=JSON.parse(raw) as Partial<SpeechPrefs>|null;
  if(!v||typeof v!=='object')return {...DEFAULT_SPEECH_PREFS};
  return {
   on:typeof v.on==='boolean'?v.on:DEFAULT_SPEECH_PREFS.on,
   rate:v.rate==='slow'?'slow':'normal',
   volume:v.volume==='soft'?'soft':'normal',
  };
 }catch{return {...DEFAULT_SPEECH_PREFS};}
}

export interface SayOptions {
 /** 카운트다운·깜짝 이벤트·결과처럼 꼭 읽어야 하는 말(앞 문장을 끊고, 잠깐 동안 보통 신호에 끊기지 않는다). */
 priority?:boolean;
 /** 일시정지여도 읽는다('목소리 확인' 단추). */ force?:boolean;
 /** 규칙 안내처럼 긴 문장도 자르지 않고 읽는다. */ long?:boolean;
}
export interface Announcer {
 say(text:string,opts?:SayOptions):boolean;
 cancel():void;
 setPaused(paused:boolean):void;
 setPrefs(prefs:SpeechPrefs):void;
 prefs():SpeechPrefs;
 status():SpeechStatus;
 /** 손동작(클릭·터치 끝·키) 안에서 부른다(iOS·Chrome은 사용자 동작 뒤에만 소리를 낸다). 성공할 때까지 여러 번 불러도 된다. */ unlock():void;
 /** 소리가 한 번이라도 실제로 났거나, 사용자 동작 안에서 깨우기를 시도했으면 true. */ unlocked():boolean;
 /** 마지막으로 읽은 문장(테스트·화면 표시용). */ last():string|null;
}

export interface AnnouncerEnv {
 synth:SpeechSynthLike|null;utterance:UtteranceFactory|null;now?:()=>number;prefs?:SpeechPrefs;
 /** 끊은 뒤 잠깐 쉬고 읽을 때 쓰는 타이머(테스트에서 바꿀 수 있게). */
 later?:(fn:()=>void,ms:number)=>unknown;clearLater?:(id:unknown)=>void;
 /** 소리가 처음 실제로 났을 때 부른다(목소리 목록이 비어 있어도 읽을 수 있는 기기에서 지원 표시를 다시 그리게). */
 onHeard?:()=>void;
}
export function createAnnouncer(env:AnnouncerEnv):Announcer{
 const now=env.now??(()=>Date.now());
 const later=env.later??((fn,ms)=>setTimeout(fn,ms));
 const clearLater=env.clearLater??(id=>clearTimeout(id as ReturnType<typeof setTimeout>));
 const createdAt=now();
 let prefs:SpeechPrefs={...(env.prefs??DEFAULT_SPEECH_PREFS)};
 let paused=false,unlocked=false;
 // 소리가 한 번이라도 실제로 났는지(목록이 비어 있어도 읽을 수 있는 기기를 알아본다).
 let heard=false;
 // 깨우기용 빈 문장이 아직 줄에 있는지(이때는 끊지 않고 바로 이어 읽는다: 같은 손동작 안에서 소리가 나야 한다).
 let warming=false;
 let waiting:unknown=null;
 const markHeard=()=>{unlocked=true;if(!heard){heard=true;env.onHeard?.();}};
 let lastText:string|null=null,lastAt=-Infinity,priorityAt=-Infinity;
 const synth=env.synth,make=env.utterance;
 const korean=()=>{try{return synth?.getVoices().find(v=>/^ko([-_]|$)/i.test(v.lang))??null;}catch{return null;}};
 const status=():SpeechStatus=>{
  if(!synth||!make)return 'unsupported';
  let voices:ReadonlyArray<{lang:string}>;
  try{voices=synth.getVoices();}catch{return 'unsupported';}
  if(!voices.length)return heard?'ok':now()-createdAt>=VOICE_WAIT_MS?'no-voices':'unknown';
  return korean()?'ok':'no-korean';
 };
 const dropWaiting=()=>{if(waiting!==null){clearLater(waiting);waiting=null;}};
 const cancel=()=>{dropWaiting();warming=false;try{synth?.cancel();}catch{/* 일부 브라우저 예외 무시 */}};
 const speakNow=(text:string)=>{
  if(!synth||!make)return false;
  try{
   const u=make(text);
   u.lang='ko-KR';u.rate=SPEECH_RATE[prefs.rate];u.volume=SPEECH_VOLUME[prefs.volume];u.pitch=1;
   const voice=korean();if(voice)u.voice=voice;
   u.onstart=markHeard;
   // 깨우기용 빈 문장만 줄에 있으면 끊지 않고 바로 뒤에 붙인다(끊고 쉬면 손동작 밖에서 읽게 되어 iOS에서 소리가 안 난다).
   if(warming){warming=false;dropWaiting();synth.speak(u);return true;}
   // 방금 끊고 쉬는 중이어도 '읽는 중'으로 본다(끊은 바로 뒤에 읽으면 Safari가 새 말을 버린다).
   const busy=Boolean(synth.speaking||synth.pending)||waiting!==null;
   cancel();
   if(!busy){synth.speak(u);return true;}
   // 읽던 말이 있으면 끊고 잠깐 쉰 뒤 읽는다(그 사이 새 말이 오면 새 말만 읽는다).
   waiting=later(()=>{waiting=null;try{synth.speak(u);}catch{/* 무시 */}},CANCEL_GAP_MS);
   return true;
  }catch{return false;}
 };
 return {
  say(raw,opts={}){
   const text=speechText(raw,opts.long?Infinity:MAX_SPEECH_CHARS);
   if(!text||!prefs.on)return false;
   if(paused&&!opts.force)return false;
   const st=status();
   // 한국어 목소리가 없으면 읽지 않는다(엉뚱한 언어로 읽지 않게). 목록을 아직 못 받았으면 브라우저 기본 목소리로 읽어 본다.
   if(st==='unsupported'||st==='no-korean')return false;
   // 목소리 목록이 끝내 비어 있으면 '목소리 확인'(force)만 읽어 본다. 소리가 나면 그때부터 ok.
   if(st==='no-voices'&&!opts.force)return false;
   const t=now();
   if(!opts.force){
    // 같은 말은 우선 안내라도 곧바로 되풀이하지 않는다(화면이 다시 그려져도 한 번만).
    if(text===lastText&&t-lastAt<REPEAT_GAP_MS)return false;
    if(!opts.priority&&t-priorityAt<PRIORITY_HOLD_MS)return false;
   }
   if(!speakNow(text))return false;
   lastText=text;lastAt=t;if(opts.priority)priorityAt=t;
   return true;
  },
  cancel,
  setPaused(p){paused=p;if(p)cancel();},
  setPrefs(p){prefs={...p};if(!p.on)cancel();},
  prefs:()=>({...prefs}),
  status,
  unlock(){
   if(unlocked||!synth||!make)return;
   // 목록이 비어 있는 기기(no-voices)도 깨워 본다: 소리가 시작되면 읽을 수 있는 기기다.
   const st=status();if(st==='no-korean'||st==='unsupported')return;
   try{
    const u=make(' ');u.lang='ko-KR';u.volume=0;u.rate=1;u.pitch=1;
    const done=()=>{warming=false;};
    u.onstart=()=>{markHeard();};u.onend=done;u.onerror=done;
    warming=true;
    synth.speak(u);
    // 사용자 동작 안에서 한 번 깨웠으면 됐다고 본다(빈 문장은 시작 알림이 오지 않는 브라우저도 있다).
    unlocked=true;
   }catch{/* 무시: 다음 손동작에서 다시 시도 */}
  },
  unlocked:()=>unlocked,
  last:()=>lastText,
 };
}
