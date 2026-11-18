import {Link} from 'react-router-dom';
import {READY_SIGNATURE_GAMES} from '../domain/signatureGames';
import {TeacherQuickGuideBody} from './components/TeacherQuickGuide';
import {FlowShell} from './FlowShell';
import './SignatureCardsPrint.css';

/**
 * 인쇄용 대표 게임 규칙 카드(A4 한 장에 두 장씩)와, 휴대폰 리모컨 안내·1분 안내를 한 장에 담은 안내지.
 * 인쇄할 때는 흰 바탕에 검은 글씨·얇은 테두리만 써서 흑백 프린터에서도 잘 보이고 잉크를 아낀다.
 * 방 코드는 그때그때 바뀌므로 포스터는 'TV의 📱 버튼을 누르고 QR을 찍어요' 같은 일반 안내만 담는다.
 */
export function SignatureCardsPrint(){
 return <FlowShell utilities className="sig-print-page">
  <div className="sig-print-tools no-print">
   <h1>대표 게임 규칙 카드 · 리모컨 안내 인쇄</h1>
   <p>A4로 인쇄해 체육관 벽이나 칠판에 붙여 두세요. 카드는 한 장에 두 개씩 나와요.</p>
   <div className="sig-print-actions"><button type="button" className="primary today-primary" onClick={()=>window.print()}>🖨 인쇄하기</button><Link to="/today">오늘 수업으로</Link></div>
  </div>
  <section className="sig-print-sheet" aria-label="휴대폰 리모컨 안내와 처음 쓰는 선생님 1분 안내">
   <article className="sig-poster" aria-label="휴대폰 리모컨 안내 포스터">
    <p className="sig-poster-eyebrow">땀방울 원정대 · 휴대폰 리모컨</p>
    <h2>TV의 📱 버튼을 누르고<br/>QR을 찍어요</h2>
    <ol>
     <li>대표 게임 화면 오른쪽 위 <b>📱 휴대폰 리모컨</b>을 눌러요.</li>
     <li>선생님 휴대폰 카메라로 TV의 <b>QR</b>을 찍어요.</li>
     <li>TV와 휴대폰의 <b>확인 번호가 같으면</b> TV에서 ‘허용’을 눌러요.</li>
     <li>휴대폰으로 <b>다음 · 점수 · 깜짝 이벤트</b>를 보내요.</li>
    </ol>
    <p className="sig-poster-note">QR을 찍을 수 없으면 TV의 6자리 코드를 휴대폰에 넣어도 돼요.</p>
   </article>
   <article className="sig-poster sig-poster-light" aria-label="처음 쓰는 선생님 1분 안내"><p className="sig-poster-eyebrow">처음 쓰는 선생님 · 1분 안내</p><TeacherQuickGuideBody compact/></article>
  </section>
  {READY_SIGNATURE_GAMES.map(g=><article key={g.id} className="sig-card" aria-label={`${g.name} 규칙 카드`}>
   <p className="sig-card-eyebrow">대표 게임 · 약 {g.minutes}분</p>
   <h2><span aria-hidden="true">{g.emoji}</span> {g.name}</h2>
   <p className="sig-card-one">{g.oneLine}</p>
   <dl>{g.rules.slice(0,3).map((r,i)=><div key={i}><dt>{['무엇을','어떻게','언제 끝나요'][i]??`${i+1}`}</dt><dd>{r}</dd></div>)}</dl>
   <p className="sig-card-concept">오늘 연습: {g.concept}</p>
  </article>)}
 </FlowShell>;
}
