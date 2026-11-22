import {useCallback,useEffect,useState} from 'react';
import {readJsonStorage,writeStorage} from './browserStorage';
import {isKnownGameId,mergedTargetId} from '../domain/homeCatalog';

/** 활동 즐겨찾기. 활동 목록(/hub)과 기록·즐겨찾기(/hub/tools)가 같은 저장 값을 쓴다. 옛 활동 번호는 이어지는 활동으로 센다. */
export const FAVORITES_KEY='physical_favorites';
const live=(id:string)=>mergedTargetId(id)||id;
export function readFavorites():Set<string>{
 const saved=readJsonStorage(FAVORITES_KEY);
 return new Set(Array.isArray(saved)?saved.filter((v):v is string=>typeof v==='string'&&isKnownGameId(v)):[]);
}
export function useActivityFavorites(){
 const [favorites,setFavorites]=useState<Set<string>>(readFavorites);
 useEffect(()=>{writeStorage(FAVORITES_KEY,JSON.stringify([...favorites]));},[favorites]);
 const isFavorite=useCallback((type:string)=>[...favorites].some(id=>live(id)===type),[favorites]);
 const toggleFavorite=useCallback((type:string)=>setFavorites(prev=>{
  const next=new Set(prev),matches=[...next].filter(id=>live(id)===type);
  if(matches.length)matches.forEach(id=>next.delete(id));else next.add(type);
  return next;
 }),[]);
 return {favorites,isFavorite,toggleFavorite,favoriteTypes:new Set([...favorites].map(live))};
}
