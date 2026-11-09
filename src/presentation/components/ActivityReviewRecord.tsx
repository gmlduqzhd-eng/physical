import { useEffect, useState } from 'react';
import { supabase } from '../../data/supabase';
import type { GameDef } from '../../domain/gamesData';
import { activityFingerprint,type ActivityReview } from '../../domain/activityReview';
let cached:{at:number;value:Promise<ActivityReview[]>}|null=null;
function records(){if(!cached||Date.now()-cached.at>60000)cached={at:Date.now(),value:(async()=>{const r=await supabase.rpc('activity_review_records').abortSignal(AbortSignal.timeout(5000));if(r.error)throw Error('Review unavailable');return r.data??[];})()};return cached.value;}
export function ActivityReviewRecord({game}:{game:GameDef}){
 const [state,setState]=useState<string>('자료 점검 기록 확인 중…');
 useEffect(()=>{let active=true;void Promise.all([activityFingerprint(game),records()]).then(([hash,list])=>{if(!active)return;const r=list.find(v=>v.activityId===game.type&&v.sourceHash===hash);setState(r?`관리자 점검 기록 · 안전 ${r.safety?'확인':'미확인'} / 학년 ${r.grade?'확인':'미확인'} / 교육과정 ${r.curriculum?'확인':'미확인'} (${new Date(r.reviewedAt).toLocaleDateString('ko-KR')})`:'현재 자료의 관리자 점검 기록이 없습니다. 수업 전 교사가 확인하세요.');}).catch(()=>{if(active)setState('점검 기록을 불러오지 못했습니다. 활동 자료와 현장을 직접 확인하세요.');});return()=>{active=false;};},[game]);
 return <p className="small">{state} 점검 기록은 공인 안전 인증이나 실제 수업 효과 검증을 뜻하지 않습니다.</p>;
}
