import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { classroomQrPath } from '../../domain/classroomQr';
export function StudentQrScanner() {
  const [scanning, setScanning] = useState(false); const [error, setError] = useState(''); const navigate = useNavigate();
  useEffect(() => {
    if (!scanning) return;
    let disposed = false; let accepted = false; let stop: (() => Promise<void>) | undefined;
    void import('html5-qrcode').then(async ({ Html5Qrcode }) => {
      if (disposed) return;
      const scanner = new Html5Qrcode('student-qr-reader');
      await scanner.start({ facingMode: 'environment' }, { fps: 8, qrbox: { width: 220, height: 220 } }, text => {
        if (disposed || accepted) return;
        const path = classroomQrPath(text, window.location.origin);
        if (!path) { setError('우리 모둠의 수업 참여 QR을 비춰 주세요. 다른 QR은 열지 않습니다.'); return; }
        accepted = true; navigate(path);
      }, () => {});
      stop = () => scanner.stop();
      if (disposed) await stop();
    }).catch(() => { if (!disposed) { setError('카메라를 열지 못했어요. 카메라 권한을 확인하거나 코드로 참여해 주세요.'); setScanning(false); } });
    return () => { disposed = true; if (stop) void stop().catch(() => {}); };
  }, [scanning, navigate]);
  return <section className="card"><h2>우리 모둠 QR을 비춰요</h2><p>선생님이 보여주신 QR을 휴대폰 기본 카메라로 촬영해도 바로 참여할 수 있어요.</p>{!scanning ? <button className="primary" onClick={() => { setError(''); setScanning(true); }}>QR 촬영 시작</button> : <button onClick={() => setScanning(false)}>촬영 멈추기</button>}<div id="student-qr-reader" style={{maxWidth:360,marginTop:16}}/>{error && <p role="alert" className="error">{error}</p>}<p className="small muted">영상은 이 기기에서 QR을 읽는 데만 사용하며 앱 서버로 보내지 않아요.</p></section>;
}
