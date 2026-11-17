/**
 * 화면 위에 붙어 있는(sticky·fixed) 머리글의 아래쪽 위치. 지시를 그 아래로 내려 가려지지 않게 한다.
 * 필요할 때만 한 번 계산한다. 화면 위쪽에 닿아 있는 고정 요소만 센다(아래쪽 버튼 막대는 제외).
 */
export function stickyTopBottom():number{
  let bottom=0;
  for(const el of Array.from(document.body.querySelectorAll('*'))){
    const position=getComputedStyle(el).position;
    if(position!=='sticky'&&position!=='fixed')continue;
    const rect=el.getBoundingClientRect();
    if(rect.height>0&&rect.top<=bottom+1&&rect.bottom<window.innerHeight/2)bottom=Math.max(bottom,rect.bottom);
  }
  return bottom;
}
