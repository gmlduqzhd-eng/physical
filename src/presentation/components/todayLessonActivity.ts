import {useEffect,useSyncExternalStore} from 'react';

/**
 * '오늘 수업' 막대가 지금 화면의 게임이 어디까지 왔는지 알 수 있게 하는 작은 알림판.
 * 대표 게임은 진행 중(playing)·결과(기록 전 result, 기록 후 recorded)를 적어 두고, 막대는 진행 중이면 '다음 단계'를 낮추고 확인을 받는다.
 * 확인하면 finish(결과 발표로 보내기)나 cleanup(이어 할 판·리모컨 방 정리)을 부른다.
 */
export type LessonActivityPhase='playing'|'result'|'recorded';
export interface LessonActivity {gameId:string;phase:LessonActivityPhase;
 /** 결과 발표 화면으로 보낸다(기록하고 넘어가도록). */
 finish:()=>void;
 /** 결과 없이 떠날 때 이 판을 정리한다(이어 할 판·리모컨 방 지우기). */
 cleanup:()=>void}

let current:LessonActivity|null=null;
const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(l=>l());
const subscribe=(l:()=>void)=>{listeners.add(l);return ()=>{listeners.delete(l);};};

export const getLessonActivity=()=>current;
export function setLessonActivity(next:LessonActivity|null){if(current===next)return;current=next;emit();}
export const useLessonActivity=()=>useSyncExternalStore(subscribe,getLessonActivity,()=>null);

/** 게임 화면이 지금 상태를 알린다. 화면이 사라지면 지운다. */
export function useReportLessonActivity(activity:LessonActivity|null){
 const gameId=activity?.gameId,phase=activity?.phase;
 useEffect(()=>{
  if(!activity){setLessonActivity(null);return;}
  setLessonActivity(activity);
  return ()=>{if(current===activity)setLessonActivity(null);};
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 게임과 진행 상태가 바뀔 때만 다시 알린다(함수는 매번 새로 만들어진다).
 },[gameId,phase]);
}
