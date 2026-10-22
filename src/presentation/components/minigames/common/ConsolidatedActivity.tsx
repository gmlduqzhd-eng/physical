import type {ReactNode} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {variantsFor} from '../../../../domain/gameLifecycle';
import {GAMES} from '../../../../domain/gamesData';
import {EXPEDITION_BY_ID} from '../../../../domain/expeditionGames';
import type {GameResultDetails} from '../../../../domain/gameResultDetails';
import {ExpeditionActivity} from '../expedition/ExpeditionActivity';
import {ExpressionGameViewer} from '../expression/ExpressionGameViewer';
import './MovementQuest.css';

interface Props {targetId:string;selected?:string|null;solo:boolean;groupId:string;children:ReactNode;enqueueAction:(action:{payload:{id:string;amount:number;details?:GameResultDetails}})=>void}
export function ConsolidatedActivity({targetId,selected,solo,groupId,children,enqueueAction}:Props){
 const location=useLocation(),navigate=useNavigate(),variants=variantsFor(targetId);
 const target=GAMES.find(g=>g.type===targetId)!;
 const variant=variants.find(v=>v.id===selected);
 const choose=(id?:string)=>{const params=new URLSearchParams(location.search);if(id)params.set('variant',id);else params.delete('variant');navigate({pathname:location.pathname,search:params.toString(),hash:location.hash},{replace:true,state:{activityPrepared:true}});};
 if(!selected||(!variant&&selected!=='base'))return <section className="movement-quest" data-consolidated={targetId} data-phase="choose"><h1>{target.name}</h1><p>기본 활동부터 시작하거나, 같은 목표의 다른 코스를 골라요.</p>{selected&&<p role="alert">이 활동에 없는 코스예요. 아래에서 다시 골라 주세요.</p>}<button className="mq-primary" onClick={()=>choose('base')}>기본 활동 시작</button><details className="mq-panel"><summary>다른 코스 {variants.length}개 살펴보기</summary>{variants.map(v=><div key={v.id} className="mq-panel"><h2>{v.name}</h2><p>{GAMES.find(g=>g.type===v.id)?.desc}</p><button className="mq-primary" data-variant-option={v.id} onClick={()=>choose(v.id)}>이 코스 선택</button></div>)}</details></section>;
 const expedition=variant&&EXPEDITION_BY_ID.get(variant.id);
 return <div data-consolidated={targetId} data-variant={variant?.id||'base'}><div className="movement-quest" style={{minHeight:0,paddingBottom:12}}><p className="mq-panel">{variant?`${variant.name}은(는) ${target.name}의 선택 코스로 통합했어요. 이전 기록은 원래 이름과 점수를 유지해요.`:'기본 활동 코스예요.'}<button className="mq-secondary" onClick={()=>choose()}>다른 코스 고르기</button></p></div>{!variant?children:expedition?.kind==='B'?<ExpeditionActivity key={variant.id} game={expedition} groupId={groupId} solo={solo} enqueueAction={enqueueAction}/>:<ExpressionGameViewer gameType={variant.id} onComplete={(amount,details)=>enqueueAction({payload:{id:groupId,amount,details}})}/>}</div>;
}
