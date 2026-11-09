import {CameraQrPanel} from './CameraQrPanel';
import {missionQrValue} from '../../domain/missionQr';
export function MissionQrScanner({missionIds,onRead,disabled=false}:{missionIds:readonly string[];onRead:(text:string)=>void;disabled?:boolean}){
 return <CameraQrPanel parse={text=>missionQrValue(text,missionIds)} onRead={onRead} disabled={disabled} invalidMessage="이 수업에 등록된 미션·보물 QR만 읽을 수 있어요."/>;
}
