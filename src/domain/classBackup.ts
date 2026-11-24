import {parseProgress,type ClassProgress} from './classProgress';
import {parseJourney,type JourneyStamp} from './classJourney';
import {DEFAULT_CLASS_ID,parseRoster,type ClassRoster} from './classRoster';

/**
 * 기록 보관 파일: 반 목록과 반마다의 반응 기록·원정 지도 도장. 학생 정보는 없다.
 * 컴퓨터를 바꾸거나 브라우저 기록을 지우기 전에 파일로 받아 두고, 새 기기에서 가져온다.
 */
export const BACKUP_KIND='physical-class-backup';
export const BACKUP_VERSION=1;
export const MAX_BACKUP_BYTES=5*1024*1024;
export interface ClassBackupEntry {id:string;name:string;progress:ClassProgress;journey:JourneyStamp[]}
export interface ClassBackup {kind:typeof BACKUP_KIND;version:number;savedAt:string;current:string;classes:ClassBackupEntry[]}

export function buildBackup(roster:ClassRoster,read:(classId:string)=>{progress:unknown;journey:unknown},savedAt:string):ClassBackup{
 return {kind:BACKUP_KIND,version:BACKUP_VERSION,savedAt,current:roster.current,classes:roster.classes.map(c=>{const data=read(c.id);return {id:c.id,name:c.name,progress:parseProgress(data.progress),journey:parseJourney(data.journey)};})};
}

/** 파일 내용을 믿지 않고 걸러 낸다. 우리 파일이 아니면 null. */
export function parseBackup(raw:unknown):{roster:ClassRoster;data:Map<string,{progress:ClassProgress;journey:JourneyStamp[]}>}|null{
 if(!raw||typeof raw!=='object')return null;
 const input=raw as Partial<ClassBackup>;
 if(input.kind!==BACKUP_KIND||typeof input.version!=='number'||input.version>BACKUP_VERSION||!Array.isArray(input.classes))return null;
 const roster=parseRoster({classes:input.classes,current:input.current}),data=new Map<string,{progress:ClassProgress;journey:JourneyStamp[]}>();
 for(const c of roster.classes){
  const entry=input.classes.find(e=>e&&typeof e==='object'&&String((e as ClassBackupEntry).id)===c.id) as ClassBackupEntry|undefined;
  data.set(c.id,{progress:parseProgress(entry?.progress),journey:parseJourney(entry?.journey)});
 }
 if(!data.has(DEFAULT_CLASS_ID))return null;
 return {roster,data};
}

/** 보관 파일에 든 내용 한 줄 요약(가져오기 전에 보여 준다). */
export function backupSummary(parsed:NonNullable<ReturnType<typeof parseBackup>>):string{
 return parsed.roster.classes.map(c=>{const d=parsed.data.get(c.id)!;return `${c.name}: ${d.progress.plays.length}판 · 도장 ${d.journey.length}개`;}).join(' / ');
}
