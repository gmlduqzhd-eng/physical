import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {QUICK_PICK_COUNT,QUICK_SITUATIONS,fitsSituation,quickPicks,situationPool} from '../src/domain/quickPicks';
import {FEATURED_GAMES} from '../src/domain/featuredGames';
import {activityFit} from '../src/domain/activityFit';
import {RECENT_ACTIVITIES_MAX,parseRecentActivities,withRecentActivity} from '../src/application/recentActivities';
import {routeTitle} from '../src/domain/routeTitles';

const read=(path:string)=>readFileSync(path,'utf8');

test('each situation gives exactly three featured activities that really fit, and 다른 3개 changes them',()=>{
 assert.deepEqual(QUICK_SITUATIONS.map(s=>s.label),['5분 남았어요','교실에서','준비물 없이','강당·운동장에서']);
 for(const s of QUICK_SITUATIONS){
  const pool=situationPool(s.id);
  assert.ok(pool.length>QUICK_PICK_COUNT,`${s.label} needs more than three featured activities`);
  const first=quickPicks(s.id,0),second=quickPicks(s.id,1);
  assert.equal(first.length,QUICK_PICK_COUNT);assert.equal(new Set(first.map(g=>g.type)).size,QUICK_PICK_COUNT);
  for(const g of [...first,...second]){assert.ok(FEATURED_GAMES.includes(g),g.type);assert.ok(fitsSituation(g,s.id),`${g.type} fits ${s.label}`);}
  assert.notDeepEqual(first.map(g=>g.type),second.map(g=>g.type));
  // 같은 상황·같은 차례면 늘 같은 3개
  assert.deepEqual(quickPicks(s.id,0).map(g=>g.type),first.map(g=>g.type));
 }
 for(const g of quickPicks('five'))assert.ok(activityFit(g).minutes<=5);
 // 맞는 활동이 3개보다 적으면 있는 만큼만
 assert.equal(quickPicks('five',0,FEATURED_GAMES.filter(g=>activityFit(g).minutes<=5).slice(0,2)).length,2);
 assert.deepEqual(quickPicks('five',3,[]),[]);
});

test('recent activities keep the newest first, without repeats, and ignore broken saved values',()=>{
 assert.deepEqual(withRecentActivity(['a','b'],'b'),['b','a']);
 assert.deepEqual(withRecentActivity([],'sig-boss-raid'),['sig-boss-raid']);
 assert.deepEqual(parseRecentActivities(['a',3,null,'a','<script>','b']),['a','b']);
 assert.deepEqual(parseRecentActivities('a'),[]);assert.deepEqual(parseRecentActivities(null),[]);
 const many=Array.from({length:20},(_,i)=>`g-${i}`);
 assert.equal(parseRecentActivities(many).length,RECENT_ACTIVITIES_MAX);
 assert.equal(withRecentActivity(many,'new')[0],'new');
 // 혼자 하기와 수업방 대결에서는 적지 않는다.
 assert.match(read('src/presentation/GamePlayPage.tsx'),/if\(!soloMode&&!hasBattle\)recordRecentActivity\(gameType\)/);
});

test('home shows two big starts, a recent-or-featured shelf, quick picks, and folds the rest',()=>{
 const home=read('src/presentation/UnifiedHomePage.tsx');
 assert.match(home,/data-today-link/);assert.match(home,/data-home-hub/);
 assert.match(home,/지난번에 한 활동/);assert.match(home,/★ 즐겨찾기/);
 assert.match(home,/<QuickPicks returnTo="\/"[^>]*\/>/);
 // 나머지 입구는 '더 보기' 안에 그대로 있다(자리표 id도 그대로).
 const more=home.slice(home.indexOf('<details className="home-more"'),home.indexOf('</details>'));
 for(const part of ['더 보기','id="library-title"','className="roles"','id="encyclopedia-title"','<FeaturedExperiences/>'])assert.ok(more.includes(part),part);
 // 주소의 #자리표가 '더 보기' 안에 있을 때만 펼친다(round 110).
 assert.match(home,/window\.location\.hash\.slice\(1\)/);
 // 첫 화면 선반은 4개까지만
 assert.match(home,/FEATURED_GAMES\.slice\(0, 4\)/);assert.match(home,/readRecentActivities\(\)\)\.slice\(0, 4\)/);
});

test('hub cards are compact: name, one-line rule, people and time, open button; the rest sits under 자세히',()=>{
 const hub=read('src/presentation/ActivityLibrary.tsx');
 const card=hub.slice(hub.indexOf('catalog-card-compact'),hub.indexOf("{!games.length && <div role=\"status\""));
 const more=card.indexOf('<details className="activity-card-more"');
 assert.ok(more>0);
 const top=card.slice(0,more),rest=card.slice(more);
 for(const part of ['activity-name-link','data-card-rule','data-card-meta','card-open','activity-fav'])assert.ok(top.includes(part),`first screen: ${part}`);
 for(const part of ['data-situation','activity-finish','activity-tags','<ActivityDetails','/teacher/setup?game='])assert.ok(rest.includes(part)&&!top.includes(part),`folded: ${part}`);
 assert.match(rest,/<summary aria-label=\{`\$\{g\.name\} 자세히`\}>자세히<\/summary>/);
 // 카드마다 주황 주 버튼을 두지 않는다(고르는 화면의 '이 활동 선택'만 주 버튼).
 assert.match(top,/className="secondary button-wide card-open"/);
 assert.match(hub,/\{!solo&&!onSelect&&<QuickPicks /);
 const css=read('src/presentation/ActivityLibrary.css');
 assert.match(css,/\.catalog-card-compact \.activity-oneline\{[^}]*-webkit-line-clamp:2/);
});

test('text size and TV mode are reachable from the header and the check page',()=>{
 const header=read('src/presentation/components/HeaderUtilities.tsx');
 assert.match(header,/<TextScaleButton\/><TvModeButton\/><ThemeButton\/>/);assert.match(header,/to="\/display-check"/);
 const page=read('src/presentation/DisplayCheckPage.tsx');
 assert.match(page,/뒤에서 보여요\?/);
 for(const scale of ['normal','large','xlarge'])assert.ok(page.includes(`id:'${scale}'`),scale);
 assert.match(page,/<TvModeButton\/>/);assert.match(page,/data-sample-signal/);
 assert.match(read('src/presentation/TeacherGuidePage.tsx'),/to="\/display-check"/);
 assert.match(read('src/App.tsx'),/path="\/display-check"/);
 assert.equal(routeTitle('/display-check').startsWith('뒤에서 보여요?'),true);
 // 아이콘 줄은 한 줄로 오른쪽에 붙고, 좁으면 넘치지 않고 줄을 바꾼다.
 const toolbar=read('src/presentation/components/HeaderToolbar.css');
 assert.match(toolbar,/display:flex; flex-wrap:nowrap/);assert.match(toolbar,/repeat\(auto-fit,minmax\(44px,1fr\)\)/);
});
