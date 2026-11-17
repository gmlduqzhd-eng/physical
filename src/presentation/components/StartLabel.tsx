import './StartLabel.css';
/**
 * 모든 게임의 첫 시작 버튼이 같은 모양으로 보이게 하는 글자: 크게 "▶ 시작", 아래에 작게 무엇으로 시작하는지.
 * 버튼 이름(화면 낭독기)은 "시작 · 반 전체"처럼 읽힌다.
 */
export function StartLabel({sub}:{sub?:string}){
 return <span className="start-label"><span className="start-label-main"><span aria-hidden="true">▶ </span>시작</span>{sub&&<small className="start-label-sub"><span className="sr-only"> · </span>{sub}</small>}</span>;
}
