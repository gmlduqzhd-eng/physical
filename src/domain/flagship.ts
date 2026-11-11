import type {GameDef} from './gamesData.js';
import type {LessonGameMeta} from '../data/lessonGameCatalog.js';
import type {GroupWorkshop,WorkshopSnapshot} from './expeditionWorkshop.js';

export const FLAGSHIP_IDS=['expedition-map','expedition-ship','expedition-loop','expedition-rescue','expedition-shadow','expedition-boss'] as const;
export type FlagshipId=typeof FLAGSHIP_IDS[number];
export const isFlagship=(id:string):id is FlagshipId=>(FLAGSHIP_IDS as readonly string[]).includes(id);
export const STATIONS=['forest','river','tower'] as const;
export const STATION_NAMES={forest:'숲',river:'강',tower:'탑'};
export const FLAGSHIPS=[
 {id:FLAGSHIP_IDS[0],name:'움직이는 비밀지도',emoji:'🗺️',desc:'서로 다른 단서를 모아 길을 정하고, 실제 탐사 지점에서 돌아와 원정대 기지를 열어요.',device:'모둠별 1대 · 지점 QR 3장',skill:'공간 탐색·몸짓 전달',minutes:12},
 {id:FLAGSHIP_IDS[1],name:'모둠 중력 우주선',emoji:'🛸',desc:'두 기기의 기울기를 합쳐 우주선을 세 정거장으로 보내요. 한쪽의 조작은 다른 쪽에도 영향을 줘요.',device:'모둠별 센서 기기 2대',skill:'양손 협응·기울기 조절',minutes:8},
 {id:FLAGSHIP_IDS[2],name:'바디루프 발전소',emoji:'🥁',desc:'몸으로 만든 박자를 입력해 모둠의 반복 리듬을 쌓고 우리 반의 발전 도시를 완성해요.',device:'모둠별 1대 · 스피커 선택',skill:'리듬·좌우 협응',minutes:8},
 {id:FLAGSHIP_IDS[3],name:'몸으로 조준하는 바람 구조대',emoji:'🪂',desc:'팔의 각도와 발사 타이밍을 조절해 바람 속 구조 캡슐을 세 목표에 보내요.',device:'거치 카메라 1대 · 터치 연습 가능',skill:'팔 방향·타이밍 조절',minutes:8},
 {id:FLAGSHIP_IDS[4],name:'시간차 그림자 연구소',emoji:'🪞',desc:'내 손목의 움직임을 선으로 남기고, 시간차·좌우 반전 그림자를 몸으로 따라가요.',device:'거치 카메라 1대 · 터치 연습 가능',skill:'움직임 기억·표현',minutes:8},
 {id:FLAGSHIP_IDS[5],name:'우리 반 보스 원정',emoji:'🏰',desc:'비밀지도·공동 조종·리듬 발전을 연결해 모든 모둠의 힘으로 세 관문을 열어요.',device:'모둠별 1~2대 · 공용 화면 선택',skill:'협동 전략·역할 교대',minutes:24},
] as const;
export const FLAGSHIP_SAFETY=['교사가 정한 개인 공간과 탐사 동선을 먼저 확인해요. 이동은 걷고 화면 조작·스캔은 멈춰서 해요.','기기를 던지거나 들고 뛰지 않아요. 카메라 기기는 넘어지지 않도록 거치해요.','불편하면 즉시 멈추고 선생님께 알려요. 앉은 자세·작은 팔 동작으로 참여할 수 있어요.'];
export const FLAGSHIP_GAMES:GameDef[]=FLAGSHIPS.map(g=>({type:g.id,name:g.name,emoji:g.emoji,desc:g.desc,color:'from-emerald-700 to-teal-600',border:'border-emerald-300',glow:'',difficulty:2,domain:g.id==='expedition-loop'||g.id==='expedition-shadow'?'표현':'운동',subCategory:'대표 협동 원정',achievement:{code:'연계 확인 필요',title:g.skill,desc:'공식 성취기준 연계와 실제 공간의 적합성은 교사가 확인합니다.'},grades:['3~4학년군','5~6학년군'],activityType:'모둠',durationMinutes:g.minutes,equipment:[g.device],safetyTips:[...FLAGSHIP_SAFETY],physicalActivity:true,devices:['스마트폰','태블릿 PC','데스크톱 PC'],playMode:'협동'}));
export const FLAGSHIP_LESSONS:LessonGameMeta[]=FLAGSHIP_GAMES.map(g=>({id:g.type,title:g.name,emoji:g.emoji,route:'/play/'+g.type,description:g.desc,domain:g.domain,subCategory:g.subCategory,achievementCode:g.achievement.code,grades:g.grades,activityModes:['모둠','학급 전체'],space:['교실','체육관','다목적실'],deviceMode:['모둠별 1대'],recommendedPlayers:{min:2,max:6},intensity:'낮음',movementSkills:[g.achievement.title],learningKeywords:['대표 원정','협동','역할 교대'],safetyNotes:[...FLAGSHIP_SAFETY],teachingTips:['수업방에서 교사가 원정을 열고 학생은 자기 모둠으로 참여합니다.','1분 또는 한 라운드마다 조작·관찰·전달 역할을 바꿔요.'],noDeviceAlternative:'단서 카드·몸짓 전달과 짝 따라 하기로 연습할 수 있어요. 공동 화면 상태와 자동 판정은 제공되지 않아요.'}));

