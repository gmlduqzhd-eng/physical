import {Link} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {TvModeButton} from './components/DisplayButtons';
import {setTextScale,useDisplayPrefs,type TextScale} from '../application/displayPrefs';
import './DisplayCheckPage.css';

const SCALES:ReadonlyArray<{id:TextScale;label:string;note:string}>=[
 {id:'normal',label:'보통',note:'가까이에서 볼 때'},
 {id:'large',label:'크게',note:'교실 가운데에서 볼 때'},
 {id:'xlarge',label:'더 크게',note:'교실 맨 뒤에서 볼 때'},
];

/** "뒤에서 보여요?" 확인 화면: 교실 맨 뒤에 서서 글씨가 읽히는지 보고, 글씨 크기와 TV 모드를 맞춘다. */
export function DisplayCheckPage(){
 const prefs=useDisplayPrefs();
 return <FlowShell utilities className="display-check-page">
  <section className="display-check" aria-labelledby="display-check-title">
   <p className="eyebrow">화면 보기 설정 · 이 기기에만 저장해요</p>
   <h1 id="display-check-title">뒤에서 보여요?</h1>
   <p className="display-check-lead">교실 맨 뒤에 서서 아래 글씨를 읽어 보세요. 잘 안 보이면 글씨를 키워요.</p>
   <div className="display-check-scales" role="group" aria-label="글씨 크기 고르기">
    {SCALES.map(s=><button key={s.id} type="button" aria-pressed={prefs.textScale===s.id} data-text-scale-choice={s.id} onClick={()=>setTextScale(s.id)}><strong>{prefs.textScale===s.id?'✓ ':''}{s.label}</strong><small>{s.note}</small></button>)}
   </div>
   <div className="display-check-sample" aria-label="보기 예시">
    <p className="display-check-signal" data-sample-signal>두 팔을 위로!</p>
    <p className="display-check-body" data-sample-body>신호를 보고 몸으로 따라 해요. 서로 닿지 않게 자기 자리에서 움직여요.</p>
    <p className="display-check-row"><span className="display-check-button" data-sample-button>▶ 시작</span><span className="display-check-small">⏱ 남은 시간 1분 30초 · 청팀 3점</span></p>
   </div>
   <h2>교실 TV 모드</h2>
   <p className="display-check-lead">켜면 활동 화면에서 설명과 작은 버튼을 숨기고, 큰 신호 · 점수판 · 남은 시간만 크게 보여 줘요.</p>
   <p className="display-check-actions"><TvModeButton/><span role="status" aria-live="polite">{prefs.tvMode?'지금 TV 모드가 켜져 있어요.':'지금 TV 모드가 꺼져 있어요.'}</span></p>
   <p className="display-check-actions"><Link className="primary display-check-go" to="/today">📋 오늘 수업 시작</Link><Link to="/hub">활동 고르기</Link><Link to="/sound-check">🔈 소리 미리듣기</Link></p>
  </section>
 </FlowShell>;
}
