import {Link} from 'react-router-dom';
import {useTvVoice} from '../application/useTvVoice';
import {legacySfx,type LegacyKey} from '../application/soundEffectsLegacy';
import {sfxClick,sfxCoin,sfxCountdown,sfxFail,sfxFanfare,sfxSuccess,sfxTap,sfxTimerTick,sfxUrgentWarning,sfxWhistle,sfxWhoosh,unlockAudio} from '../application/soundEffects';
import type {SpeechTone} from '../application/speechText';
import './SoundCheckPage.css';

const SOUNDS:ReadonlyArray<{key:LegacyKey;label:string;use:string;play:()=>void}>=[
 {key:'success',label:'성공',use:'잘 해냈을 때',play:sfxSuccess},
 {key:'fail',label:'아쉬워요',use:'틀렸을 때',play:sfxFail},
 {key:'fanfare',label:'결과 발표',use:'게임이 끝났을 때',play:sfxFanfare},
 {key:'whistle',label:'호루라기',use:'판이 바뀔 때',play:sfxWhistle},
 {key:'countdown',label:'준비 째깍',use:'시작하기 전',play:sfxCountdown},
 {key:'tick',label:'마지막 째깍',use:'마지막 10초',play:()=>sfxTimerTick(2)},
 {key:'urgent',label:'곧 끝나요',use:'3초 남았을 때',play:sfxUrgentWarning},
 {key:'coin',label:'점수',use:'점수를 얻을 때',play:sfxCoin},
 {key:'whoosh',label:'깜짝 이벤트',use:'이벤트가 나올 때',play:sfxWhoosh},
 {key:'tap',label:'누르기',use:'버튼을 누를 때',play:sfxTap},
 {key:'click',label:'작은 딸깍',use:'고를 때',play:sfxClick},
];
const SAMPLES:ReadonlyArray<{tone:SpeechTone;label:string;text:string}>=[
 {tone:'calm',label:'차분하게',text:'준비운동을 시작해요. 천천히 두 팔을 위로 올려요. 숨을 크게 쉬어요.'},
 {tone:'normal',label:'보통',text:'신호를 보고 움직여요. 세 명이 모여요. 잘했어요.'},
 {tone:'excited',label:'신나게',text:'마지막 승부! 두 번 더 뛰어요! 청팀이 이겼어요!'},
];

/** 소리 미리듣기: 예전 소리와 새 소리를 나란히 들어 보고, 음성 안내 말투 세 가지를 들어 본다. */
export function SoundCheckPage(){
 const voice=useTvVoice();
 const blocked=voice.status==='unsupported'||voice.status==='no-korean';
 const play=(fn:()=>void)=>{unlockAudio();fn();};
 return <main className="sound-check" id="main">
  <header className="sound-check-head">
   <p className="sound-check-eyebrow">소리 미리듣기</p>
   <h1>효과음과 음성 안내를 들어 봐요</h1>
   <p>TV 스피커로 들어 보세요. 새 소리는 둥글고 부드러운 소리에 옅은 울림을 넣었어요. 음성 안내는 이 기기에서 가장 자연스러운 한국어 목소리를 골라 읽어요.</p>
  </header>
  <section aria-labelledby="sound-check-fx">
   <h2 id="sound-check-fx">효과음 비교</h2>
   <ul className="sound-check-list">
    {SOUNDS.map(s=><li key={s.key}>
     <div><b>{s.label}</b><span>{s.use}</span></div>
     <button type="button" className="sound-check-new" onClick={()=>play(s.play)}>▶ 새 소리</button>
     <button type="button" className="sound-check-old" onClick={()=>play(legacySfx[s.key])}>예전 소리</button>
    </li>)}
   </ul>
  </section>
  <section aria-labelledby="sound-check-voice">
   <h2 id="sound-check-voice">음성 안내 말투</h2>
   <p className="sound-check-voice-name">목소리: {blocked?'이 기기는 음성 안내가 안 돼요':voice.voiceName??'이 기기의 기본 목소리'}</p>
   <ul className="sound-check-list">
    {SAMPLES.map(s=><li key={s.tone}>
     <div><b>{s.label}</b><span>{s.text}</span></div>
     <button type="button" className="sound-check-new" disabled={blocked} onClick={()=>{unlockAudio();voice.say(s.text,{tone:s.tone,force:true,long:true,priority:true});}}>▶ 들어 보기</button>
    </li>)}
   </ul>
   <p className="sound-check-note">빠르기·크기는 게임 화면의 🔊 음성 안내 설정에서 바꿀 수 있어요.</p>
  </section>
  <p><Link to="/guide">← 1분 안내로</Link> · <Link to="/hub">활동 고르기</Link></p>
 </main>;
}
