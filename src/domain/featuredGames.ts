import { GAMES } from './gamesData';

// These activities have their own introduction and a result callback. Keep the
// wider catalog searchable while giving a teacher a manageable starting set.
export const FEATURED_GAME_IDS = [
  'space-occupier', 'relay-mission-runner', 'body-rhythm-orchestrator',
  'pulse-detective', 'posture-guardian', 'rolling-curling',
  'pass-gate-rescue', 'dribble-rhythm', 'open-space-tactician',
  'emotion-thermometer', 'partner-robot-lab',
] as const;

export const FEATURED_GAMES = FEATURED_GAME_IDS.map(id => {
  const game = GAMES.find(item => item.type === id);
  if (!game) throw new Error(`대표 활동이 목록에 없습니다: ${id}`);
  return game;
});
