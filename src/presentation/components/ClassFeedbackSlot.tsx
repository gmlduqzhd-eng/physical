import {Link} from 'react-router-dom';
import {useEffect,useRef,useState} from 'react';
import {holdPlayId,newPlayId,recordReasons,recordVote,releasePlayId,useClassProgress} from '../../application/classProgressStore';
import {MAX_NOTE,REASONS,currentVote,mapView,reasonsForVote,reasonsOf,weekCompare,type ClassProgress,type ReasonId,type Vote} from '../../domain/classProgress';
import {useClassRoster} from '../../application/classRosterStore';
import {currentClass} from '../../domain/classRoster';
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
 // 반이 여럿이면 어느 반에 기록되는지 보여 준다(반은 오늘 수업·우리 반 반응 화면에서 바꾼다).
 const roster=useClassRoster();
 const [claimed]=useState(()=>playId?'':newPlayId());
 // 화면에 붙어 있는 동안 이 판 id를 잡아 둔다. 결과를 기록하면 이 id로 판이 남는다.
 useEffect(()=>{if(!claimed)return;holdPlayId(gameId,claimed);return ()=>releasePlayId(gameId,claimed);},[gameId,claimed]);
 const play=playId||claimed;
 const vote=currentVote(progress,gameId,play);
 // 👍↔👎를 오가도 앞서 고른 이유를 잃지 않게, 이 화면에 있는 동안 반응마다 고른 이유를 기억한다(저장은 지금 반응의 이유만).
 const remembered=useRef<{play:string;up:ReasonId[];down:ReasonId[]}>({play,up:[],down:[]});
 const cast=(v:Vote)=>{
  if(v===vote)return; // 같은 반응을 다시 눌러도 바뀌는 것이 없다(예전 기록의 이유도 그대로 둔다)
  if(remembered.current.play!==play)remembered.current={play,up:[],down:[]};
  recordVote(gameId,v,Date.now(),play);
  const saved=reasonsOf(progress,play);
  // 이유를 모두 빼서 기록이 지워진 뒤(saved 없음)에도 '고른 이유 없음'을 기억해, 뺀 이유가 되살아나지 않게 한다.
  if(vote)remembered.current[vote]=saved?.reasons??[];
  // 👍↔👎를 바꾸면 다른 쪽 이유는 빼고, 이 반응에서 앞서 골랐던 이유를 되살린다(메모는 남긴다).
  const next=[...new Set([...(saved?.reasons??[]).filter(r=>VOTE_OF.get(r)===v),...remembered.current[v]])];
  if(saved||next.length)recordReasons(gameId,play,next,saved?.note);
 };
 return <section className="class-feedback" data-tone={tone} aria-label={showMap?'선생님 반응과 반 원정 지도':'선생님 반응'}>
  <p className="class-feedback-q">선생님, 이 활동 {roster.classes.length>1?`‘${currentClass(roster).name}’에`:'우리 반에'} 잘 맞았나요?</p>
  {roster.classes.length>1&&<p className="class-feedback-class" data-feedback-class>기록할 반 · <strong>{currentClass(roster).name}</strong></p>}
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
   {/* 예전 기록에서 이 반응에 고른 다른 쪽 이유(👍 + '너무 쉬웠어요' 등)도 보여 주어 뺄 수 있게 한다. */}
   {[...reasonsForVote(vote),...REASONS.filter(r=>r.vote!==vote&&picked.has(r.id))].map(r=><button key={r.id} type="button" aria-pressed={picked.has(r.id)} onClick={()=>toggle(r.id)}>{r.label}</button>)}
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
