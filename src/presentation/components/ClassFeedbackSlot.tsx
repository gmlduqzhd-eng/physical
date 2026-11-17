import {Link} from 'react-router-dom';
import {useEffect,useState} from 'react';
import {holdPlayId,newPlayId,recordVote,releasePlayId,useClassProgress} from '../../application/classProgressStore';
import {currentVote,mapView,weekCompare,type Vote} from '../../domain/classProgress';
import './ClassFeedbackSlot.css';

/**
 * 모든 게임 끝 화면에 붙는 선생님용 10초 반응(👍/👎)과 반 원정 지도 한 줄.
 * 판 기록(recordPlay)은 게임 화면이 결과를 남길 때 한 번만 한다. 여기서는 반응만 남긴다.
 * 반응은 판 id(playId)에 붙는다. 넘겨받지 못하면 이 칸이 판 id를 하나 잡아 두고, 결과를 기록할 때 그 id를 쓴다.
 * 그래서 기록하기 전에 누른 반응이 앞 판의 반응을 덮어쓰지 않는다.
 */
export function ClassFeedbackSlot({gameId,playId,tone='dark'}:{gameId:string;playId?:string;tone?:'dark'|'light'}){
 const progress=useClassProgress();
 const [claimed]=useState(()=>playId?'':newPlayId());
 // 화면에 붙어 있는 동안 이 판 id를 잡아 둔다. 결과를 기록하면 이 id로 판이 남는다.
 useEffect(()=>{if(!claimed)return;holdPlayId(gameId,claimed);return ()=>releasePlayId(gameId,claimed);},[gameId,claimed]);
 const play=playId||claimed;
 const vote=currentVote(progress,gameId,play);
 const map=mapView(progress);
 const week=weekCompare(progress,Date.now());
 const cast=(v:Vote)=>recordVote(gameId,v,Date.now(),play);
 return <section className="class-feedback" data-tone={tone} aria-label="선생님 반응과 반 원정 지도">
  <p className="class-feedback-q">선생님, 이 활동 우리 반에 잘 맞았나요?</p>
  <div className="class-feedback-votes" role="group" aria-label="반응 남기기">
   <button type="button" aria-pressed={vote==='up'} onClick={()=>cast('up')}>👍 또 할래요</button>
   <button type="button" aria-pressed={vote==='down'} onClick={()=>cast('down')}>👎 별로였어요</button>
  </div>
  {vote&&<p role="status" className="class-feedback-done">{vote==='up'?'좋아요! 추천에 반영할게요.':'알려 주셔서 고마워요. 보관함 후보로 살펴볼게요.'}</p>}
  <Link className="class-feedback-map" to="/class-progress">
   <span aria-hidden="true">{map.current.icon}</span>
   <span><b>반 원정 지도 {map.opened}/{map.tiles.length}칸</b>{map.lap>1?` · ${map.lap}바퀴째`:''} · {week.line}</span>
   <span aria-hidden="true">→</span>
  </Link>
 </section>;
}
