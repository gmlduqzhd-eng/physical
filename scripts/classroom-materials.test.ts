import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINT_FOR_ACTIVITY,PRINT_SET_IDS,printSet,printHref} from '../src/domain/printSets';
import {LAYOUTS,layoutFor} from '../src/domain/layoutDiagrams';
import {isAvailableGame} from '../src/domain/gameLifecycle';
import {SAFETY_LESSON_IDS,SAFETY_LESSONS} from '../src/domain/safetyLessons';
import {EXPEDITION_GAMES} from '../src/domain/expeditionGames';

test('every print sheet has cards, and every activity that needs one links to a real sheet',()=>{
 for(const id of PRINT_SET_IDS){const s=printSet(id)!;assert(s.cards.length>=4&&s.title&&s.note,id);}
 assert.equal(printSet('numbers9')!.cards.length,9);assert.equal(printSet('spots6')!.cards.length,6);
 for(const [activity,set] of Object.entries(PRINT_FOR_ACTIVITY)){assert(isAvailableGame(activity),activity);assert(printSet(set),`${activity} → ${set}`);assert.equal(printHref(activity),`/print?set=${set}`);}
 for(const id of SAFETY_LESSON_IDS){const s=printSet(id)!;assert(s.cards.filter(c=>c.text).length===SAFETY_LESSONS[id].scenarios.length,`${id} prints every situation`);assert(s.cards.some(c=>!c.text),`${id} has picture cards`);}
 assert.equal(printSet('nope'),null);assert.equal(printHref('red_green'),null);
});
test('layout diagrams exist for every tool-using expedition and point only at offered activities',()=>{
 for(const id of Object.keys(LAYOUTS))assert(isAvailableGame(id),id);
 for(const g of EXPEDITION_GAMES.filter(g=>g.kind==='B'&&isAvailableGame(g.id)))assert(layoutFor(g.id),`${g.id} has a layout diagram`);
 for(const [id,spec] of Object.entries(LAYOUTS)){assert(spec.caption.length>5,id);if(['row','grid','star','targets','wall','lanes','zones'].includes(spec.kind))assert(spec.labels.length>0,id);}
 assert.equal(layoutFor('exp-tablet-01').labels.length,6);assert.equal(layoutFor('zigzag').labels.length,9);
});
