import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {matchesActivitySearch} from '../src/domain/activitySearch';
import {MERGED_GAMES} from '../src/domain/gameLifecycle';
import {mergedMovementMeta} from '../src/domain/mergedMovementVariants';
test('search accepts whitespace, multiple terms and case without requiring exact phrases',()=>{
 const game=AVAILABLE_GAMES.find(g=>g.type==='red_green')!;
 assert(matchesActivitySearch(game,'  신호등  구조  '));assert(matchesActivitySearch(game,'RED_GREEN'));
 assert(matchesActivitySearch(game,'  '));assert(!matchesActivitySearch(game,'없는활동123'));
});
test('all historical and current merged course names find their available parent',()=>{
 for(const course of MERGED_GAMES){const root=AVAILABLE_GAMES.find(g=>g.type===course.target)!;assert(root);assert(matchesActivitySearch(root,course.name),course.id);const meta=mergedMovementMeta(course.id);if(meta)assert(matchesActivitySearch(root,meta.name),course.id);}
});
