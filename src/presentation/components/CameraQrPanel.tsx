import {useQrCamera} from '../../application/useQrCamera';
export function CameraQrPanel({parse,onRead,invalidMessage,startLabel='QR 촬영 시작',disabled=false}:{parse:(text:string)=>string|null;onRead:(text:string)=>void;invalidMessage:string;startLabel?:string;disabled?:boolean}){
 const scan=useQrCamera(parse,onRead,invalidMessage,disabled),busy=scan.status==='loading'||scan.status==='closing',active=busy||scan.status==='scanning'||scan.status==='recovering';
 return <div className="camera-qr-panel" style={{width:'100%',minWidth:0,maxWidth:400,marginInline:'auto',padding:12,color:'var(--forest-text, inherit)'}}>
  <label style={{display:'grid',gap:6}}>QR 카메라 모드<select aria-label="QR 카메라 모드" style={{width:'100%',minWidth:0,maxWidth:'100%'}} value={scan.mode} disabled={disabled||busy} onChange={e=>void scan.changeMode(e.target.value as 'auto'|'compatibility')}><option value="auto">자동 최적화</option><option value="compatibility">호환 모드 · 끊길 때 선택</option></select></label>
  <p style={{fontSize:13}}>QR만 기기 안에서 읽어요. 영상은 저장·전송하지 않아요. 화면을 떠나면 꺼지고 직접 다시 켜야 해요.</p>
  <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBlock:12}}><button disabled={disabled||active} onClick={scan.start}>{scan.status==='loading'?'카메라 준비 중…':startLabel}</button>{active&&<button disabled={scan.status==='closing'} onClick={()=>void scan.stop()}>{scan.status==='closing'?'카메라 종료 중…':'스캔 중지'}</button>}</div>
  <div ref={scan.host} style={{width:'100%',minWidth:0,overflow:'hidden'}}/>
  {scan.message&&<p role={scan.status==='error'?'alert':'status'} style={{overflowWrap:'anywhere',fontSize:14}}>{scan.message}</p>}
 </div>;
}
