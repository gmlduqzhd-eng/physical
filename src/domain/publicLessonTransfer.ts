import {z} from 'zod';
// Explicit enum allowlist. No AI draft, notes, counts, room, student or auth data.
export const publicLessonSchema=z.object({v:z.literal(1),activityId:z.string().regex(/^[a-z0-9-]{1,80}$/),grade:z.enum(['1~2학년','3~4학년군','5~6학년군']),goal:z.enum(['협동과 소통','기본 움직임','체력 기르기','전략과 문제 해결','리듬과 표현','즐거운 참여']),place:z.enum(['교실','체육관','운동장','다목적실','좁은 실내 공간']),device:z.enum(['스마트폰','태블릿 PC','데스크톱 PC']),minutes:z.number().int().min(15).max(90)}).strict();
export type PublicLessonTransfer=z.infer<typeof publicLessonSchema>;
export function lessonTransferLink(origin:string,input:PublicLessonTransfer){const data=publicLessonSchema.parse(input);return `${origin}/teacher/setup#lesson=${encodeURIComponent(JSON.stringify(data))}`;}
export function parseLessonTransfer(hash:string){try{if(!hash.startsWith('#lesson=')||hash.length>2500)return null;const parsed=publicLessonSchema.safeParse(JSON.parse(decodeURIComponent(hash.slice(8))));return parsed.success?parsed.data:null;}catch{return null;}}
const returnKey='physical_teacher_public_setup_v1';
const returnSchema=z.object({expiresAt:z.number().finite(),lesson:publicLessonSchema.nullable(),packageMinutes:z.union([z.literal(10),z.literal(20),z.literal(40)]).nullable(),game:z.string().regex(/^[a-z0-9-]{1,80}$/).nullable()}).strict();
// Preserve public setup only across an explicit Google login, for ten minutes.
// Auth tokens and arbitrary return URLs are never accepted in this record.
export function savePublicSetupReturn(){
 try{sessionStorage.removeItem(returnKey);if(location.pathname!=='/teacher/setup')return;
  const params=new URLSearchParams(location.search),n=Number(params.get('package')),game=params.get('game');
  const data=returnSchema.parse({expiresAt:Date.now()+600000,lesson:parseLessonTransfer(location.hash),packageMinutes:[10,20,40].includes(n)?n:null,game:game&&/^[a-z0-9-]{1,80}$/.test(game)?game:null});
  if(data.lesson||data.packageMinutes||data.game)sessionStorage.setItem(returnKey,JSON.stringify(data));
 }catch{/* No public condition persistence when browser storage is unavailable. */}
}
export function takePublicSetupReturn(){
 try{const raw=sessionStorage.getItem(returnKey);sessionStorage.removeItem(returnKey);if(!raw||raw.length>4000)return null;const r=returnSchema.safeParse(JSON.parse(raw));if(!r.success||r.data.expiresAt<Date.now()||r.data.expiresAt>Date.now()+600000)return null;
  const {lesson,packageMinutes,game}=r.data;if(lesson)return lessonTransferLink(location.origin,lesson).replace(location.origin,'');
  const params=new URLSearchParams();if(packageMinutes)params.set('package',String(packageMinutes));if(game)params.set('game',game);return params.size?'/teacher/setup?'+params.toString():null;
 }catch{return null;}
}
