import {useEffect,useState} from 'react';
import QRCode from 'qrcode';
export function LocalQRCode({value,alt,className,size=200}:{value:string;alt:string;className?:string;size?:number}){
 const [src,setSrc]=useState('');useEffect(()=>{let active=true;void QRCode.toDataURL(value,{width:size,margin:2}).then(data=>{if(active)setSrc(data);}).catch(()=>{if(active)setSrc('');});return()=>{active=false};},[value,size]);
 return src?<img src={src} alt={alt} className={className}/>:<span role="status">QR 생성 중…</span>;
}
