import type { GameDef } from './gamesData.js';
import type { LessonGameMeta } from '../data/lessonGameCatalog.js';
import { EXPEDITION_GAMES, type ExpeditionSpec } from './expeditionGames.js';

export function expeditionGameDef(game: ExpeditionSpec): GameDef {
  return {
    type: game.id, name: game.name, desc: game.desc, emoji: '🧭',recommendedDevice:game.recommendedDevice,
    color: 'from-emerald-600 to-teal-700', border: 'border-emerald-500/40', glow: 'hover:shadow-emerald-500/30',
    difficulty: 2, domain: game.kind === 'A' || game.family === 'rhythm' ? '표현' : game.family === 'equipment' ? '스포츠' : '운동',
    subCategory: '몸으로 참여하는 원정 활동',
    achievement: { code: '연계 확인 필요', title: '신체 활동과 협동', desc: '공식 성취기준 연계는 교사 확인이 필요합니다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    activityType: game.players > 2 ? '모둠' : game.players === 2 ? '짝' : '개인',
    durationMinutes: game.kind === 'A' ? Math.ceil(game.expressionSteps!.reduce((sum,s)=>sum+s.seconds,0)/60) : 4,
    equipment: game.equipment, safetyTips: [game.safety, game.alternative], physicalActivity: true,
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'], playMode: game.players > 1 ? '협동' : '개인',
  };
}
export const EXPEDITION_B_GAME_DEFS = EXPEDITION_GAMES.filter(game=>game.kind==='B').map(expeditionGameDef);
export const EXPEDITION_LESSON_CATALOG: LessonGameMeta[] = EXPEDITION_GAMES.map(game=>{
  const meta=expeditionGameDef(game);
  return { id:game.id,title:game.name,emoji:'🧭',route:'/play/'+game.id,description:game.desc,
    domain:meta.domain,subCategory:meta.subCategory,achievementCode:'연계 확인 필요',grades:meta.grades,
    activityModes: game.players>2 ? ['모둠'] : game.players===2 ? ['짝'] : ['개인'],
    space:['체육관','운동장','다목적실'],deviceMode:[game.players>1?'모둠별 1대':'학생 1인 1기기'],
    recommendedPlayers:{min:game.players,max:game.players>2?4:game.players},intensity:'보통',
    movementSkills:[game.desc],learningKeywords:[game.family==='rhythm'?'리듬':'이동',game.players>1?'협동':'자기 조절'],
    safetyNotes:[game.safety],teachingTips:[game.space,'기기를 거치하고 라운드가 끝난 뒤 기록합니다.'],noDeviceAlternative:game.alternative };
});
