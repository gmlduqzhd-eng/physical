import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { supabase } from '../../../data/supabase';
import type { GameRoom, RoomGroup } from '../../../domain/types';
interface Props { currentRoom: GameRoom; roomGroups: RoomGroup[]; appUrl?: string }
export const QRCodePanel = ({currentRoom,appUrl}:Props) => {
 const [deviceCodes,setDeviceCodes]=useState<{board_code:string;recovery_code:string}|null>(null);
 const [cards,setCards]=useState<{group_name:string;code:string;short_pin:string;image:string}[]>([]);const [error,setError]=useState('');
 useEffect(()=>{let active=true; setCards([]);setDeviceCodes(null);setError('');void (async()=>{
  const result=await supabase.rpc('get_classroom_invites',{room_uuid:currentRoom.id});
  const codes=await supabase.rpc('get_classroom_device_codes',{room_uuid:currentRoom.id});if(codes.error)throw new Error('교사 기기 코드 발급 실패');if(active)setDeviceCodes(codes.data);if(result.error)throw new Error('모둠 참여 코드를 불러오지 못했습니다. 교사 권한을 확인하세요.');
  const items=await Promise.all((result.data as {group_name:string;code:string;short_pin:string}[]).map(async item=>{const url=new URL('/join',appUrl||window.location.origin);url.searchParams.set('room',currentRoom.id);url.searchParams.set('group',item.group_name);url.hash=new URLSearchParams({code:item.code}).toString();return {...item,image:await QRCode.toDataURL(url.toString(),{width:200,margin:2})};}));if(active)setCards(items);
 })().catch(e=>{if(active)setError(e instanceof Error?e.message:'QR 생성 실패');});return()=>{active=false};},[currentRoom.id,appUrl]);
 return <section className="classroom-qr-panel bg-cyan-50 border border-cyan-200 rounded-xl p-4"><h2 className="font-bold text-lg">모둠별 입장 PIN · QR</h2><p>학생에게 자기 모둠의 4자리 PIN 또는 QR을 보여주세요. PIN은 수업이 끝나면 사용할 수 없습니다. QR은 이 기기에서 생성하며 외부 QR 서비스에 코드를 보내지 않습니다.</p><button onClick={()=>window.print()} className="border rounded-lg p-3 my-3 print:hidden">인쇄하기</button>{error&&<p role="alert">{error}</p>}<div className="my-3 text-sm">{deviceCodes&&<><p>전광판 전용 코드 (읽기만 허용): <code>{deviceCodes.board_code}</code></p><details className="print:hidden"><summary>교사 전용 복구 정보 · 학생에게 공유 금지</summary><p>수업 복구 PIN: <code>{currentRoom.pin_code}</code></p><p>기기를 바꾸거나 탭을 닫기 전 별도로 보관하세요. 이 키와 교사 접근 코드가 있어야 방 소유권을 복구합니다.</p><code>{deviceCodes.recovery_code}</code></details></>}</div><div className="classroom-qr-grid grid grid-cols-2 md:grid-cols-4 gap-4">{cards.map(card=><article key={card.group_name} className="classroom-qr-card bg-white border rounded-lg p-3 text-center"><h3 className="font-bold">{card.group_name}</h3><p className="text-3xl font-black tracking-widest my-3" aria-label={card.group_name+' 입장 PIN '+card.short_pin}>{card.short_pin || '발급 중'}</p><img src={card.image} alt={card.group_name+' 입장 QR'} className="w-36 mx-auto"/></article>)}</div></section>;
};
