import {useNavigate} from 'react-router-dom';
import {classroomQrPath} from '../../domain/classroomQr';
import {CameraQrPanel} from './CameraQrPanel';
export function StudentQrScanner(){
 const navigate=useNavigate();
 return <section className="card"><h2>우리 모둠 QR을 비춰요</h2><p>선생님이 보여주신 QR을 휴대폰 기본 카메라로 촬영해도 바로 참여할 수 있어요.</p><CameraQrPanel parse={text=>classroomQrPath(text,window.location.origin)} onRead={path=>navigate(path)} invalidMessage="우리 모둠의 수업 참여 QR을 비춰 주세요. 다른 QR은 열지 않습니다."/></section>;
}