export type Station=typeof STATIONS[number];
export function mapOrder(seed:number):Station[]{return seed%2===0?['river','tower','forest']:['tower','forest','river'];}
export function groupClue(index:number,seed:number){const order=mapOrder(seed);return [`첫 길은 ${STATION_NAMES[order[0]]}이에요. 몸짓으로 전달해요.`,`마지막 길은 ${STATION_NAMES[order[2]]}이에요. 나머지 길을 함께 추리해요.`,`세 지점은 한 번씩만 지나가요. 앞뒤 단서를 모아 가운데 길을 정해요.`][index%3];}
export const SHIP_TARGETS=[{x:25,y:25},{x:75,y:65},{x:50,y:30}];
export interface ShipState{x:number;y:number;vx:number;vy:number;checkpoint:number;bumps:number}
export const initialShip=():ShipState=>({x:50,y:80,vx:0,vy:0,checkpoint:0,bumps:0});
export function shipStep(s:ShipState,x:number,y:number,ms:number,tuning={radius:9,drag:.35,gain:32,speed:14},targets:readonly {x:number;y:number}[]=SHIP_TARGETS):ShipState{
 const dt=Math.min(0.5,Math.max(0,ms/1000));const vx=(s.vx+Math.max(-1,Math.min(1,x))*tuning.gain*dt)*Math.pow(tuning.drag,dt),vy=(s.vy+Math.max(-1,Math.min(1,y))*tuning.gain*dt)*Math.pow(tuning.drag,dt);
 const nx=s.x+vx*dt,ny=s.y+vy*dt,bump=nx<5||nx>95||ny<5||ny>95;const p={...s,x:Math.max(5,Math.min(95,nx)),y:Math.max(5,Math.min(95,ny)),vx:bump?-vx*.3:vx,vy:bump?-vy*.3:vy,bumps:s.bumps+(bump?1:0)};
 const target=targets[s.checkpoint];if(target&&Math.hypot(p.x-target.x,p.y-target.y)<tuning.radius&&Math.hypot(vx,vy)<tuning.speed)p.checkpoint++;return p;
}
export const LOOP_PATTERNS=[[1,0,1,0,1,0,1,0],[0,1,0,1,0,1,0,1],[1,0,0,1,0,0,1,0],[1,1,0,0,1,1,0,0]];
export function rhythmScore(taps:number[],pattern:number[],beatMs=600,tolerance=beatMs*.3){
 const used=new Set<number>();let hits=0,totalError=0;
 for(const t of taps){if(!Number.isFinite(t)||t<0||t>=beatMs*8)continue;const beat=Math.round(t/beatMs);if(beat<8&&pattern[beat]&&!used.has(beat)&&Math.abs(t-beat*beatMs)<=tolerance){used.add(beat);hits++;totalError+=Math.abs(t-beat*beatMs);}}
 const expected=pattern.filter(Boolean).length;return {hits,expected,misses:Math.max(0,taps.length-hits),accuracy:Math.max(0,Math.round((hits-Math.max(0,taps.length-hits)*.25)/expected*100)),meanError:hits?Math.round(totalError/hits):0};
}
export function trajectory(angle:number,power:number,wind:number){
 const rad=angle*Math.PI/180,v=18+power*.28;const points=[];
 for(let t=0;t<=8;t+=.04){const x=5+Math.cos(rad)*v*t+.5*wind*t*t,y=8+Math.sin(rad)*v*t-5*t*t;points.push({x,y});if(t>.04&&y<=0)break;}return points;
}
export const RESCUE_ROUNDS=[{target:50,wind:0},{target:70,wind:-2},{target:85,wind:2}];
export function rescueHit(angle:number,power:number,round:number,radius=9){const r=RESCUE_ROUNDS[round];if(!r||!Number.isFinite(angle)||!Number.isFinite(power))return false;const points=trajectory(angle,power,r.wind),end=points[points.length-1];return Math.abs(end.x-r.target)<=radius;}
export type PosePoint={x:number;y:number;visibility?:number};
export function armInput(points:PosePoint[]){
 const shoulder=points[12],wrist=points[16];if(!shoulder||!wrist||![shoulder.x,shoulder.y,wrist.x,wrist.y].every(Number.isFinite)||(shoulder.visibility??0)<.65||(wrist.visibility??0)<.65||Math.hypot(wrist.x-shoulder.x,wrist.y-shoulder.y)<.08)return null;
 return {angle:Math.max(15,Math.min(80,Math.atan2(shoulder.y-wrist.y,Math.abs(wrist.x-shoulder.x))*180/Math.PI)),x:Math.max(0,Math.min(1,1-wrist.x)),y:Math.max(0,Math.min(1,wrist.y))};
}
export function shadowDistance(a:{x:number;y:number},b:{x:number;y:number},mirror:boolean){return Math.hypot(a.x-(mirror?1-b.x:b.x),a.y-b.y);}

export type GroupProgress={id:string;name:string;visited:Station[];vote:string|null;done:boolean;ship:ShipState;axes:{value:number;at:number;claimed:boolean;mine:boolean}[];loop:number[];quality:number;mode:string;exchange?:{checkpoint:number;pending:boolean;mine:boolean;readyCount:number;swapped:boolean}|null;workshop?:GroupWorkshop};
export type ExpeditionSnapshot={runId:string;game:FlagshipId;seed:number;phase:number;status:string;revision:number;serverTime:number;startedAt:number;event:string;groups:GroupProgress[];clue:string|null;codes?:Record<Station,string>;owner:boolean;groupId:string|null;workshop?:WorkshopSnapshot};
