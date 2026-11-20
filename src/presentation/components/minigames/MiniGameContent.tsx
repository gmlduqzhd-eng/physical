/**
 * 수업 중 선생님이 띄운 활동을 고른다. MiniGameOverlay가 활동이 있을 때만 이 파일을 받는다
 * (학생 폰 첫 화면에 활동 판단 자료·화면을 싣지 않으려고 따로 뺐다).
 */
import {isFlagship} from '../../../domain/flagship';
import {EXPEDITION_BY_ID} from '../../../domain/expeditionGames';
import {getMergedGame,getRemovedGame} from '../../../domain/gameLifecycle';
import {isSafetyLessonId} from '../../../domain/safetyLessons';
import { isQuestId } from '../../../domain/movementQuests';
import type { GameRoom } from '../../../domain/types';
import {ConsolidatedActivity,ExpeditionActivity,FlagshipActivity,LegacyBombGame,LegacyQuizGame,MovementQuest,RetiredGameNotice,SafetyLesson} from './lazyActivities';

export interface MiniGameContentProps {
  gameRoom: GameRoom;
  minigame: NonNullable<GameRoom['active_minigame']>;
  groupId: string;
  template: any;
  handleMissionComplete: any;
  setShowScanner: any;
  playVictory: any;
  sessionKey: string;
  enqueueAction: (action: {payload: Record<string,unknown>;[key:string]:unknown}) => void;
  onDismiss: () => void;
}

export function MiniGameContent({ gameRoom, minigame, groupId, template, handleMissionComplete, setShowScanner, playVictory, sessionKey, enqueueAction, onDismiss }: MiniGameContentProps) {
  const eventType=minigame.type==='team_battle'?(minigame.subType||'volcano'):minigame.type;
  if(getRemovedGame(eventType))return <RetiredGameNotice id={eventType} roomId={gameRoom.id} groupId={groupId} onBack={onDismiss}/>;
  const complete=(action:{payload:{id:string;amount:number;details?:import('../../../domain/gameResultDetails').GameResultDetails}})=>enqueueAction({id:crypto.randomUUID(),type:'INCREMENT_SCORE',payload:{...action.payload,id:groupId},timestamp:Date.now()});
  if(isFlagship(eventType))return <FlagshipActivity key={sessionKey} game={eventType} room={gameRoom.id} group={groupId} onFinish={details=>complete({payload:{id:groupId,amount:100,details}})}/>;
  const native=EXPEDITION_BY_ID.get(eventType);if(native?.kind==='B'&&!getMergedGame(eventType))return <ExpeditionActivity game={native} groupId={groupId} solo={false} enqueueAction={complete}/>;
  const merged=getMergedGame(eventType);if(merged)return <ConsolidatedActivity key={sessionKey} targetId={merged.target} selected={merged.id} solo={false} groupId={groupId} enqueueAction={complete}>{null}</ConsolidatedActivity>;
  if(isSafetyLessonId(minigame.type))return <SafetyLesson key={sessionKey} gameId={minigame.type} groupId={groupId} enqueueAction={enqueueAction}/>;
  if(isQuestId(minigame.type)) return <MovementQuest key={sessionKey} gameId={minigame.type} groupId={groupId} enqueueAction={enqueueAction}/>;
  // 합쳐진 활동·신체 놀이는 위에서 먼저 처리된다. 여기에는 예전 수업 방식(폭탄·퀴즈)과 정리 안내만 남는다.
  switch (minigame.type) {
    case 'bomb':
      return <LegacyBombGame key={sessionKey} bomb={minigame} groupId={groupId} template={template} handleMissionComplete={handleMissionComplete} setShowScanner={setShowScanner} />;
    case 'quiz':
      return <LegacyQuizGame key={sessionKey} quiz={minigame} gameRoomId={gameRoom.id} groupId={groupId} enqueueAction={enqueueAction} playVictory={playVictory} />;
    case 'team_battle':
      return <RetiredGameNotice id="volcano" roomId={gameRoom.id} groupId={groupId} onBack={onDismiss}/>;
    default:
      // Fallback for quiz if type is undefined (legacy compatibility)
      if (minigame.question) {
        return <LegacyQuizGame key={sessionKey} quiz={minigame} gameRoomId={gameRoom.id} groupId={groupId} enqueueAction={enqueueAction} playVictory={playVictory} />;
      }
      return null;
  }
}
