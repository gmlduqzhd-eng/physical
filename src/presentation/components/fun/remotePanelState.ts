import {useSyncExternalStore} from 'react';

/**
 * 휴대폰 리모컨 창(QR·코드)이 열려 있는지. 창은 게임 무대 바깥(fun-dock)에 있지만, 열려 있는 동안
 * 큰 신호를 가리므로 게임은 시간을 멈추고 키보드 '다음'을 받지 않는다(리모컨 연결은 그대로 받는다).
 */
let open=false;
const listeners=new Set<()=>void>();
const subscribe=(l:()=>void)=>{listeners.add(l);return ()=>{listeners.delete(l);};};
export const isRemotePanelOpen=()=>open;
export function setRemotePanelOpen(next:boolean){if(open===next)return;open=next;listeners.forEach(l=>l());}
export const useRemotePanelOpen=()=>useSyncExternalStore(subscribe,isRemotePanelOpen,()=>false);

// 게임이 창 뒤에서 다시 움직이게 되면(선생님이 P·휴대폰으로 '다시 시작') 창을 닫아 큰 신호를 다시 보이게 한다.
const closeListeners=new Set<()=>void>();
export function requestRemotePanelClose(){closeListeners.forEach(l=>l());}
export function onRemotePanelCloseRequest(l:()=>void){closeListeners.add(l);return ()=>{closeListeners.delete(l);};}
