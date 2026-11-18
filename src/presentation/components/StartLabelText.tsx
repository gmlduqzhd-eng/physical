/* @jsxRuntime automatic */
/**
 * 모든 게임의 첫 시작 버튼이 같은 모양으로 보이게 하는 글자: 크게 "▶ 시작", 아래에 작게 무엇으로 시작하는지.
 * 접근 이름은 화면에 보이는 글자와 같게 둔다(WCAG 2.5.3 label in name): 음성으로 "시작 반 전체"처럼 보이는 대로 말하면 눌린다.
 * 화살표(▶)만 낭독에서 빼고, 낭독기는 "시작 · 반 전체"로 읽는다.
 * 보이는 글자와 다른 낭독용 문장은 쓰지 않는다(보이는 글자와 달라지면 음성 조작이 안 된다).
 * 모양(css)은 StartLabel.tsx가 불러온다. 이 파일은 css 없이도 읽혀 테스트에서 그대로 그려 볼 수 있다.
 */
export function StartLabel({sub}:{sub?:string}){
 return <span className="start-label"><span className="start-label-main"><span aria-hidden="true">▶ </span>시작</span>{sub&&<small className="start-label-sub"><span className="sr-only"> · </span>{sub}</small>}</span>;
}
