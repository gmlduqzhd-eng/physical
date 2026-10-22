import {Link,useLocation} from 'react-router-dom';
import {getRemovedGame,replacementUrl} from '../../../../domain/gameLifecycle';
import {GAMES} from '../../../../domain/gamesData';
import './MovementQuest.css';
export function RetiredGameNotice({id,roomId,groupId}:{id:string;roomId?:string;groupId?:string}){
 const location=useLocation(),removed=getRemovedGame(id);
 if(!removed)return null;
 const message=id==='scream'?'크게 소리 내는 게임 대신 주변 소리를 듣고 쉬는 활동을 준비했어요.':id==='coin_flip'||id==='fate_card'?'운으로 점수가 정해지는 게임 대신 내가 선택하고 움직이는 활동을 골라요.':id==='balloon'?'화면의 풍선과 점수 대신 실제 도구를 다루는 활동을 골라요.':'화면을 빠르게 누르는 게임 대신 몸을 움직이는 활동을 골라요.';
 const solo=location.pathname.startsWith('/solo/'),params=new URLSearchParams(location.search);
 if(roomId)params.set('room',roomId);if(groupId)params.set('group',groupId);
 const next=replacementUrl(location.pathname,id,params.toString(),location.hash)!;
 const targetId=next.split('?')[0].split('/').at(-1),target=GAMES.find(g=>g.type===targetId);
 return <section className="warm-game movement-quest" data-retired={id}><header className="mq-heading"><span aria-hidden="true">🧭</span><h1>{removed.name} 운영 종료 안내</h1></header><p className="mq-lead">이 게임은 체육 활동 목록에서 정리했어요.</p><p>{message}</p><div className="mq-panel"><h2>기록은 그대로 남아요</h2><p>예전 활동 이름과 점수, 참여 기록은 그대로 남아 있어요. 이 안내를 보는 동안에는 새 점수나 완료 기록이 생기지 않아요.</p></div><p>몸으로 참여할 수 있는 다른 활동을 골라 보세요. 수업 중이라면 선생님과 대체 활동을 먼저 확인해요.</p><Link className="mq-primary" to={next}>대체 활동 · {target?.name||'몸 미션'} 열기</Link><Link className="mq-secondary" to={solo?'/solo':'/hub'}>활동 목록으로</Link></section>;
}
