import {parseFunCommand,type FunCommand,type FunPhase,type SurpriseKind} from '../domain/funLoop';

/**
 * 대표 게임 명령 버스. TV 버튼·키보드·휴대폰 리모컨이 보내는 명령을 한 곳으로 모아 게임 화면에 전한다.
 * 지금은 로컬(같은 화면)에서만 쓰인다. 휴대폰 리모컨은 FunTransport를 만들어 attach()하면 된다(3단계):
 *   const detach=bus.attach({connect:onRaw=>{...채널 구독, 받은 값을 onRaw(값)으로...; return ()=>구독 해제;}, publishState:s=>{...}});
 * 바깥에서 온 값은 parseFunCommand로 검사한 뒤에만 전달하고, tick 같은 내부 명령은 받지 않는다.
 */
export type FunCommandSource='tv'|'key'|'remote';
export type ExternalFunCommand=Exclude<FunCommand,{type:'tick'}|{type:'finish'}>;
export type FunCommandHandler=(cmd:ExternalFunCommand,source:FunCommandSource)=>void;

/** 리모컨 화면이 보여 줄 TV 상태 요약. */
export interface FunRemoteSnapshot {
 gameId:string;gameName:string;phase:FunPhase;paused:boolean;secondsLeft:number;
 teams:number;scores:number[];scoreLabel:string;cue:string;combo:number;comboFull:boolean;
 /** 단계 이름(TV와 같은 말: '마지막 승부' 등). 리모컨은 이 글자를 그대로 보여 준다. */ phaseLabel?:string;
 /** 지금 일으킬 수 있는 깜짝 이벤트(게임마다 다름). 리모컨은 여기 없는 이벤트 버튼을 끈다. */ events?:SurpriseKind[];
}
export interface FunTransport {
 /** 원격에서 값이 오면 onRaw로 넘긴다. 돌려준 함수로 연결을 끊는다. */
 connect(onRaw:(raw:unknown)=>void):()=>void;
 /** TV 상태를 리모컨에 알린다(선택). */
 publishState?(snapshot:FunRemoteSnapshot):void;
}
export interface FunCommandBus {
 dispatch(cmd:ExternalFunCommand,source?:FunCommandSource):void;
 subscribe(handler:FunCommandHandler):()=>void;
 attach(transport:FunTransport):()=>void;
 publishState(snapshot:FunRemoteSnapshot):void;
}

export function createFunCommandBus():FunCommandBus{
 const handlers=new Set<FunCommandHandler>();
 const transports=new Set<FunTransport>();
 // 마지막 TV 상태. 리모컨이 나중에 붙어도 바로 지금 상태를 받는다.
 let latest:FunRemoteSnapshot|null=null;
 const dispatch=(cmd:ExternalFunCommand,source:FunCommandSource='tv')=>{for(const h of [...handlers])h(cmd,source);};
 return {
  dispatch,
  subscribe(handler){handlers.add(handler);return ()=>{handlers.delete(handler);};},
  attach(transport){
   transports.add(transport);
   const disconnect=transport.connect(raw=>{const cmd=parseFunCommand(raw);if(cmd)dispatch(cmd,'remote');});
   if(latest)transport.publishState?.(latest);
   return ()=>{transports.delete(transport);disconnect();};
  },
  publishState(snapshot){latest=snapshot;for(const t of transports)t.publishState?.(snapshot);},
 };
}

/** 키보드 단축키 → 명령. 입력칸에서 누른 키는 무시한다. */
export function keyToFunCommand(e:{key:string;shiftKey?:boolean;target?:unknown}):ExternalFunCommand|null{
 const el=e.target as {tagName?:string;isContentEditable?:boolean}|null;
 if(el&&(el.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName??'')))return null;
 const k=e.key;
 if(k===' '||k==='Enter')return {type:'next'};
 if(k==='p'||k==='P')return {type:'pause'};
 if(k==='a'||k==='A')return {type:'scoreAll',delta:1};
 if(k==='s'||k==='S')return {type:'special'};
 if(k==='g'||k==='G')return {type:'event',event:'golden'};
 const n=['1','2','3','4'].indexOf(k),shifted=['!','@','#','$'].indexOf(k);
 if(n>=0)return {type:'score',team:n,delta:e.shiftKey?-1:1};
 if(shifted>=0)return {type:'score',team:shifted,delta:-1};
 return null;
}
