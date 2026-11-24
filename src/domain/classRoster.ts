/**
 * 반 목록(이 기기에만 저장). 전담 선생님처럼 여러 반을 가르칠 때 반마다 기록을 따로 쌓는다.
 * 반 이름만 있고 학생 정보는 없다. 처음부터 있는 반(DEFAULT_CLASS_ID)의 기록은 예전 저장 자리를 그대로 쓴다.
 */
export interface ClassInfo {id:string;name:string}
export interface ClassRoster {classes:ClassInfo[];current:string}

export const DEFAULT_CLASS_ID='default';
export const DEFAULT_CLASS_NAME='우리 반';
export const MAX_CLASSES=12;
export const MAX_CLASS_NAME=16;
export const EMPTY_ROSTER:ClassRoster={classes:[{id:DEFAULT_CLASS_ID,name:DEFAULT_CLASS_NAME}],current:DEFAULT_CLASS_ID};

const ID=/^[a-z0-9]{1,12}$/;
/** 반 이름을 다듬는다(앞뒤 공백·줄바꿈 없애고 길이 제한). 비면 빈 문자열. */
export const cleanClassName=(raw:unknown)=>typeof raw==='string'?raw.replace(/\s+/g,' ').trim().slice(0,MAX_CLASS_NAME):'';

/** 저장소에서 읽은 값을 믿지 않고 걸러 낸다. 기본 반은 늘 맨 앞에 있다. */
export function parseRoster(raw:unknown):ClassRoster{
 if(!raw||typeof raw!=='object')return EMPTY_ROSTER;
 const input=raw as {classes?:unknown;current?:unknown},seen=new Set<string>(),classes:ClassInfo[]=[];
 let defaultName=DEFAULT_CLASS_NAME;
 if(Array.isArray(input.classes))for(const item of input.classes){
  if(!item||typeof item!=='object')continue;
  const id=String((item as ClassInfo).id??''),name=cleanClassName((item as ClassInfo).name);
  if(!name)continue;
  if(id===DEFAULT_CLASS_ID){defaultName=name;continue;}
  if(!ID.test(id)||seen.has(id)||classes.length>=MAX_CLASSES-1)continue;
  seen.add(id);classes.push({id,name});
 }
 const all=[{id:DEFAULT_CLASS_ID,name:defaultName},...classes];
 const current=typeof input.current==='string'&&all.some(c=>c.id===input.current)?input.current:DEFAULT_CLASS_ID;
 return {classes:all,current};
}

export const currentClass=(roster:ClassRoster):ClassInfo=>roster.classes.find(c=>c.id===roster.current)??roster.classes[0];
export const canAddClass=(roster:ClassRoster)=>roster.classes.length<MAX_CLASSES;

/** 새 반을 만들고 그 반을 고른다. 이름이 비었거나 반이 꽉 차면 그대로 돌려준다. */
export function addClass(roster:ClassRoster,rawName:string,id:string):ClassRoster{
 const name=cleanClassName(rawName);
 if(!name||!canAddClass(roster)||!ID.test(id)||roster.classes.some(c=>c.id===id))return roster;
 return {classes:[...roster.classes,{id,name}],current:id};
}
export function renameClass(roster:ClassRoster,id:string,rawName:string):ClassRoster{
 const name=cleanClassName(rawName);
 return name?{...roster,classes:roster.classes.map(c=>c.id===id?{...c,name}:c)}:roster;
}
/** 반을 없앤다(기본 반은 없앨 수 없다). 고른 반이 없어지면 기본 반으로 돌아간다. */
export function removeClass(roster:ClassRoster,id:string):ClassRoster{
 if(id===DEFAULT_CLASS_ID||!roster.classes.some(c=>c.id===id))return roster;
 return {classes:roster.classes.filter(c=>c.id!==id),current:roster.current===id?DEFAULT_CLASS_ID:roster.current};
}
export const selectClass=(roster:ClassRoster,id:string):ClassRoster=>roster.classes.some(c=>c.id===id)?{...roster,current:id}:roster;

/** 반별 저장 자리 이름. 기본 반은 예전 자리 그대로라서, 반을 나누기 전 기록이 그대로 보인다. */
export const classStorageKey=(base:string,classId:string)=>classId===DEFAULT_CLASS_ID?base:`${base}::${classId}`;
