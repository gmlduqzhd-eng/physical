/**
 * 대표 게임(sig-*) 레지스트리.
 *
 * ── 새 대표 게임 만드는 법 (개발자 안내) ────────────────────────────────
 * 1. 규칙·데이터: src/domain/signature/<id>.ts
 *    defineSignatureGame({...})로 정의를 내보낸다. 꼭 채울 것:
 *    - oneLine(한 문장 규칙), rules(무엇을/어떻게/언제 끝 3줄), concept(체육 개념), reflection, nextChallenge
 *    - scoringHint(선생님이 점수 주는 기준), seatedNote, demo(시범 자세 3~6장), timing(초)
 *    - cue(ctx) → {text,sub?,icon?,tone?,move?,pose?}
 *      같은 (phase, index, seed)면 늘 같은 신호를 돌려준다. 고르기는 pickCue(list, ctx)를 쓴다.
 *      ctx.phase가 'tutorial'이면 "지금 ○○해요!"처럼 한 단계씩 느리게 이끈다.
 *    - 선택: isComplete(state)는 목표를 이루면 일찍 끝낸다. resultHeadline(state)는 결과 제목을 바꾼다.
 *    점수·콤보·깜짝 이벤트·타이머는 엔진(funLoop)이 맡는다. 게임 파일은 신호와 판정 보조만 만든다.
 * 2. 화면 부품(선택): src/presentation/components/minigames/signature/modules/<id>.tsx
 *    SignatureModule을 내보낸다.
 *    - Panel: 큰 지시 아래 넣을 판(보스 HP·빙고판 등)
 *    - controls: 선생님 버튼 추가
 *    - Result: 결과 화면 추가 칸
 *    부품이 필요 없으면 비워 둔 모듈({})을 그대로 둔다.
 * 3. ready:true로 바꾼다. 그러면 목록, 검색, 지도안, /play/<id> 주소, 카탈로그 점검에 자동으로 들어간다.
 *    공용 파일(이 파일, gamesData, lessonGameCatalog, GamePlayPage)은 고칠 필요가 없다.
 * 4. 테스트: scripts/signature-<id>.test.ts에 신호가 결정적인지, 연습 판 안내, 앉아서 문구를 확인하고,
 *    package.json test:game-review 목록 끝에 넣는다.
 * ─────────────────────────────────────────────────────────────
 */
import type {GameDef} from './gamesData.js';
import type {LessonGameMeta} from '../data/lessonGameCatalog.js';
import type {SignatureGameDef} from './signature/types.js';
import {signalCaptain} from './signature/sig-signal-captain.js';
import {bossRaid} from './signature/sig-boss-raid.js';
import {moveBingo} from './signature/sig-move-bingo.js';
import {mirrorPair} from './signature/sig-mirror-pair.js';
import {memoryRelay} from './signature/sig-memory-relay.js';
import {stageShow} from './signature/sig-stage-show.js';

export type {SignatureGameDef,SignatureCue,SignatureCueContext,DemoFrame,Pose} from './signature/types.js';
export {defineSignatureGame,pickCue} from './signature/define.js';

/** 대표 게임 전체(추천 순서). ready:false인 게임은 아직 어디에도 나오지 않는다. */
export const SIGNATURE_GAMES:readonly SignatureGameDef[]=[signalCaptain,bossRaid,moveBingo,mirrorPair,memoryRelay,stageShow];
export const READY_SIGNATURE_GAMES=SIGNATURE_GAMES.filter(g=>g.ready);
export const READY_SIGNATURE_IDS:readonly string[]=READY_SIGNATURE_GAMES.map(g=>g.id);
const BY_ID=new Map<string,SignatureGameDef>(SIGNATURE_GAMES.map(g=>[g.id,g]));
/** 만든 대표 게임만 찾는다(만드는 중인 게임은 undefined). */
export const getSignatureGame=(id:string|undefined)=>{const g=id?BY_ID.get(id):undefined;return g?.ready?g:undefined;};
export const isSignatureId=(id:string|undefined)=>!!getSignatureGame(id);
/** 이 기존 게임을 규칙 카드로 품은 대표 게임(상세 화면 안내용). */
export const signatureFor=(gameId:string)=>READY_SIGNATURE_GAMES.find(g=>g.mergedFrom.includes(gameId));

const activityType=(g:SignatureGameDef):GameDef['activityType']=>g.teamsMin===1&&g.teamsDefault<=1?'개인':'모둠';
/** 활동 목록(GAMES)에 넣을 카드. */
export function signatureGameDef(g:SignatureGameDef):GameDef{
 return {
  type:g.id,name:g.name,emoji:g.emoji,desc:g.oneLine,
  color:'from-amber-500 to-rose-600',border:'border-amber-400/40',glow:'hover:shadow-amber-500/30',
  difficulty:2,domain:g.domain,subCategory:g.subCategory,achievement:{...g.achievement},
  grades:[...g.grades],activityType:activityType(g),durationMinutes:g.minutes,
  equipment:[...g.equipment],safetyTips:[...g.safetyTips],spaces:[...g.spaces],
  physicalActivity:true,devices:['데스크톱 PC','태블릿 PC','스마트폰'],playMode:'협동',
 };
}
export const SIGNATURE_GAME_DEFS:GameDef[]=READY_SIGNATURE_GAMES.map(signatureGameDef);

/** 지도안·활동 찾기 자료(LESSON_GAME_CATALOG)에 넣을 항목. */
export function signatureLessonMeta(g:SignatureGameDef):LessonGameMeta{
 return {
  id:g.id,title:g.name,emoji:g.emoji,route:'/play/'+g.id,description:g.oneLine,domain:g.domain,subCategory:g.subCategory,
  achievementCode:g.achievement.code,grades:[...g.grades],
  activityModes:['모둠','팀 대항','학급 전체'],
  space:[...g.spaces],deviceMode:['교사용 1대'],recommendedPlayers:{...g.players},intensity:g.intensity,
  movementSkills:[g.concept],learningKeywords:['대표 게임',g.concept,'팀 점수','TV 진행'],
  safetyNotes:[...g.safetyTips,g.seatedNote],teachingTips:[...g.rules,...g.teachingTips],
  noDeviceAlternative:`선생님이 신호를 말로 외치고 칠판에 팀 점수를 적으며 진행해요. ${g.rules[0]}`,
 };
}
