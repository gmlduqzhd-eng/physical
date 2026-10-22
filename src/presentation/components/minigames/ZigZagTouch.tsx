import { MovementQuest } from './common/MovementQuest';
import type { MovementQuestProps } from './common/MovementQuest';

/** Keep the existing game ID and score callback for saved lessons and links. */
export const ZigZagTouch = (props: Omit<MovementQuestProps, 'gameId'>) => <MovementQuest {...props} gameId="zigzag"/>;
