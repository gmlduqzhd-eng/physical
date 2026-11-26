/**
 * 기록 보관 알림: 마지막으로 보관(파일 또는 계정)한 뒤 판이 꽤 쌓이면 한 줄로 알려 준다.
 * 서버 백업이 없고 기록은 이 기기에만 있어서, 보관을 잊으면 컴퓨터를 바꿀 때 기록이 사라진다.
 */
export interface BackupMark {
 /** 마지막으로 파일로 받거나 계정에 올린 때 */ at:number;
 /** 그때의 모든 반 판 수 합 */ plays:number;
 /** 계정에 마지막으로 올린 때(없으면 0) */ cloudAt:number;
 /** '나중에'를 누른 때의 판 수(그 뒤로 다시 쌓여야 알린다) */ snoozedPlays:number;
}
export const NO_BACKUP:BackupMark={at:0,plays:0,cloudAt:0,snoozedPlays:0};
/** 이만큼 새 판이 쌓이면 알린다. */
export const NUDGE_PLAYS=10;

const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?Math.floor(v):0;
export function parseBackupMark(raw:unknown):BackupMark{
 if(!raw||typeof raw!=='object')return NO_BACKUP;
 const m=raw as Partial<BackupMark>;
 return {at:num(m.at),plays:num(m.plays),cloudAt:num(m.cloudAt),snoozedPlays:num(m.snoozedPlays)};
}
/** 보관한 뒤 새로 쌓인 판 수(기록을 지워 줄었으면 0). */
export const playsSinceBackup=(mark:BackupMark,totalPlays:number)=>Math.max(0,totalPlays-mark.plays);
/** 지금 알릴지: 마지막 보관·'나중에' 뒤로 NUDGE_PLAYS판 이상 쌓였을 때. */
export function shouldNudge(mark:BackupMark,totalPlays:number):boolean{
 return totalPlays-Math.max(mark.plays,mark.snoozedPlays)>=NUDGE_PLAYS;
}
export const markBackedUp=(mark:BackupMark,totalPlays:number,now:number,cloud:boolean):BackupMark=>({at:now,plays:totalPlays,cloudAt:cloud?now:mark.cloudAt,snoozedPlays:0});
export const markSnoozed=(mark:BackupMark,totalPlays:number):BackupMark=>({...mark,snoozedPlays:totalPlays});
