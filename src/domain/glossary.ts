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

/**
 * 화면 이름. 버튼·뒤로 가기·탭 제목·안내 문구가 같은 화면을 같은 이름으로 부르게 한다.
 * - 학생 묶음은 '모둠'이라고 부른다(팀은 청백 배틀처럼 편을 나눌 때만).
 * - 새 화면 이름이나 링크 이름을 쓸 때는 여기 값을 가져다 쓴다.
 */
export const SCREEN={
 home:'처음 화면',today:'오늘 수업',hub:'활동 고르기',tools:'수업 도구',
 teacher:'수업 준비',teacherAi:'수업 준비실',lessons:'수업 꾸러미',join:'수업 참여',
 board:'TV 점수판',remote:'모둠 수업 리모컨',funRemote:'TV 리모컨',kiosk:'공용 패드 화면',
 mobile:'모둠 기기',admin:'교사 제어 패널',manual:'이용 안내',
} as const;
const SCREEN_BY_PATH:Readonly<Record<string,string>>={
 '/':SCREEN.home,'/start':SCREEN.home,'/today':SCREEN.today,'/hub':SCREEN.hub,'/games':SCREEN.hub,
 '/tools':SCREEN.tools,'/teacher':SCREEN.teacher,'/teacher-ai':SCREEN.teacherAi,'/lessons':SCREEN.lessons,
 '/lobby':SCREEN.join,'/join':SCREEN.join,'/fun-remote':SCREEN.funRemote,'/remote':SCREEN.remote,
 '/kiosk':SCREEN.kiosk,'/admin':SCREEN.admin,'/manual':SCREEN.manual,
};
/** 주소의 화면 이름(뒤로 가기 단추 등). 모르는 주소면 undefined. */
export function screenNameFor(path:string):string|undefined{
 const bare=path.split(/[?#]/)[0].replace(/\/+$/,'')||'/';
 return SCREEN_BY_PATH[bare];
}
