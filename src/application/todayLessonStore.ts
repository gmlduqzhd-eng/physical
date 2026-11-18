import {useSyncExternalStore} from 'react';
import {isStaleRun,parseRun,type TodayRun} from '../domain/todayLesson';

/**
 * '오늘 수업' 진행 상태를 이 탭의 sessionStorage에 둔다. 새로고침해도 이어지고, 탭을 닫으면 사라진다.
 * 화면 여러 곳(오늘 수업 화면, 게임 위 단계 막대)이 같은 값을 보도록 작은 구독 저장소로 감싼다.
 */
const KEY='physical_today_run_v1';
const listeners=new Set<()=>void>();
let cache:TodayRun|null|undefined;

function read():TodayRun|null{
 try{const raw=sessionStorage.getItem(KEY);return raw?parseRun(JSON.parse(raw)):null;}catch{return null;}
}
export function loadTodayRun():TodayRun|null{if(cache===undefined)cache=read();return cache;}
export function saveTodayRun(run:TodayRun|null){
 cache=run;
 try{if(run)sessionStorage.setItem(KEY,JSON.stringify(run));else sessionStorage.removeItem(KEY);}catch{/* 저장이 막혀도 화면 안에서는 이어진다 */}
 listeners.forEach(l=>l());
}
const subscribe=(l:()=>void)=>{listeners.add(l);return ()=>{listeners.delete(l);};};
/** 오늘 시작한 수업만(게임 위 단계 막대 등). 다른 날 남은 수업은 '오늘 수업' 화면에서 이어 할지 묻는다. */
const loadFreshRun=()=>{const run=loadTodayRun();return run&&!isStaleRun(run,Date.now())?run:null;};
export const useTodayRun=()=>useSyncExternalStore(subscribe,loadFreshRun,()=>null);
/** 날짜와 상관없이 남아 있는 수업('오늘 수업' 화면이 어제 수업을 알아보는 데 쓴다). */
export const useStoredTodayRun=()=>useSyncExternalStore(subscribe,loadTodayRun,()=>null);

/** 처음 쓰는 선생님 안내를 한 번 봤는지(이 브라우저). */
const GUIDE_KEY='physical_teacher_guide_seen_v1';
export function guideSeen():boolean{try{return localStorage.getItem(GUIDE_KEY)==='1';}catch{return true;}}
export function markGuideSeen(){try{localStorage.setItem(GUIDE_KEY,'1');}catch{/* 무시 */}}
