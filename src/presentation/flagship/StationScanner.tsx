import {CameraQrPanel} from '../components/CameraQrPanel';
export function StationScanner({onCode,disabled=false}:{onCode:(token:string)=>void;disabled?:boolean}){
 return <CameraQrPanel disabled={disabled} startLabel="탐사 지점 QR 읽기" parse={text=>/^physical-expedition:[a-f0-9-]{36}:([a-f0-9]{24})$/.exec(text)?.[1]??null} onRead={onCode} invalidMessage="이 수업의 탐사 지점 QR을 사용해 주세요."/>;
}
