import {VOLLEYBALL_POSITIONS,VOLLEYBALL_QUIZ,VOLLEYBALL_RULES,VOLLEYBALL_SKILLS,VOLLEYBALL_TERMS} from './sportDeepDiveData.js';

/** 종목 깊이 보기: 처음 배우기(용어·규칙) → 기술 → 포지션 → 퀴즈. */
export interface DeepTerm {id:string;name:string;topic:string;summary:string;example:string}
export interface DeepRule {id:string;name:string;symbol:string;summary:string;example:string}
export interface DeepSkill {id:string;name:string;subtitle:string;purpose:string;preparation:string;steps:string[];mistakes:string[];drills:string[]}
export interface DeepPosition {id:string;name:string;abbreviation:string;subtitle:string;responsibilities:string[];tips:string[]}
export interface DeepQuiz {id:string;question:string;choices:string[];answer:number;explanation:string}
export interface DeepDive {sportId:string;title:string;lead:string;note:string;terms:DeepTerm[];rules:DeepRule[];skills:DeepSkill[];positions:DeepPosition[];quiz:DeepQuiz[]}

export const DEEP_TABS=[{id:'learn',label:'처음 배우기'},{id:'skills',label:'기술'},{id:'positions',label:'포지션'},{id:'quiz',label:'퀴즈'}] as const;
export type DeepTabId=typeof DEEP_TABS[number]['id'];

const DEEP_DIVES:DeepDive[]=[
 {sportId:'volleyball',title:'배구 깊이 보기',lead:'용어와 규칙부터 여섯 가지 기술, 역할, 퀴즈까지 차근차근 알아봐요.',
  note:'어른들이 하는 9인제 배구를 기준으로 쓴 자료예요. 초등 체육 수업에서는 인원·코트·공을 줄여서 하고, 규칙은 선생님과 정해요.',
  terms:VOLLEYBALL_TERMS,rules:VOLLEYBALL_RULES,skills:VOLLEYBALL_SKILLS,positions:VOLLEYBALL_POSITIONS,quiz:VOLLEYBALL_QUIZ},
];
export const DEEP_DIVE_IDS=DEEP_DIVES.map(d=>d.sportId);
export const deepDive=(sportId:string|undefined)=>DEEP_DIVES.find(d=>d.sportId===sportId);
export const hasDeepDive=(sportId:string)=>DEEP_DIVE_IDS.includes(sportId);
export const termTopics=(dive:DeepDive)=>[...new Set(dive.terms.map(t=>t.topic))];
/** 퀴즈 결과: 맞힌 수와 다시 볼 문제. 고르지 않은 문제는 틀린 것으로 센다. */
export function quizResult(dive:DeepDive,answers:readonly (number|null)[]){
 const missed=dive.quiz.filter((q,i)=>answers[i]!==q.answer).map(q=>q.id);
 return {total:dive.quiz.length,correct:dive.quiz.length-missed.length,missed};
}
