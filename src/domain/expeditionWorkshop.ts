import {z} from 'zod';
import {LOOP_PATTERNS,type ExpeditionSnapshot,type FlagshipId,type GroupProgress} from './flagship.js';

export const LEVELS=['easy','normal','challenge'] as const;
export type ExpeditionLevel=typeof LEVELS[number];
export const LEVEL_NAMES={easy:'쉬움',normal:'보통',challenge:'도전'};
// Virtual game parameters, never health, safety or physical ability standards.
export const LEVEL_RULES={
 easy:{radius:13,drag:.22,gain:26,speed:18,tolerance:240,quality:40,rescueRadius:14,shadowRadius:.24,shadowHits:5,shadowMs:850},
 normal:{radius:9,drag:.35,gain:32,speed:14,tolerance:180,quality:50,rescueRadius:9,shadowRadius:.18,shadowHits:6,shadowMs:650},
 challenge:{radius:6,drag:.5,gain:36,speed:10,tolerance:120,quality:70,rescueRadius:6,shadowRadius:.12,shadowHits:7,shadowMs:550},
} as const;
export const BOSS_ROUTES={
 balanced:['expedition-map','expedition-ship','expedition-loop'],
 rescue:['expedition-map','expedition-rescue','expedition-loop'],
 shadow:['expedition-map','expedition-ship','expedition-shadow'],
} as const satisfies Record<string,readonly FlagshipId[]>;
export const ROUTE_NAMES={balanced:'탐사 → 공동 운반 → 리듬 발전',rescue:'탐사 → 구조 작전 → 리듬 발전',shadow:'탐사 → 공동 운반 → 그림자 복원'};
export const MOVES=['손뼉','발 디딤','작은 팔 펼치기','앉아서 손 올리기'] as const;
export const SHIP_COURSES={orbit:[{x:25,y:25},{x:75,y:65},{x:50,y:30}],zigzag:[{x:25,y:65},{x:75,y:45},{x:30,y:25}]} as const;
export function groupRhythm(pattern:number[],index:number){const shift=index%8;return pattern.map((_,i)=>pattern[(i+shift)%8]);}
export function expeditionRhythm(s:ExpeditionSnapshot,index:number){return !s.workshop||s.workshop.version===0?LOOP_PATTERNS[index%4]:groupRhythm(settingsOf(s).rhythm,index);}
export const OBSERVATION_TAGS=['고른 역할 참여','역할 재안내 필요','신호 전달 원활','추가 연습 필요','작은 동작 대안 사용'] as const;
const binary=z.number().int().min(0).max(1);
export const workshopSchema=z.object({
 level:z.enum(LEVELS),members:z.number().int().min(2).max(6),roleEvery:z.number().int().min(1).max(5),
 packageMinutes:z.union([z.literal(10),z.literal(20),z.literal(40)]).nullable(),
 route:z.enum(['balanced','rescue','shadow']),shipCourse:z.enum(['orbit','zigzag']),
 stationOrder:z.enum(['auto','river-tower-forest','tower-forest-river']),
 rhythm:z.array(binary).length(8).refine(a=>a.filter(Boolean).length>=2&&a.filter(Boolean).length<=6),
 move:z.enum(MOVES),
}).strict();
export type WorkshopSettings=z.infer<typeof workshopSchema>;
export const DEFAULT_WORKSHOP:WorkshopSettings={level:'normal',members:4,roleEvery:2,packageMinutes:null,route:'balanced',shipCourse:'orbit',stationOrder:'auto',rhythm:[1,0,1,0,1,0,1,0],move:'손뼉'};
export type ReadinessState='ready'|'lost'|'manual'|'off'|'error';
export type DeviceReport={kind:'camera'|'tilt'|'touch';state:ReadinessState;at:number};
export type GroupWorkshop={level:ExpeditionLevel;members:number;roleRound:number;roleSwaps:number;roleAt:number;devices:DeviceReport[];contributions?:{game:FlagshipId;done:boolean;checkpoint:number;quality:number;swaps:number}[]};
export type WorkshopSnapshot={version?:0|1;settings:WorkshopSettings;lessonStep:number;lessonAt:number;observations:Record<string,string[]>};
export function settingsOf(s:ExpeditionSnapshot):WorkshopSettings{return s.workshop?.settings??DEFAULT_WORKSHOP;}
export function groupWorkshop(g:GroupProgress,s:ExpeditionSnapshot):GroupWorkshop{return g.workshop??{level:settingsOf(s).level,members:settingsOf(s).members,roleRound:0,roleSwaps:0,roleAt:s.startedAt,devices:[]};}
export function rulesOf(g:GroupProgress,s:ExpeditionSnapshot){return LEVEL_RULES[groupWorkshop(g,s).level];}
export const LESSON_PACKAGES={10:[1,2,5,2],20:[2,4,11,3],40:[4,7,24,5]} as const;
export const LESSON_STEPS=['도입·공간과 기기 확인','준비운동·조작 연습','모둠 원정·역할 교대','정리·함께 돌아보기'] as const;
export function roleSeats(members:number,round:number){
 const roles=members===2?['기기 조작·신호 전달','몸으로 탐사·참여 확인']:members===3?['기기 조작','몸으로 탐사','신호 전달·참여 확인']:['기기 조작','몸으로 탐사','신호 전달','참여 확인','길·박자 관찰','정리 안내'];
 return Array.from({length:members},(_,seat)=>({seat:seat+1,role:roles[(seat+round)%members]}));
}
export function readinessLabel(r:DeviceReport,now:number){return now-r.at>12000?'최근 신호 없음':({ready:'실제 신호 수신',lost:'신호 없음',manual:'보조 조작 선택',off:'꺼짐',error:'오류'})[r.state];}
export function expeditionReport(s:ExpeditionSnapshot){
 const stageNames:Record<FlagshipId,string>={'expedition-map':'비밀지도','expedition-ship':'공동 조종','expedition-loop':'리듬 발전','expedition-rescue':'구조 작전','expedition-shadow':'그림자 복원','expedition-boss':'보스 원정'};
 const rows=s.groups.map((g,i)=>{const w=groupWorkshop(g,s),detail=w.contributions?.map(c=>`${stageNames[c.game]} ${c.done?'참여 완료':'진행 중'}${c.game==='expedition-ship'?` ${c.checkpoint}정거장`:c.game==='expedition-loop'?` 입력 ${c.quality}%`:''}`).join(' / ')??(s.game==='expedition-ship'?`${g.ship.checkpoint}정거장`:s.game==='expedition-loop'?`리듬 입력 ${g.quality}%`:s.game==='expedition-map'?`공동 관문 ${s.phase}/3`:'모둠 수행 확인');return `모둠 ${i+1}: ${g.done?'원정 참여 완료':'진행 중'} / ${LEVEL_NAMES[w.level]} / 역할 교대 버튼 ${w.roleSwaps}회 / ${detail}${s.owner?` / 교사 관찰: ${(s.workshop?.observations[g.id]??[]).join(', ')||'미기록'}`:''}`;});
 return ['우리 반 원정 결과 · 교사 검토 초안',`완료 ${s.groups.filter(g=>g.done).length}/${s.groups.length}모둠`,...rows,'역할 교대는 버튼 기록이며 실제 모든 학생의 참여 증명이 아닙니다. 리듬은 입력 시점, 구조·그림자는 모둠의 확인 기록입니다. 개인별 운동 능력이나 성취수준을 추정하지 않습니다.'].join('\n');
}
