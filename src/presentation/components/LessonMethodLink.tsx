import {Link} from 'react-router-dom';
import {CHANGE_METHOD_PATH,loadLessonMethod,type LessonMethod} from '../../application/lessonStartPrefs';
import '../EntryCards.css';
/** 지난번에 고른 방식으로 바로 들어온 화면에 두는 작은 링크. 다른 방식으로 바꾸고 싶을 때 '수업 시작'으로 돌아간다. */
export function LessonMethodLink({method}:{method:LessonMethod}){
 if(loadLessonMethod()!==method)return null;
 return <p className="lesson-method-link"><Link to={CHANGE_METHOD_PATH} data-change-method>↔ 수업 방식 바꾸기</Link></p>;
}
