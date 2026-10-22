import { MovementQuest } from './common/MovementQuest';
import type { MovementQuestProps } from './common/MovementQuest';

export const PassGateRescue = (props: Omit<MovementQuestProps, 'gameId'>) => <MovementQuest {...props} gameId="pass-gate-rescue"/>;
