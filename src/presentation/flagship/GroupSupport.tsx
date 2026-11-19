import {useState} from 'react';
import {SUPPORT_CHOICES,type SupportKind} from '../../domain/cooperativeMap';
import type {ExpeditionSnapshot} from '../../domain/flagship';
import type {ExpeditionAction} from './MapGame';

export function GroupSupport({snapshot:s,send,disabled}:{snapshot:ExpeditionSnapshot;send:ExpeditionAction;disabled:boolean}){
 const [message,setMessage]=useState('');
 const me=s.groups.find(g=>g.id===s.groupId),requests=s.groups.filter(g=>g.id!==s.groupId&&g.support&&g.support!=='none');
 if(s.playVersion!==1||!me)return null;
 const setSignal=async(kind:SupportKind)=>{if(await send('support',{kind}))setMessage(kind==='none'?'도움 신호를 지웠어요.':'우리 모둠의 도움 신호를 전했어요. 다른 모둠의 완료 기록은 바뀌지 않아요.');};
 return <details className="flagship-note group-support"><summary>{me.done||me.vote?'다른 모둠과 도움 연결하기':'막혔나요? 도움 신호 나누기'}</summary>
  <p>기기를 안전한 곳에 놓고 상대 모둠에게 몸짓·말로 힌트를 전하거나 함께 박자를 연습해요. 쉬면서 신호를 전달해도 좋아요.</p>
  <div className="flagship-row">{SUPPORT_CHOICES.map(c=><button key={c.id} disabled={disabled} aria-pressed={(me.support??'none')===c.id} onClick={()=>void setSignal(c.id)}>{c.label}</button>)}</div>
  <ul>{requests.length?requests.map(g=><li key={g.id}><strong>{g.name}</strong> · {SUPPORT_CHOICES.find(c=>c.id===g.support)?.label}</li>):<li>다른 모둠의 도움 신호가 아직 없어요. 편하게 쉬거나 우리 힌트를 몸짓으로 연습해요.</li>}</ul>
  <p role="status">{message}</p><small>자기 모둠이 보낸 신호입니다. 수행 증명·교사 승인·자동 완료로 사용하지 않아요.</small>
 </details>;
}
