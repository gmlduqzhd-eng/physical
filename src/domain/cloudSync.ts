import type {ClassBackup} from './classBackup';

/**
 * 계정 자동 보관에서 "올릴지, 그냥 둘지, 선생님께 물을지"를 정한다(화면·서버와 무관한 순수 계산).
 * 다른 기기에서 더 최근에 올린 기록은 말없이 덮어쓰지 않는다.
 */
export interface SyncRecord {
 /** 마지막으로 계정과 맞춘 기록 내용의 열쇠(올렸거나 가져온 것). */
 key:string|null;
 /** 그때 서버가 알려 준 마지막 저장 시각. 이것이 바뀌었으면 다른 기기가 올린 것이다. */
 serverAt:string|null;
 /** 선생님이 자동 보관을 껐는지. */
 off?:boolean;
 /** 선생님께 물었는데 '나중에'를 고른 서버 시각. 같은 서버 기록으로는 다시 묻지 않는다(자동 보관은 멈춘 채). */
 dismissedAt?:string|null;
}
export const EMPTY_SYNC:SyncRecord={key:null,serverAt:null};

export function parseSyncRecord(raw:unknown):SyncRecord{
 if(!raw||typeof raw!=='object')return EMPTY_SYNC;
 const r=raw as Record<string,unknown>,text=(v:unknown)=>typeof v==='string'?v:null;
 return {key:text(r.key),serverAt:text(r.serverAt),off:r.off===true||undefined,dismissedAt:text(r.dismissedAt)};
}

/** 짧은 문자열 지문(FNV-1a). 같은 내용이면 같은 값. */
function fingerprint(text:string):string{
 let h=0x811c9dc5;
 for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}
 return `${text.length.toString(36)}-${h.toString(36)}`;
}
/** 속성 순서와 무관한 JSON 글(서버 데이터베이스는 속성 순서를 바꿔 돌려준다). */
function stable(value:unknown):string{
 if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
 if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable((value as Record<string,unknown>)[k])}`).join(',')}}`;
 return JSON.stringify(value)??'null';
}
/** 기록 내용의 열쇠. 저장 시각과 지금 고른 반은 빼서, 반만 바꿔 봐도 다시 올리지 않는다. */
export function contentKey(backup:Pick<ClassBackup,'classes'>):string{
 return fingerprint(stable(backup.classes));
}
/** 반 하나에 기록이 하나도 없으면(새 기기) 올릴 것이 없다. */
export function isEmptyBackup(backup:Pick<ClassBackup,'classes'>):boolean{
 return backup.classes.length<=1&&backup.classes.every(c=>!c.progress.plays.length&&!c.progress.votes.length&&!c.progress.reasons.length&&!c.journey.length);
}

export type SyncDecision='same'|'upload'|'conflict'|'offer-load'|'skip-empty';
/**
 * local: 이 기기 기록의 열쇠, server: 계정에 있는 기록의 열쇠(없으면 null)와 저장 시각.
 * - 둘이 같으면 맞춰져 있다.
 * - 계정이 비어 있거나, 마지막으로 맞춘 뒤 다른 기기가 올린 적이 없으면 올린다.
 * - 다른 기기가 그 뒤에 다른 내용을 올렸으면 묻는다.
 * - 이 기기가 비어 있고 계정에 기록이 있으면 가져올지 묻는다(빈 기록으로 계정을 덮어쓰지 않는다).
 */
export function decideSync(rec:SyncRecord,local:{key:string;empty:boolean},server:{key:string|null;at:string|null}):SyncDecision{
 if(server.key===local.key)return 'same';
 if(local.empty)return server.key!==null&&server.key!==rec.key?'offer-load':'skip-empty';
 if(server.key===null)return 'upload';
 const someoneElse=server.at!==rec.serverAt&&server.key!==rec.key;
 return someoneElse?'conflict':'upload';
}
