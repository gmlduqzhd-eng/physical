import { MovementQuest } from './common/MovementQuest';
import type { MovementQuestProps } from './common/MovementQuest';

export const DribbleRhythm = (props: Omit<MovementQuestProps, 'gameId'>) => <MovementQuest {...props} gameId="dribble-rhythm"/>;
