/**
 * '오늘 수업' 화면에서 마지막으로 고른 학년·공간·시간·팀 수와, 오늘 '다른 활동으로'를 누른 횟수를 이 기기에 둔다.
 * 학생 정보가 아니라 수업 설정이라 오래 둬도 된다(서버로 보내지 않는다).
 */
import {readStorage,writeStorage} from './browserStorage';
import {localDayKey,parseTodaySettings,type TodaySettings} from '../domain/todayLesson';

const SETTINGS_KEY='physical_today_settings_v1';
const SHUFFLE_KEY='physical_today_shuffle_v1';

export function loadTodaySettings():TodaySettings{
 try{return parseTodaySettings(JSON.parse(readStorage(SETTINGS_KEY)??'null'));}catch{return parseTodaySettings(null);}
}
export function saveTodaySettings(s:TodaySettings){
 writeStorage(SETTINGS_KEY,JSON.stringify({grade:s.grade,space:s.space,minutes:s.minutes,teams:s.teams}));
}
/** 오늘 '다른 활동으로'를 몇 번 눌렀는지(날이 바뀌면 0). */
export function loadTodayShuffle(now:number):number{
 try{
  const v=JSON.parse(readStorage(SHUFFLE_KEY)??'null') as {day?:unknown;n?:unknown}|null;
  return v&&v.day===localDayKey(now)&&typeof v.n==='number'&&Number.isInteger(v.n)&&v.n>=0?v.n:0;
 }catch{return 0;}
}
export function saveTodayShuffle(now:number,n:number){writeStorage(SHUFFLE_KEY,JSON.stringify({day:localDayKey(now),n}));}
