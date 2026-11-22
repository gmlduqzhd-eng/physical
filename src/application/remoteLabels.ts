import type {FunPhase} from '../domain/funLoop';

/** 휴대폰 리모컨의 '다음'을 누르면 TV에서 일어나는 일. TV의 진행 버튼 이름(SignaturePlay의 NEXT_LABEL)과 같게 쓴다. */
export const REMOTE_NEXT_LABEL:Record<FunPhase,string>={demo:'연습 판 시작',tutorial:'본게임 시작',play:'본게임 중이에요',climax:'결과 발표',result:'게임 끝'};
