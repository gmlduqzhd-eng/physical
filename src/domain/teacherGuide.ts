import {ALL_STANDARDS,LOW_GRADE_THEMES,findStandards,type CurriculumStandard} from '../data/curriculumStandards';
import {LESSON_GAME_CATALOG} from '../data/lessonGameCatalog';
import type {GameDef} from './gamesData';
import {pickStandards,standardScore} from './lessonPlan';
import {PHONE_PLAY_BY_ID} from './phonePlayCatalog';
import {PENDING_CURRICULUM_CODE} from './curriculumCode';
import {getSignatureGame} from './signatureGames';

/**
 * 활동마다 보여 주는 '선생님 안내': 교육과정 연결, 발문, 활용 팁.
 * 활동 자료에 성취기준이 적혀 있으면 그대로 쓰고('활동 자료'), 없으면 활동 영역·설명으로 가까운 기준을 고른다('추천 · 교사 확인').
 * 추천 기준은 수업 전에 교사가 원문을 보고 확인해야 한다. 1~2학년은 체육 교과가 없어 즐거운 생활 연계 주제를 보여 준다.
 */
export interface GuideStandards {grade:'3~4학년군'|'5~6학년군';source:'data'|'suggested';standards:CurriculumStandard[]}
export interface TeacherGuide {standards:GuideStandards[];lowGradeTheme:string|null;questions:string[];tips:string[]}

const QUESTIONS:Record<GameDef['domain'],string[]>={
 운동:['어떤 방법으로 하니 몸에 무리가 덜 갔나요?','처음과 마지막에 신체 느낌이 어떻게 달랐나요?'],
 스포츠:['우리 모둠이 다음에 바꿔 볼 작전은 무엇인가요?','규칙을 지키려고 어떤 약속이 필요했나요?'],
 표현:['친구의 움직임에서 어떤 느낌을 받았나요?','움직임의 크기나 빠르기를 바꾸니 느낌이 어떻게 달라졌나요?'],
};
/** 활동 설명에 맞는 낱말이 없을 때 쓰는 영역별 기본 성취기준(체력 측정처럼 활동과 먼 기준이 붙지 않게). */
const DEFAULT_CODES:Record<GameDef['domain'],Record<'3~4학년군'|'5~6학년군',string[]>>={
 운동:{'3~4학년군':['[4체01-02]','[4체01-06]'],'5~6학년군':['[6체01-05]','[6체01-01]']},
 스포츠:{'3~4학년군':['[4체02-04]','[4체02-09]'],'5~6학년군':['[6체02-10]','[6체02-06]']},
 표현:{'3~4학년군':['[4체03-01]','[4체03-04]'],'5~6학년군':['[6체03-05]','[6체03-06]']},
};
/** 활동마다 따로 둔 발문(일반 발문보다 먼저 쓴다). */
const OWN_QUESTIONS:Record<string,string[]>={
 'partner-robot-lab':['로봇이 어느 블록에서 헷갈렸나요? 어떻게 고쳤나요?','반복 블록을 쓰니 프로그램이 어떻게 달라졌나요?'],
};
const SAFETY_QUESTION='안전하게 하려고 내가 지킨 약속은 무엇인가요?';

function lowGradeTheme(game:GameDef):string{
 const text=`${game.name} ${game.desc} ${game.subCategory}`;
 const byKeyword=LOW_GRADE_THEMES.find(t=>t.keywords.some(k=>text.includes(k)));
 if(byKeyword)return byKeyword.theme;
 return game.domain==='표현'?'느낌과 생각을 몸으로 표현하기':game.domain==='스포츠'?'친구와 함께하기':'기본 움직임 탐색';
}

/** 활동 카드를 그릴 때마다 다시 계산하지 않도록 활동별로 기억해 둔다. */
const CACHE=new Map<string,TeacherGuide>();
export function teacherGuide(game:GameDef):TeacherGuide{
 const cached=CACHE.get(game.type);if(cached)return cached;
 const guide=buildGuide(game);CACHE.set(game.type,guide);return guide;
}
function buildGuide(game:GameDef):TeacherGuide{
 const lesson=LESSON_GAME_CATALOG.find(l=>l.id===game.type);
 const code=game.achievement.code;
 const standards:GuideStandards[]=(['3~4학년군','5~6학년군'] as const).filter(g=>game.grades.includes(g)).map(grade=>{
  const own=ALL_STANDARDS.find(s=>s.code===code&&s.gradeGroup===grade);
  if(own&&code!==PENDING_CURRICULUM_CODE)return {grade,source:'data',standards:[own]};
  const pool=findStandards(grade,game.domain);
  const matched=lesson?pool.filter(st=>standardScore(st,lesson)>0):[];
  return {grade,source:'suggested',standards:matched.length?pickStandards(pool,lesson):DEFAULT_CODES[game.domain][grade].map(c=>pool.find(st=>st.code===c)!).filter(Boolean)};
 });
 const phone=PHONE_PLAY_BY_ID.get(game.type);
 const sig=getSignatureGame(game.type);
 const questions=[...new Set([...(OWN_QUESTIONS[game.type]??[]),sig?.reflection,phone?.check,...QUESTIONS[game.domain],SAFETY_QUESTION].filter((q):q is string=>!!q))].slice(0,3);
 // 규칙·쉽게·어렵게는 상세 패널의 '규칙'과 '쉽게·어렵게·앉아서'에 따로 나온다. 활용 팁에는 그 밖의 팁만 둔다.
 const shown=new Set([...(phone?[...phone.rules,phone.easy,phone.hard,phone.seated]:[]),...(sig?.rules??[])]);
 const tips=(lesson?.teachingTips??[]).filter(t=>!shown.has(t)).slice(0,3);
 return {standards,lowGradeTheme:game.grades.includes('1~2학년')?lowGradeTheme(game):null,questions,tips};
}
