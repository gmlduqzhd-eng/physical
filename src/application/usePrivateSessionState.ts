import {useCallback,useEffect,useRef,useState} from 'react';
import {deviceStorageGeneration,readJsonStorage,writeStorage} from './browserStorage';

// A mounted screen must not write its previous student's state back after expiry.
export function usePrivateSessionState<T>(key:string,normalize:(value:unknown)=>T){
 const [state,setState]=useState(()=>normalize(readJsonStorage(key)));
 const latest=useRef(state),generation=useRef(deviceStorageGeneration());
 const current=useCallback(()=>{
  const saved=readJsonStorage(key),nextGeneration=deviceStorageGeneration();
  if(nextGeneration!==generation.current){generation.current=nextGeneration;latest.current=normalize(saved);setState(latest.current);}
  return latest.current;
 },[key,normalize]);
 const update=useCallback((change:(previous:T)=>T)=>{
  const next=change(current());latest.current=next;setState(next);writeStorage(key,JSON.stringify(next));return next;
 },[key,current]);
 useEffect(()=>{
  const refresh=()=>{current();};
  window.addEventListener?.('physical-device-cleared',refresh);window.addEventListener?.('focus',refresh);
  return()=>{window.removeEventListener?.('physical-device-cleared',refresh);window.removeEventListener?.('focus',refresh);};
 },[current]);
 return {state,current,update};
}
