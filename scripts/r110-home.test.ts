import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {QUICK_PICK_COUNT,QUICK_SITUATIONS,isNoPrepItem,needsNoSetup,quickPicks,situationPool} from '../src/domain/quickPicks';
import {FEATURED_GAMES} from '../src/domain/featuredGames';
import {activityFit} from '../src/domain/activityFit';

const read=(path:string)=>readFileSync(path,'utf8');

test('equipment lines that say there is nothing to set up count as no-prep; real gear does not',()=>{
 for(const line of ['교사 화면 1대(TV·전자칠판)','준비물 없음','스마트폰 1대 · 별도 준비물 없음','거치한 기기 1대 · 별도 도구 없이 표현','모둠별 1대 · 스피커 선택'])assert.ok(isNoPrepItem(line),line);
 for(const line of ['바닥 표식 3개(왼쪽·가운데·오른쪽, 1~2m 간격) · 코스 1개당','모둠별 1대 · 탐사 지점 QR 3장','부드러운 공 1개 · 짝당','상황 카드','콩주머니 3개(없으면 부드러운 공) · 1인당'])assert.ok(!isNoPrepItem(line),line);
});

test('준비물 없이 includes the signature and expression activities that need no gear, and nothing with gear',()=>{
 const pool=situationPool('noprep').map(g=>g.type);
 for(const id of ['sig-signal-captain','sig-boss-raid','sig-move-bingo','sig-mirror-pair','sig-memory-relay','sig-stage-show','musical_freeze','seed_sprout','weather_dance','cheerleading_team','ganggangsullae','taebo_fitness'])assert.ok(pool.includes(id),id);
 for(const g of situationPool('noprep'))assert.ok(needsNoSetup(g),g.type);
 for(const id of ['target','zigzag','exp-phone-03','expedition-map','cpr-compression-110'])assert.ok(!pool.includes(id),id);
});

test('5분 남았어요 only offers short activities that need no setup, three at a time without repeats',()=>{
 const pool=situationPool('five');
 assert.ok(pool.length>QUICK_PICK_COUNT);
 for(const g of pool){assert.ok(activityFit(g).minutes<=5,g.type);assert.ok(needsNoSetup(g),g.type);}
 for(let round=0;round<pool.length;round++){const picks=quickPicks('five',round);assert.equal(picks.length,QUICK_PICK_COUNT);assert.equal(new Set(picks.map(g=>g.type)).size,QUICK_PICK_COUNT);}
 for(const s of QUICK_SITUATIONS)for(const g of quickPicks(s.id,0))assert.ok(FEATURED_GAMES.includes(g));
 assert.match(QUICK_SITUATIONS.find(s=>s.id==='five')!.note,/준비물 없이/);
});

test('text size zooms page content instead of only the root font size, and leaves game arenas alone',()=>{
 const css=read('src/presentation/components/DisplayButtons.css');
 assert.doesNotMatch(css,/html\[data-text-scale="(large|xlarge)"\]\{font-size/,'root font size no longer changes (rem text would grow twice inside zoom)');
 assert.match(css,/data-text-scale="large"\] main:not\(\.fun-intro,\.fun-arena,\.phone-class\):not\(:has\(\.fun-intro,\.fun-arena,\.phone-class,\.gameplay-content\)\)\{zoom:1\.125\}/);
 assert.match(css,/data-text-scale="xlarge"\] main:not[^{]*\{zoom:1\.25\}/);
 // 기기 정보 지우기를 누르면 화면 보기 설정도 바로 돌아온다.
 assert.match(read('src/application/displayPrefs.ts'),/physical-device-cleared/);
});

test('hub quick picks show the pressed choice, details stay in place, and long rules may use a third line when text is larger',()=>{
 const qp=read('src/presentation/components/QuickPicks.css');
 assert.match(qp,/\.quick-picks \.quick-picks-situations button\[aria-pressed="true"\]\{background:#0e7490 !important/);
 const hub=read('src/presentation/ActivityLibrary.css');
 assert.match(hub,/\.grid\.three\{gap:22px;align-items:start\}/);
 assert.doesNotMatch(hub,/details\.activity-card-more\[open\]\{flex:1 1 100%\}/);
 assert.match(hub,/data-text-scale="large"\],\[data-text-scale="xlarge"\]\) [^{]*\.activity-oneline\{-webkit-line-clamp:3\}/);
});

test('home puts quick picks right under the hero and only opens 더 보기 for anchors that live inside it',()=>{
 const home=read('src/presentation/UnifiedHomePage.tsx');
 assert.ok(home.indexOf('<QuickPicks')<home.indexOf('className="home-featured"'),'quick picks come before the recent shelf');
 assert.match(home,/target\?\.closest\('\[data-home-more\]'\)/);
 assert.match(home,/scrollIntoView/);
 assert.doesNotMatch(home,/useState\(\(\) => typeof window !== 'undefined' && window\.location\.hash\.length > 1\)/);
 assert.match(read('src/presentation/UnifiedHomePage.css'),/html\.dark-theme \.unified-home \.home-more\{background:#202224/);
 assert.match(read('src/presentation/PrivacyPage.tsx'),/지난번에 한 활동.*최대 8개.*TV 모드·글씨 크기/);
});
