/**
 * '수업 시작'에서 마지막으로 고른 수업 방식(TV 한 대 / 모둠마다 폰)을 이 기기에 둔다.
 * 학생 정보가 아니라 수업 설정이다(서버로 보내지 않는다). '기기 정보 지우기'를 누르면 함께 지워진다(physical_ 로 시작).
 */
import {readStorage,writeStorage} from './browserStorage';

export type LessonMethod='tv'|'room';
const KEY='physical_lesson_method_v1';
export const LESSON_METHOD_PATH:Readonly<Record<LessonMethod,string>>={tv:'/today',room:'/teacher/setup'};
export const START_LESSON_PATH='/start-lesson';
export const CHANGE_METHOD_PATH='/start-lesson?choose=1';

export function parseLessonMethod(value:unknown):LessonMethod|null{return value==='tv'||value==='room'?value:null;}
export function loadLessonMethod():LessonMethod|null{return parseLessonMethod(readStorage(KEY));}
export function saveLessonMethod(method:LessonMethod){writeStorage(KEY,method);}
/** 홈의 '수업 시작'이 갈 곳: 지난번 방식이 있으면 그 화면으로 바로, 없으면 방식 고르기로. */
export function lessonStartPath(method:LessonMethod|null=loadLessonMethod()):string{return method?LESSON_METHOD_PATH[method]:START_LESSON_PATH;}
