/**
 * 가벼운 활동 목록(종류·이름)을 만든다. 학생 폰 화면이 큰 활동 자료(gamesData) 전체를 받지 않게 하려는 것.
 * 활동을 더하거나 이름을 바꾸면: npm run gen:game-index
 * scripts/game-index.test.ts가 이 파일이 gamesData와 같은지 확인한다.
 */
import { writeFileSync } from 'node:fs';
import { GAMES } from '../src/domain/gamesData';

export function renderGameIndex(): string {
  const rows = GAMES.map(game => `  [${JSON.stringify(game.type)}, ${JSON.stringify(game.name)}],`).join('\n');
  return `// 자동으로 만든 파일이에요. 고치지 말고 \`npm run gen:game-index\`를 다시 돌려요.\n// 학생 폰처럼 활동 종류·이름만 필요한 곳에서 gamesData 대신 쓴다.\nexport const GAME_INDEX: readonly (readonly [type: string, name: string])[] = [\n${rows}\n];\n`;
}

if (process.argv[1]?.endsWith('gen-game-index.ts')) {
  writeFileSync(new URL('../src/domain/gameIndex.generated.ts', import.meta.url), renderGameIndex());
  console.log('wrote src/domain/gameIndex.generated.ts', GAMES.length);
}
