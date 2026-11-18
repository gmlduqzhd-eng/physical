import './StartLabel.css';
/**
 * 모든 게임의 첫 시작 버튼이 같은 모양으로 보이게 하는 글자: 크게 "▶ 시작", 아래에 작게 무엇으로 시작하는지.
 * 화면에 보이는 글자는 낭독기에서 숨기고, 대신 자연스러운 한 문장(spoken)을 읽어 준다. 예: "반 전체로 시작".
 */
export function StartLabel({sub,spoken}:{sub?:string;spoken?:string}){
 const sentence=spoken??(sub?`${sub} 시작`:'시작');
 return <span className="start-label"><span className="sr-only">{sentence}</span><span className="start-label-main" aria-hidden="true">▶ 시작</span>{sub&&<small className="start-label-sub" aria-hidden="true">{sub}</small>}</span>;
}
