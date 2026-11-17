import type {GameDef} from '../domain/gamesData';
import {PHONE_PLAY_BY_ID} from '../domain/phonePlayCatalog';
import {QUEST_META,isQuestId} from '../domain/movementQuests';
import {EXPEDITION_BY_ID} from '../domain/expeditionGames';
import {SAFETY_LESSONS,isSafetyLessonId} from '../domain/safetyLessons';
import {lessonMeta} from '../domain/activityFit';
import {EXPRESSION_GAMES} from './components/minigames/expression/expressionGamesData';

/**
 * 활동 상세 패널의 고정 순서: 규칙 3줄 / 준비 / 안전 / 쉽게·어렵게·앉아서.
 * 활동 종류마다 자료가 다른 곳에 있어 여기서 한 모양으로 모은다. 같은 문장은 한 번만 보여 준다.
 */
export interface ActivityDetail {rules:string[];prepare:string[];safety:string[];adapt:{label:'쉽게'|'어렵게'|'앉아서';text:string}[]}
const EXPRESSION_BY_ID=new Map(EXPRESSION_GAMES.map(g=>[g.id,g]));
const sentences=(text:string)=>text.split(/(?<=[.!?요다])\s+/).map(s=>s.trim()).filter(Boolean);

/** 카드의 '이렇게 하면 끝나요' 한 줄. 활동 자료에 있는 과제·작전·단계·라운드 수로 만든다. */
export function finishLine(game:GameDef):string{
 const phone=PHONE_PLAY_BY_ID.get(game.type),exp=EXPEDITION_BY_ID.get(game.type),expression=EXPRESSION_BY_ID.get(game.type);
 if(phone)return `과제 ${phone.rounds.length}개를 차례로 마치면 끝나요. 첫 과제: ${phone.rounds[0]}`;
 if(isQuestId(game.type))return '작전 3개를 차례로 마치면 끝나요.';
 if(game.type==='partner-robot-lab')return '역할을 바꿔 가며 로봇 미션 4개를 해내면 끝나요.';
 if(isSafetyLessonId(game.type))return `상황 ${SAFETY_LESSONS[game.type].scenarios.length}개를 판단하고 몸으로 연습하면 끝나요.`;
 const steps=expression?.steps.length??exp?.expressionSteps?.length;
 if(steps)return `표현 ${steps}단계를 차례로 이어 하면 끝나요.`;
 if(exp)return `${exp.rounds}라운드를 마치고 기록하면 끝나요.`;
 if(game.type.startsWith('expedition-'))return `모둠이 함께 원정을 마치면 끝나요. 약 ${game.durationMinutes??10}분이에요.`;
 return `약 ${game.durationMinutes??5}분 활동을 마치고 결과 화면에서 확인하면 끝나요.`;
}
const CACHE=new Map<string,ActivityDetail>();
export function activityDetail(game:GameDef):ActivityDetail{
 const cached=CACHE.get(game.type);if(cached)return cached;
 const phone=PHONE_PLAY_BY_ID.get(game.type),quest=isQuestId(game.type)?QUEST_META[game.type]:undefined,exp=EXPEDITION_BY_ID.get(game.type),expression=EXPRESSION_BY_ID.get(game.type),lesson=lessonMeta(game.type);
 const safetyLesson=isSafetyLessonId(game.type)?SAFETY_LESSONS[game.type]:undefined;
 const rules=phone?.rules
  ??quest?.rules
  ??(expression?expression.steps.map(s=>`${s.stepNum}단계 · ${s.title}`):undefined)
  ??(exp?.expressionSteps?.length?exp.expressionSteps.map((s,i)=>`${i+1}단계 · ${s.title}`):undefined)
  ??(safetyLesson?safetyLesson.scenarios.map((s,i)=>`상황 ${i+1} · ${s.title}`):undefined)
  ??sentences(game.desc);
 const seated=phone?.seated??quest?.alternative??exp?.alternative;
 const adapt:ActivityDetail['adapt']=[
  ...(phone?[{label:'쉽게' as const,text:phone.easy},{label:'어렵게' as const,text:phone.hard}]:[]),
  ...(seated?[{label:'앉아서' as const,text:seated}]:[]),
 ];
 const notSeated=(s:string)=>!seated||(s!==seated&&!s.includes(seated));
 const safety=[...new Set([...(game.safetyTips??[]),...(exp?.safety?[exp.safety]:[]),...(lesson?.safetyNotes??[])])].filter(notSeated);
 const detail={rules:rules.slice(0,3),prepare:game.equipment?.length?game.equipment:lesson?.space.length?[`장소: ${lesson.space.join('·')}`]:[],safety,adapt};
 CACHE.set(game.type,detail);return detail;
}
