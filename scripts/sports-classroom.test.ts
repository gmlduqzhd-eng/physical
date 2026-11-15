import test from 'node:test';
import assert from 'node:assert/strict';
import {awardReady,startScores,parseLessonProgress,blankResults,TEAM_COLORS,SPORT_EVENTS,SPORT_BY_ID,SPORT_GROUPS,RECOMMENDED_SPORTS,SPORT_FILTERS,filterSports,rankTeams,formatResult,addMedals,medalStandings,parseMedalTally,LESSON_STAGES} from '../src/domain/sportsClassroom';

test('all 28 sports carry what a lesson needs: rules, gear, safety, warm-up, roles, a goal and a reflection',()=>{
 assert.equal(SPORT_EVENTS.length,28);assert.equal(new Set(SPORT_EVENTS.map(e=>e.id)).size,28);assert.equal(LESSON_STAGES.length,6);
 for(const e of SPORT_EVENTS){
  assert(e.id in Object.fromEntries(SPORT_BY_ID)&&e.group in SPORT_GROUPS,e.id);
  for(const text of [e.name,e.sub,e.guide,e.missionTitle,e.easyTip,e.goal,e.reflect])assert(text.trim().length>1,e.id);
  for(const list of [e.gear,e.rules,e.safety,e.warmup,e.roles,e.easy,e.place,e.grades])assert(list.length>0,e.id);
  assert(e.rules.length>=2&&e.safety.length>=1,e.id);assert(e.timers.every(t=>Number.isInteger(t)&&t>0),e.id);
  if(e.mode==='score')assert(e.values?.length&&e.values.every(v=>v>0),e.id+' score buttons');else assert.equal(e.mode,'time',e.id);
 }
 for(const id of RECOMMENDED_SPORTS)assert(SPORT_BY_ID.has(id),id);
});
test('filters narrow by place, gear, noise and grade, and every sport is reachable',()=>{
 assert.equal(filterSports('all').length,28);assert.equal(filterSports('recommended').length,RECOMMENDED_SPORTS.length);
 for(const e of filterSports('classroom'))assert(e.place.includes('교실'));for(const e of filterSports('lowgear'))assert(e.lowGear);for(const e of filterSports('quiet'))assert(e.quiet);
 for(const e of filterSports('all','1-2'))assert(e.grades.includes('1-2'));assert(filterSports('all','1-2').length<28);
 for(const f of SPORT_FILTERS)assert(filterSports(f.id).length>0,f.id);
});
test('ranking follows the kind of match, shares a rank on a tie and leaves unfinished teams out',()=>{
 const score={mode:'score' as const},golf={mode:'score' as const,lowerWins:true},race={mode:'time' as const};
 assert.deepEqual(rankTeams(score,[{team:0,value:3},{team:1,value:7},{team:2,value:5}]).map(r=>[r.team,r.medal]),[[1,'gold'],[2,'silver'],[0,'bronze']]);
 assert.deepEqual(rankTeams(golf,[{team:0,value:3},{team:1,value:7}]).map(r=>r.team),[0,1]);
 assert.deepEqual(rankTeams(race,[{team:0,value:42.5},{team:1,value:39},{team:2,value:null}]).map(r=>[r.team,r.rank]),[[1,1],[0,2]]);
 const tie=rankTeams(score,[{team:0,value:5},{team:1,value:5},{team:2,value:2},{team:3,value:1}]);
 assert.deepEqual(tie.map(r=>[r.rank,r.medal]),[[1,'gold'],[1,'gold'],[3,'bronze'],[4,null]]);
 assert.equal(formatResult(race,75.25),'1분 15.3초');assert.equal(formatResult(race,9),'9.0초');assert.equal(formatResult({mode:'score',unit:'타'},4),'4타');
});
test('class medals add up across lessons, sort gold first and ignore damaged stored data',()=>{
 let tally=addMedals({},[{team:0,medal:'gold'},{team:1,medal:'silver'},{team:2,medal:null}]);
 tally=addMedals(tally,[{team:1,medal:'gold'},{team:0,medal:'silver'},{team:9,medal:'gold'}]);
 assert.deepEqual(medalStandings(tally).map(m=>[m.team,m.gold,m.silver,m.bronze]),[['청팀',1,1,0],['홍팀',1,1,0]]);
 tally=addMedals(tally,[{team:1,medal:'bronze'}]);assert.equal(medalStandings(tally)[0].team,'홍팀');
 assert.deepEqual(parseMedalTally({청팀:{gold:2,silver:-1,bronze:'x'},악성:{gold:9},홍팀:null}),{청팀:{gold:2,silver:0,bronze:0}});
 assert.deepEqual(parseMedalTally('nope'),{});assert.deepEqual(parseMedalTally(JSON.parse(JSON.stringify(tally))),tally);
});
test('medals wait until every team has a result, and an unplayed golf team cannot win',()=>{
 const basketball=SPORT_BY_ID.get('basketball')!,golf=SPORT_BY_ID.get('golf')!,relay=SPORT_BY_ID.get('relay')!;
 assert(golf.lowerWins,'golf is the lower-score-wins sport');
 assert.equal(awardReady(blankResults().slice(0,2)),false,'nobody played yet');
 assert.deepEqual(startScores(basketball,[null,null,null]),[0,0,0],'starting a score match puts every team on 0');
 assert.deepEqual(startScores(golf,[null,4]),[null,4],'golf teams must record their own strokes');
 assert.deepEqual(startScores(relay,[null,12.3]),[null,12.3]);
 assert.equal(awardReady([null,4]),false);assert.equal(awardReady([3,4]),true);assert.equal(awardReady([12.3,null]),false);
 assert.deepEqual(rankTeams(golf,[{team:0,value:null},{team:1,value:4}]).map(r=>r.team),[1]);
 for(const c of TEAM_COLORS)assert.match(c,/^var\(--sports-team-\d\)$/,'team colours come from theme-aware CSS variables');
});
test('lesson progress survives a refresh only for the same sport and only when it is valid',()=>{
 const ok={sport:'archery',stage:3,teams:3,level:'hard',scores:[2,null,5,null],awarded:true};
 assert.deepEqual(parseLessonProgress(ok,'archery'),ok);
 assert.equal(parseLessonProgress(ok,'golf'),null);
 for(const bad of [{...ok,stage:9},{...ok,teams:5},{...ok,level:'x'},{...ok,scores:[1,2]},{...ok,scores:[1,'a',null,null]},null,'x'])assert.equal(parseLessonProgress(bad,'archery'),null);
 assert.equal(parseLessonProgress({...ok,awarded:'yes'},'archery')!.awarded,false);
});
