/**
 * 휴대폰 리모컨의 '다음'을 빠르게 두 번 누르면 한 단계를 통째로 건너뛰었다(시범→본게임, 연습 판→마지막 승부).
 * 단계가 바뀐 직후나 바로 앞 '다음' 직후 이 시간 안에 온 리모컨 '다음'은 버린다. TV 버튼·키보드는 그대로.
 */
export const REMOTE_NEXT_GUARD_MS=800;
export function shouldIgnoreRemoteNext(now:number,lastRemoteNextAt:number,phaseChangedAt:number):boolean{
 return now-lastRemoteNextAt<REMOTE_NEXT_GUARD_MS||now-phaseChangedAt<REMOTE_NEXT_GUARD_MS;
}
