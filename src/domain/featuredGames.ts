import {AVAILABLE_GAMES,type GameDef} from './gamesData.js';

/**
 * 대표 게임(2026-11 큐레이션). 선생님이 처음 보는 목록이다. 나머지 활동은 지우지 않고 '보관함'에 둔다.
 * 고른 기준: 규칙이 한 문장이다 · 성공하거나 이기는 순간이 있다 · 많이 움직인다 · 다시 하고 싶다.
 * 근거: 2026-11 직관성 점검 점수(2점 이하 약 50개는 빼고), 비슷한 활동 묶음(SIMILAR_GROUPS)에서는 대표 하나만.
 * 순서가 곧 추천 순서다. 대표 게임 6개(sig-*)는 맨 앞에 두고, 아직 없는 id는 isFeatured에서 무시한다.
 */
export const FEATURED_GAME_IDS:readonly string[]=[
 // 대표 게임: 재미 뼈대(팀 점수·깜짝 이벤트·결과 발표)를 쓰는 새 게임
 'sig-signal-captain', // 신호 대장: 신호 규칙 카드로 바로 이해, 팀 점수로 긴장감
 'sig-boss-raid', // 우리 반 보스전: 반 전체가 한 목표, 보스 HP가 줄어드는 재미
 'sig-move-bingo', // 몸 빙고: 칸 차지와 빙고 순간이 분명함
 'sig-mirror-pair', // 거울 짝꿍: 짝과 함께, '하나 바꾸기' 깜짝 찾기
 'sig-memory-relay', // 기억 릴레이: 하나씩 늘어나는 도전, 모둠 협동
 'sig-stage-show', // 표현 무대: 장면 카드 뽑기와 관객 반응
 // 반 전체 · 준비물 없음 (익숙한 전래 놀이가 가장 설명이 짧다)
 'phone-play-102', // 여우야 몇 시니: 모두 아는 놀이, '밥 먹을 시간'의 긴장
 'phone-play-103', // 걷기 술래 얼음땡: 술래잡기의 재미를 걷기로 안전하게
 'phone-play-104', // 가위바위보 진화 산책: 진화 사다리로 계속 다시 하고 싶음
 'phone-play-106', // 네 구석 운동 뽑기: 뽑기의 두근거림, 활동량 많음
 'phone-play-066', // 몸짓 전달 놀이: 몸으로 하는 말 전달, 끝에 비교하는 웃음
 'phone-play-010', // 얼음 자세 이어받기: 모둠이 이어 가는 얼음 자세, 규칙 한 줄
 'phone-play-031', // 하나씩 더하는 몸 합주: 한 명씩 더해 커지는 합주, 끝이 분명함
 'phone-play-036', // 말 없는 지휘자: 지휘자를 따라 크게·작게, 역할 바꾸기
 'phone-play-035', // 보이지 않는 물건 돌려주기: 점검 4점, 짝 표현이 바로 이해됨
 'phone-play-093', // 점점 작아지는 팔 물결: 정리 운동으로 쓰기 좋은 반 전체 물결
 // 대표 원정과 원정 게임
 'expedition-map', // 움직이는 비밀지도: 걸어 다니며 단서를 모으는 대표 원정
 'expedition-loop', // 바디루프 발전소: 리듬을 맞추면 관문이 열리는 협동
 'exp-phone-03', // 거꾸로 옆걸음: 반대로 움직이는 한 줄 규칙, 웃음이 많음
 'exp-phone-10', // 정글 걸음 탐험: 지형마다 걸음이 바뀌는 1~2학년 이동 놀이
 'exp-tablet-02', // 몸으로 모양 만들기: 모둠이 모양을 완성하는 순간이 분명함
 'exp-tablet-01', // 우리 자리 찾기: 점검 4점, 표식 찾기가 직관적
 'exp-tablet-31', // 천 위 화물 공동배송: 다 함께 천을 드는 협동 도전
 'exp-tablet-34', // 징검다리 옮기기: 고전 모둠 도전, 성공 조건이 분명함
 'exp-tablet-37', // 색깔 택배 분류: 색 맞춰 나르는 릴레이, 활동량 많음
 'exp-phone-32', // 벽 반사 우편배달: 점검 4점, 던지고 받는 기능 연습
 'exp-phone-37', // 배구 한 걸음 리시브: 배구로 이어지는 짝 기능 연습
 // 공·콩주머니 정거장과 체력 (종목 수업과 연결)
 'target', // 콩주머니 표적 던지기: 맞히는 순간이 분명한 표적형
 'relay-mission-runner', // 콩주머니 걷기 릴레이: 모둠 이어달리기의 재미
 'pass-gate-rescue', // 공 굴리고 빈자리로: 영역형 경기의 빈 곳 찾기
 'dribble-rhythm', // 박자 맞춰 공 튀기기: 농구 드리블로 이어지는 리듬 연습
 'sound-goalball', // 소리 듣고 공 굴리기: 모두 함께하는 통합 체육
 'zigzag', // 막힌 길 피해 가기: 지도 보고 길 찾기, 다시 하고 싶음
 'shuttle-run-beep', // 삑 소리 맞춰 왕복 걷기: 체력 기록이 남는 왕복
 'partner-robot-lab', // 파트너 로봇 연구소: 몸으로 하는 코딩, 역할 바꾸기
 // 표현
 'musical_freeze', // 소리 멈추면 얼음 연극: 얼음 순간이 분명한 대표 표현 놀이
 'seed_sprout', // 씨앗의 성장: 점검 4점, 1~2학년 표현의 첫 활동
 'weather_dance', // 날씨 탐험대: 소리에 맞춰 바뀌는 날씨 몸짓
 'cheerleading_team', // 파워 치어리딩 루틴: 그림 카드로 따라 하기 쉬운 모둠 루틴
 'ganggangsullae', // 달맞이 강강술래: 반 전체 전통 놀이, 대형 그림
 'taebo_fitness', // 허공 펀치 체조: 신나는 체력 표현, 따라 하기 쉬움
 // 안전 (한 가지만)
 'cpr-compression-110', // 심폐소생 안전교실: 꼭 배워야 할 안전, 두 번 누르면 끝
];

