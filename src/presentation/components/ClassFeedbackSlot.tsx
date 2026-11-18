import {Link} from 'react-router-dom';
import {useEffect,useState} from 'react';
import {holdPlayId,newPlayId,recordReasons,recordVote,releasePlayId,useClassProgress} from '../../application/classProgressStore';
import {MAX_NOTE,REASONS,currentVote,mapView,reasonsForVote,reasonsOf,weekCompare,type ClassProgress,type ReasonId,type Vote} from '../../domain/classProgress';
import './ClassFeedbackSlot.css';

const VOTE_OF=new Map(REASONS.map(r=>[r.id,r.vote]));

/**
 * 모든 게임 끝 화면에 붙는 선생님용 10초 반응(👍/👎)과 반 원정 지도 한 줄.
 * 판 기록(recordPlay)은 게임 화면이 결과를 남길 때 한 번만 한다. 여기서는 반응만 남긴다.
 * 반응은 판 id(playId)에 붙는다. 넘겨받지 못하면 이 칸이 판 id를 하나 잡아 두고, 결과를 기록할 때 그 id를 쓴다.
 * 그래서 기록하기 전에 누른 반응이 앞 판의 반응을 덮어쓰지 않는다.
 * showMap=false: 한 화면에 칸이 여럿일 때(오늘 수업 끝 화면) 지도 줄은 화면이 한 번만 보여 준다.
 */
export function ClassFeedbackSlot({gameId,playId,tone='dark',showMap=true}:{gameId:string;playId?:string;tone?:'dark'|'light';showMap?:boolean}){
 const progress=useClassProgress();
 const [claimed]=useState(()=>playId?'':newPlayId());
 // 화면에 붙어 있는 동안 이 판 id를 잡아 둔다. 결과를 기록하면 이 id로 판이 남는다.
 useEffect(()=>{if(!claimed)return;holdPlayId(gameId,claimed);return ()=>releasePlayId(gameId,claimed);},[gameId,claimed]);
 const play=playId||claimed;
 const vote=currentVote(progress,gameId,play);
 const cast=(v:Vote)=>{
  recordVote(gameId,v,Date.now(),play);
  // 👍↔👎를 바꾸면 다른 쪽 이유는 지운다(메모는 남긴다).
  const saved=reasonsOf(progress,play);
  if(saved&&saved.reasons.some(r=>VOTE_OF.get(r)!==v))recordReasons(gameId,play,saved.reasons.filter(r=>VOTE_OF.get(r)===v),saved.note);
 };
 return <section className="class-feedback" data-tone={tone} aria-label={showMap?'선생님 반응과 반 원정 지도':'선생님 반응'}>
  <p className="class-feedback-q">선생님, 이 활동 우리 반에 잘 맞았나요?</p>
  <div className="class-feedback-votes" role="group" aria-label="반응 남기기">
   <button type="button" aria-pressed={vote==='up'} onClick={()=>cast('up')}>👍 또 할래요</button>
   <button type="button" aria-pressed={vote==='down'} onClick={()=>cast('down')}>👎 별로였어요</button>
  </div>
  {vote&&<p role="status" className="class-feedback-done">{vote==='up'?'좋아요! 추천에 반영할게요.':'알려 주셔서 고마워요. 이유를 골라 주시면 더 잘 고칠 수 있어요.'}</p>}
  {/* 판 id가 바뀌면(같은 칸이 다음 판에 다시 쓰일 때) 메모 입력도 새로 시작한다. */}
  {vote&&<ReasonPicker key={play} progress={progress} gameId={gameId} play={play} vote={vote}/>}
  {showMap&&<ClassMapLink progress={progress}/>}
 </section>;
}

function ReasonPicker({progress,gameId,play,vote}:{progress:ClassProgress;gameId:string;play:string;vote:Vote}){
 // 반응 이유: 👍/👎 뒤에 고를 수 있다(고르지 않아도 기록에는 아무 영향이 없다). 👍에는 좋은 이유, 👎에는 고칠 이유만.
 const saved=reasonsOf(progress,play);
 const picked=new Set<ReasonId>(saved?.reasons??[]);
 const [note,setNote]=useState(()=>saved?.note??'');
 const toggle=(id:ReasonId)=>{const next=new Set(picked);if(next.has(id))next.delete(id);else next.add(id);recordReasons(gameId,play,[...next],note);};
 const saveNote=(text:string)=>{setNote(text);recordReasons(gameId,play,[...picked],text);};
 return <details className="class-feedback-reasons" open>
  <summary>이유 더하기 <small>(골라도 되고 안 골라도 돼요)</small></summary>
  <div className="class-feedback-chips" role="group" aria-label={vote==='up'?'좋았던 이유 고르기(여러 개 가능)':'아쉬웠던 이유 고르기(여러 개 가능)'}>
   {reasonsForVote(vote).map(r=><button key={r.id} type="button" aria-pressed={picked.has(r.id)} onClick={()=>toggle(r.id)}>{r.label}</button>)}
  </div>
  <label className="class-feedback-note">한 줄 메모 <small>({note.length}/{MAX_NOTE})</small>
   <input type="text" maxLength={MAX_NOTE} value={note} placeholder={vote==='up'?'예: 마지막 승부에서 모두 신났어요':'예: 1번 신호가 빨라서 헷갈려했어요'} onChange={e=>setNote(e.target.value)} onBlur={e=>saveNote(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();saveNote(e.currentTarget.value);}}}/>
  </label>
 </details>;
}

/** 반 원정 지도 한 줄(지도 화면으로 가는 링크). */
export function ClassMapLink({progress}:{progress:ClassProgress}){
 const map=mapView(progress);
 const week=weekCompare(progress,Date.now());
 return <Link className="class-feedback-map" to="/class-progress?tab=map">
  <span aria-hidden="true">{map.current.icon}</span>
  <span><b>반 원정 지도 {map.opened}/{map.tiles.length}칸</b>{map.lap>1?` · ${map.lap}바퀴째`:''} · {week.line}</span>
  <span aria-hidden="true">→</span>
 </Link>;
}
