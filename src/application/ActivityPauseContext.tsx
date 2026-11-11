/* eslint-disable react-refresh/only-export-components -- Shared activity pause provider and hook. */
import {createContext,useContext,useEffect,type ReactNode} from 'react';
const ActivityPauseContext=createContext(false);
export const useActivityPause=()=>useContext(ActivityPauseContext);
export function ActivityPauseBoundary({paused,message,children}:{paused:boolean;message:string;children:ReactNode}){
 useEffect(()=>{if(paused)window.speechSynthesis?.cancel();},[paused]);
 return <ActivityPauseContext.Provider value={paused}><div inert={paused} aria-hidden={paused||undefined}>{children}</div>{paused&&<div role="status" className="activity-classroom-pause"><strong>{message}</strong><p>기기를 놓고 선생님을 보세요. 진행 기록은 유지하며, 수업을 다시 시작하면 남은 부분부터 이어가요.</p><a href="/lobby">참여 화면으로</a></div>}</ActivityPauseContext.Provider>;
}