/**
 * 대표 게임으로 합쳐진 기존 활동 → 대표 게임 id.
 * 대표 게임 레지스트리(signatureGames)의 mergedFrom과 같은 내용이다. 그 게임이 있을 때만 상세 화면에 연결을 보여 준다.
 */
export const MERGED_INTO:Readonly<Record<string,string>>={
 'phone-play-001':'sig-signal-captain','phone-play-011':'sig-signal-captain',red_green:'sig-signal-captain','phone-play-101':'sig-signal-captain','exp-tablet-06':'sig-signal-captain',
 'expedition-boss':'sig-boss-raid',fitness:'sig-boss-raid',jump:'sig-boss-raid',squat:'sig-boss-raid',
 'phone-play-105':'sig-move-bingo',
 'exp-phone-49':'sig-mirror-pair',shadow_puppeteer:'sig-mirror-pair','phone-play-028':'sig-mirror-pair',
 'phone-play-006':'sig-memory-relay','phone-play-014':'sig-memory-relay','phone-play-015':'sig-memory-relay','phone-play-019':'sig-memory-relay','phone-play-044':'sig-memory-relay',memory:'sig-memory-relay','exp-phone-05':'sig-memory-relay','exp-phone-45':'sig-memory-relay',
 'phone-play-029':'sig-stage-show','phone-play-032':'sig-stage-show',story_drama_relay:'sig-stage-show',musical_scene_maker:'sig-stage-show',
};

const BY_ID=new Map(AVAILABLE_GAMES.map(game=>[game.type,game] as const));
/** 지금 쓸 수 있는 대표 게임만, 추천 순서대로. */
export const FEATURED_GAMES:GameDef[]=FEATURED_GAME_IDS.flatMap(id=>{const game=BY_ID.get(id);return game?[game]:[];});
const FEATURED=new Set(FEATURED_GAMES.map(game=>game.type));
export const isFeatured=(id:string)=>FEATURED.has(id);
const RANK=new Map(FEATURED_GAMES.map((game,i)=>[game.type,i] as const));
/** 대표 게임을 추천 순서대로 앞에, 보관함 활동은 원래 순서대로 뒤에 둔다. */
export function featuredFirst<T extends {type:string}>(games:readonly T[]):T[]{
 return games.map((game,i)=>({game,i})).sort((a,b)=>(RANK.get(a.game.type)??FEATURED.size+a.i)-(RANK.get(b.game.type)??FEATURED.size+b.i)).map(x=>x.game);
}
/** 이 활동이 합쳐진 대표 게임(그 게임이 있을 때만). */
export const mergedInto=(id:string):GameDef|undefined=>{const target=MERGED_INTO[id];return target?BY_ID.get(target):undefined;};
/** 활동 목록이 고르는 범위: 대표 게임만, 또는 보관함까지(보관함 보기·검색어·준비물 없는 놀이 모음일 때). */
export const includesArchive=(view:{viewAll:boolean;query:string;phoneOnly:boolean})=>view.viewAll||!!view.query.trim()||view.phoneOnly;
export const hubPool=(view:{viewAll:boolean;query:string;phoneOnly:boolean}):GameDef[]=>includesArchive(view)?AVAILABLE_GAMES:FEATURED_GAMES;
/** 머리말: 지금 목록이 보여 주는 것과 같은 말을 한다(대표 게임만 / 보관함까지). */
export function libraryLead(solo:boolean,viewAll:boolean,soloCount:number):string{
 if(solo)return `학생 정보 입력 없이, 혼자 할 수 있는 ${soloCount}개 활동이에요.`;
 return viewAll?`대표 게임 ${FEATURED_GAMES.length}개와 보관함 ${AVAILABLE_GAMES.length-FEATURED_GAMES.length}개, 모든 활동 ${AVAILABLE_GAMES.length}개를 보여 줘요. 대표 게임이 먼저 나와요.`:`먼저 해 보기 좋은 대표 게임 ${FEATURED_GAMES.length}개를 보여 줘요. 나머지 ${AVAILABLE_GAMES.length-FEATURED_GAMES.length}개는 보관함에 있어요.`;
}
