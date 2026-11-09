import {createContext,useContext,useEffect,useRef} from 'react';
import type {DeviceReport,ReadinessState} from '../../domain/expeditionWorkshop';
import type {ExpeditionAction} from './MapGame';
export const DeviceStatusContext=createContext<ExpeditionAction|null>(null);
// No camera samples, degrees, media IDs or browser fingerprint leave the device.
export function useReportDevice(kind:DeviceReport['kind'],state:ReadinessState){
 const send=useContext(DeviceStatusContext),latest=useRef(state);latest.current=state;
 useEffect(()=>{
  if(!send)return;
  const report=()=>{if(!document.hidden)void send('readiness',{kind,state:latest.current});};
  const initial=setTimeout(report,700),heartbeat=setInterval(report,5000);
  return()=>{clearTimeout(initial);clearInterval(heartbeat);};
 },[send,kind,state]);
}
