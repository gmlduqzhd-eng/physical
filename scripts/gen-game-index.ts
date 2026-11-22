/**
 * 가벼운 활동 목록을 만든다. 큰 활동 자료(gamesData) 전체를 받지 않아도 되는 화면이 쓴다.
 * - gameIndex.generated.ts: 종류·이름(학생 폰 화면)
 * - homeIndex.generated.ts: 종류·이름·그림 글자·개수·추천 활동의 빠른 추천 정보·합쳐진 활동 이어 주기(첫 화면)
 * 활동을 더하거나 이름을 바꾸면: npm run gen:game-index
 * scripts/game-index.test.ts가 두 파일이 gamesData와 같은지 확인한다.
 */
import { writeFileSync } from 'node:fs';
import { AVAILABLE_GAMES, GAMES } from '../src/domain/gamesData';
import { PHONE_PLAYS } from '../src/domain/phonePlayCatalog';
import { FEATURED_GAMES } from '../src/domain/featuredGames';
import { activityFit } from '../src/domain/activityFit';
import { QUICK_SITUATIONS, fitsSituation } from '../src/domain/quickPicks';
import { MERGED_GAMES, getMergedGame } from '../src/domain/gameLifecycle';

const HEAD = '// 자동으로 만든 파일이에요. 고치지 말고 `npm run gen:game-index`를 다시 돌려요.\n';

export function renderGameIndex(): string {
  const rows = GAMES.map(game => `  [${JSON.stringify(game.type)}, ${JSON.stringify(game.name)}],`).join('\n');
  return `${HEAD}// 학생 폰처럼 활동 종류·이름만 필요한 곳에서 gamesData 대신 쓴다.\nexport const GAME_INDEX: readonly (readonly [type: string, name: string])[] = [\n${rows}\n];\n`;
}

/** 빠른 추천 카드에 적는 인원 말(QuickPicks가 쓰던 식 그대로). */
export const peopleLabel = (game: Parameters<typeof activityFit>[0]) => { const fit = activityFit(game); return fit.wholeClass ? '반 전체' : fit.people[0] ?? '모둠'; };

export function renderHomeIndex(): string {
  const available = new Set(AVAILABLE_GAMES.map(game => game.type));
  const games = GAMES.map(game => `  [${JSON.stringify(game.type)}, ${JSON.stringify(game.name)}, ${JSON.stringify(game.emoji)}, ${available.has(game.type) ? 1 : 0}],`).join('\n');
  const featured = FEATURED_GAMES.map(game => `  [${JSON.stringify(game.type)}, ${activityFit(game).minutes}, ${JSON.stringify(peopleLabel(game))}, ${JSON.stringify(QUICK_SITUATIONS.filter(s => fitsSituation(game, s.id)).map(s => s.id).join(' '))}],`).join('\n');
  const domains = ['운동', '스포츠', '표현'].map(name => `${JSON.stringify(name)}: ${AVAILABLE_GAMES.filter(game => game.domain === name).length}`).join(', ');
  const merged = [...new Set(MERGED_GAMES.map(game => game.id))].flatMap(id => { const target = getMergedGame(id)?.target; return target ? [`  ${JSON.stringify(id)}: ${JSON.stringify(target)},`] : []; });
  return `${HEAD}// 첫 화면이 gamesData·phonePlayCatalog·lessonGameCatalog 전체를 받지 않게 하려는 가벼운 목록이다.\n`
    + `/** 모든 활동: 종류, 이름, 그림 글자, 지금 쓸 수 있는지(1/0). */\nexport const HOME_GAMES: readonly (readonly [type: string, name: string, emoji: string, available: 0 | 1])[] = [\n${games}\n];\n`
    + `/** 추천 활동(추천 순서): 종류, 분, 인원 말, 맞는 빠른 추천 상황(빈칸으로 나눔). */\nexport const HOME_FEATURED: readonly (readonly [type: string, minutes: number, people: string, situations: string])[] = [\n${featured}\n];\n`
    + `export const HOME_COUNTS = { total: ${AVAILABLE_GAMES.length}, phone: ${PHONE_PLAYS.length}, domains: { ${domains} } } as const;\n`
    + `/** 합쳐진 활동 → 이어지는 활동. */\nexport const HOME_MERGED: Readonly<Record<string, string>> = {\n${merged.join('\n')}\n};\n`;
}

if (process.argv[1]?.endsWith('gen-game-index.ts')) {
  writeFileSync(new URL('../src/domain/gameIndex.generated.ts', import.meta.url), renderGameIndex());
  writeFileSync(new URL('../src/domain/homeIndex.generated.ts', import.meta.url), renderHomeIndex());
  console.log('wrote src/domain/gameIndex.generated.ts, homeIndex.generated.ts', GAMES.length);
}
