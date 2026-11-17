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
 * - wide: 판이 커서, 넓은 화면(TV)에서는 큰 지시 옆에 나란히 놓는다(화면 아래로 밀리지 않게).
 * - dispose: 판(seed)이 끝나 '한 판 더'·목록으로 나갈 때 모듈이 따로 모아 둔 기록을 지운다.
 * - scoreButtons: false면 점수판에 ± 버튼을 두지 않는다(점수를 판에서만 주는 놀이: 빙고).
 * - snapshot/restore: 새로고침 이어 하기용. 모듈이 따로 모은 기록을 꺼내 주고(JSON으로 저장됨), 되살린다(모양 검사 필수).
 * - special: true면 이 놀이에 필살기가 있다(콤보 게이지·S 단축키를 보여 준다). 없으면 게이지를 숨기고 필살기 명령을 받지 않는다.
 * - scoreAllButton: false면 선생님 버튼 줄에 '모든 팀 +1'을 두지 않는다(모듈이 자기 성공 버튼을 둘 때).
 * - scoreAllLabel: 단축키 A의 뜻(단축키 안내에 쓴다. 기본 '모든 팀 +1').
 */
export interface SignatureModule {
 Panel?:ComponentType<SignatureModuleProps>;
 controls?:(p:SignatureModuleProps)=>TeacherButton[];
 Result?:ComponentType<SignatureModuleProps>;
 hideFigure?:boolean;
 wide?:boolean;
 scoreButtons?:boolean;
 special?:boolean;
 scoreAllButton?:boolean;
 scoreAllLabel?:string;
 /** 단축키 안내에서 1~4 키의 뜻(기본 '1~4 팀 +1 (Shift −1)'). */ teamKeysLabel?:string;
 snapshot?(seed:number):unknown;
 restore?(seed:number,data:unknown):void;
 dispose?(seed:number):void;
}
