import type {ComponentType} from 'react';
import type {FunState} from '../../../../domain/funLoop';
import type {SignatureCue,SignatureGameDef} from '../../../../domain/signatureGames';
import type {ExternalFunCommand} from '../../../../application/funCommandBus';
import type {TeacherButton} from '../../fun';

/** 대표 게임 화면 부품이 받는 값. dispatch는 TV 버튼·리모컨과 같은 명령 버스로 보낸다. */
export interface SignatureModuleProps {
 game:SignatureGameDef;state:FunState;cue:SignatureCue;seated:boolean;
 dispatch:(cmd:ExternalFunCommand)=>void;
}
/**
 * 대표 게임 화면 부품(모두 선택).
 * - Panel: 큰 지시 바로 아래 판(보스 HP·빙고판·순서 타일 등). 연습 판·본게임·마지막 승부에서 보인다.
 * - controls: 기본 선생님 버튼(다음·일시정지·모두 +1·깜짝 이벤트·끝내기) 뒤에 붙일 버튼.
 * - Result: 결과 화면의 순위 아래에 넣을 칸.
 * - hideFigure: 큰 지시 옆 막대 사람 그림을 숨긴다(판이 넓을 때).
 */
export interface SignatureModule {
 Panel?:ComponentType<SignatureModuleProps>;
 controls?:(p:SignatureModuleProps)=>TeacherButton[];
 Result?:ComponentType<SignatureModuleProps>;
 hideFigure?:boolean;
}
