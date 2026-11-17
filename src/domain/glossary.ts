/**
 * 화면마다 다르게 쓰던 낱말을 하나로 맞춘 용어 사전.
 * - 묶음 이름: 학생이 하는 것은 모두 '활동'이라 부른다(놀이·게임·원정은 활동 이름 안에서만 쓴다).
 * - 학년: 1~2학년도 '1~2학년군'으로 쓴다(데이터 값 '1~2학년'은 그대로 두고 보여 줄 때만 바꾼다).
 * - 장소: 체육관·다목적실·강당은 '체육관·강당' 하나로 보여 준다.
 */
export const TERMS={activity:'활동',classroom:'교실',gym:'체육관·강당',field:'운동장'} as const;
export const gradeLabel=(grade:string)=>grade==='1~2학년'?'1~2학년군':grade;
const PLACE:Record<string,string>={체육관:TERMS.gym,다목적실:TERMS.gym,강당:TERMS.gym,'좁은 실내 공간':TERMS.classroom};
export const placeLabel=(place:string)=>PLACE[place]??place;
/** 여러 장소 낱말을 보여 줄 이름으로 바꾸고 겹치는 것은 하나만 남긴다. */
export const placeLabels=(places:readonly string[])=>[...new Set(places.map(placeLabel))];
