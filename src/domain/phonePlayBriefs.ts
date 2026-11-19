/**
 * 반 전체 진행(교사 화면 1대)에서 2·3번 과제 앞 안내를 얼마나 보여 줄지 정한다.
 *
 * 보통 2·3번 과제는 2초 짧은 신호 뒤 바로 시작한다('바로 시작'을 과제마다 누르지 않게).
 * 하지만 역할을 바꾸거나 규칙이 달라지는 과제는 2초로는 아이들이 바뀐 점을 알아듣지 못한다.
 * 그런 과제는 아래 표에 직접 적어 두고(제목 낱말로 추측하지 않는다) 첫 과제처럼 긴 안내를 보여 준다.
 * 키는 놀이 id, 값은 0부터 센 과제 번호(1 = 2번 과제, 2 = 3번 과제)다.
 */
export const CLASS_RULE_CHANGE_ROUNDS:Readonly<Record<string,readonly number[]>>={
 'phone-play-007':[2], // 역할을 바꿔 진행해요
 'phone-play-008':[1,2], // 번호마다 동작을 한 칸씩 바꿔요 · 한 번 더 바꿔요
 'phone-play-011':[1,2], // 바꿔! 뒤에는 뜻을 바꿔요 · 바꿔!가 두 번 나와도 맞게 해요
 'phone-play-019':[1], // 출발 방향을 바꿔요
 'phone-play-020':[2], // 발은 멈추고 손만 바꿔요
 'phone-play-024':[2], // 짝이 만든 새 규칙을 따라 해요
 'phone-play-028':[1], // 시작 동작을 바꿔요
 'phone-play-031':[1], // 차례로 합주에 합류해요
 'phone-play-033':[2], // 다른 새 동작으로 바꿔 연결해요
 'phone-play-053':[1], // 순서를 거꾸로 바꾸어 세요
 'phone-play-057':[2], // 바꿔서 다시 해요
 'phone-play-060':[1], // 순서를 바꿔 비교해요
 'phone-play-067':[1], // 차례로 기계를 연결해요
 'phone-play-069':[2], // 신호 주는 사람을 바꿔요
 'phone-play-070':[2], // 먼저 시작하는 사람을 바꿔요
 'phone-play-076':[2], // 서로 먼저 시작하는 역할을 바꿔요
 'phone-play-081':[2], // 짝과 바꿔 해요
 'phone-play-085':[2], // 첫 동작을 바꿔 반복해요
 'phone-play-089':[2], // 친구가 다시 합류할 규칙을 만들어요
 'phone-play-103':[1], // 술래 두 명으로 해요
};

/** 이 과제가 역할·규칙을 바꾸는 과제인지(긴 안내가 필요한지). */
export function classBriefChangesRule(playId:string,round:number):boolean{
 return CLASS_RULE_CHANGE_ROUNDS[playId]?.includes(round)??false;
}

/** 2·3번 과제 앞 짧은 신호 시간. */
export const QUICK_BRIEF_MS=2000;

/**
 * 한국어 음성으로 문장을 다 읽는 데 걸리는 대략의 시간(ms).
 * 기기 음성은 보통 1초에 6~7글자쯤 읽으므로 한 글자 150ms로 넉넉히 잡고, 시작까지 400ms를 더한다.
 * 느리게 읽기(rate 0.82)면 그만큼 늘린다.
 */
export function estimateSpeechMs(text:string,rate=1):number{
 const chars=text.replace(/\s+/g,' ').trim().length;
 if(!chars)return 0;
 return Math.round((400+chars*150)/Math.max(.5,rate));
}

/**
 * 안내 단계 시간: 기본 시간(짧은 신호 또는 긴 안내)과, 음성을 켰다면 안내 문장을 다 읽는 시간 가운데 긴 쪽.
 * 첫 신호를 읽을 때 앞 문장을 끊으므로, 안내 문장이 끝나기 전에 과제가 시작되지 않게 한다.
 */
export function classBriefMs(baseMs:number,briefLine:string,voice:{on:boolean;rate:number}|null):number{
 return voice?.on?Math.max(baseMs,estimateSpeechMs(briefLine,voice.rate)):baseMs;
}
