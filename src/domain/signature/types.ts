import type {FunState,FunTiming} from '../funLoop.js';

/** 시범 애니메이션(DemoLoop)이 그리는 막대 사람 자세. */
export type Pose='stand'|'armsUp'|'armsSide'|'armsFront'|'armsDown'|'squat'|'jump'|'stepLeft'|'stepRight'|'oneLeg'|'clap'|'point'|'freeze'|'punch'|'wave'|'sit'|'run';
export const POSES:readonly Pose[]=['stand','armsUp','armsSide','armsFront','armsDown','squat','jump','stepLeft','stepRight','oneLeg','clap','point','freeze','punch','wave','sit','run'];
export interface DemoFrame {pose:Pose;caption:string}

/** 큰 화면에 띄우는 신호 하나. text는 짧은 동작어("팔 위로!"), sub는 규칙 한 줄. */
export interface SignatureCue {
 text:string;sub?:string;icon?:string;
 /** 신호 칸 색: go 초록, stop 빨강, warn 노랑, gold 황금, calm 하늘, rest 회색. 정답을 색으로 알려 주면 안 되는 놀이는 비워 둔다. */
 tone?:'go'|'stop'|'warn'|'gold'|'calm'|'rest';
 /** 결과의 'MVP 동작'에 쓸 동작 이름(없으면 text). */ move?:string;
 /** false면 동작 신호가 아니다(카드 안내·쉬는 신호): MVP 동작으로 뽑지 않는다. */ scorable?:boolean;
 /** 신호와 함께 그릴 막대 사람 자세(선택). */ pose?:Pose;
}
export interface SignatureCueContext {
 phase:'tutorial'|'play'|'climax';
 /** 이 단계 안에서의 신호 번호(0부터). */ index:number;
 seed:number;reversed:boolean;frozen:boolean;seated:boolean;teams:number;
 state:FunState;
}

/**
 * 대표 게임 하나의 데이터와 규칙. 화면이 없는 순수한 값·함수만 둔다(화면 부품은 modules/<id>.tsx).
 * 기본값이 있는 필드는 defineSignatureGame()이 채운다.
 */
export interface SignatureGameDef {
 id:`sig-${string}`;
 /** false면 아직 만드는 중: 목록·검색·카탈로그에 나오지 않고 /play 주소도 열리지 않는다. */
 ready:boolean;
 name:string;emoji:string;
 /** 한 문장 규칙(카드·시작 화면 맨 위). */ oneLine:string;
 /** 무엇을 / 어떻게 / 언제 끝 3줄. */ rules:readonly [string,string,string];
 /** 오늘 연습하는 체육 개념 한 낱말(결과: "오늘 우리는 ○○을 연습했어요"). */ concept:string;
 reflection:string;nextChallenge:string;
 /** 선생님이 점수를 주는 기준 한 줄(진행 화면 점수판 위). */ scoringHint:string;
 /** 점수판 이름(기본 '점수'). 보스전은 '공격'. */ scoreLabel:string;
 /** 앉아서 하는 방법 한 줄. */ seatedNote:string;
 demo:readonly DemoFrame[];
 timing:FunTiming;
 teamsDefault:2|3|4;teamsMin:1|2;
 /** 합쳐진 기존 게임 id(상세 안내·보관함 링크용). */ mergedFrom:readonly string[];
 /** 신호를 만든다. 같은 (phase, index, seed)면 늘 같은 신호여야 한다(리모컨·새로고침에도 같은 화면). */
 cue(ctx:SignatureCueContext):SignatureCue;
 /** 목표를 이뤄 일찍 끝나는 놀이(보스를 다 물리침 등)는 true를 돌려준다. 엔진이 승리 연출 뒤 결과로 넘긴다. */
 isComplete?(state:FunState):boolean;
 /** 결과 화면 큰 제목을 바꾸고 싶을 때. */ resultHeadline?(state:FunState):string|undefined;
 /** 결과의 MVP 동작 이름. 기본은 그 신호의 move/text. */
 // ── 카탈로그(활동 찾기·지도안)에 쓰는 값 ──
 domain:'운동'|'스포츠'|'표현';subCategory:string;
 achievement:{code:string;title:string;desc:string};
 grades:readonly ('1~2학년'|'3~4학년군'|'5~6학년군')[];
 spaces:readonly ('교실'|'체육관'|'운동장'|'다목적실')[];
 minutes:number;players:{min:number;max:number};
 intensity:'낮음'|'보통'|'높음';
 equipment:readonly string[];safetyTips:readonly string[];teachingTips:readonly string[];
}
