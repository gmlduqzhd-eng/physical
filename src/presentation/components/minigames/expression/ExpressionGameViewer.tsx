import { EXPRESSION_GAMES } from './expressionGamesData';
import type { GameResultDetails } from '../../../../domain/gameResultDetails';
import { ExpressionActivityLayout } from '../common/ExpressionActivityLayout';

interface ExpressionGameViewerProps {
  gameType: string;
  onComplete: (score: number, meta?: GameResultDetails) => void;
  onExit?: () => void;
  prepared?: boolean;
}

export const ExpressionGameViewer = ({
  gameType,
  onComplete,
  onExit,
  prepared,
}: ExpressionGameViewerProps) => {
  const gameData = EXPRESSION_GAMES.find(g => g.id === gameType);

  if (!gameData) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800">
        <p className="font-bold text-sm">해당 표현 게임 정보를 찾을 수 없습니다: {gameType}</p>
      </div>
    );
  }

  return (
    <ExpressionActivityLayout
      game={gameData}
      onComplete={onComplete}
      onExit={onExit}
      prepared={prepared}
    />
  );
};
