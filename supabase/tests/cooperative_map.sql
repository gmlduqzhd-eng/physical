\ir assert_isolated.sql
BEGIN;
-- Reuse the existing rollback-only synthetic classroom and actor helpers.
-- The Node driver supplies the reviewed fixture preamble before this file's checks.
SELECT pg_temp.ws_call('owner','expedition-map','start',NULL,'{"mapVersion":2,"settings":{"level":"easy","members":4}}');
SELECT pg_temp.ws_check((pg_temp.ws_call('a','expedition-map','view','g1')->'mapRules'->>'version')='2','new map explicitly opts into version two');
SELECT pg_temp.ws_check((pg_temp.ws_call('a','expedition-map','view','g1')->'mapRules'->'brief'->>'role')='first','first team gets only the first-path brief');
SELECT pg_temp.ws_check(NOT ((pg_temp.ws_call('a','expedition-map','view','g1')->'mapRules'->'brief')?'signals'),'first team cannot read the carrying signals');
SELECT pg_temp.ws_check((pg_temp.ws_call('c','expedition-map','view','g2')->'mapRules'->'brief'->>'role')='last','second team gets the destination brief');
SELECT pg_temp.ws_check((pg_temp.ws_call('e','expedition-map','view','g3')->'mapRules'->'brief'->>'role')='signal','third team owns the independent carrying information');
SELECT pg_temp.ws_check(jsonb_array_length(pg_temp.ws_call('e','expedition-map','view','g3')->'mapRules'->'brief'->'signals')=3,'carrying team can convey three agreements');
SELECT pg_temp.ws_check((pg_temp.ws_call('viewer','expedition-map')->'mapRules'->'brief')='null'::jsonb,'TV receives no secret brief');
SELECT pg_temp.ws_check((pg_temp.ws_call('a','expedition-map','view','g1')->'codes')='null'::jsonb,'student cannot read QR tokens');
SELECT pg_temp.ws_check((pg_temp.ws_call('a','expedition-map','view','g1')->>'seed')='0','student cannot recover route from the seed');
SELECT pg_temp.ws_denied('a','expedition-map','view','g2','{}','42501','student cannot read another team brief');
SELECT pg_temp.ws_denied('other','expedition-map','view',NULL,'{}','42501','other teacher cannot read the room');
SELECT pg_temp.ws_denied('viewer','expedition-map','support','g1','{"kind":"offering"}','42501','TV cannot send a team signal');
UPDATE public.game_rooms SET status='playing' WHERE id=current_setting('ws.room')::uuid;
SELECT pg_temp.ws_denied('a','expedition-map','start',NULL,'{"mapVersion":2}','42501','student cannot replace the expedition');
SELECT pg_temp.ws_call('a','expedition-map','support','g1','{"kind":"need-clue"}');
SELECT pg_temp.ws_check(EXISTS(SELECT 1 FROM jsonb_array_elements(pg_temp.ws_call('c','expedition-map','view','g2')->'groups') g WHERE g->>'id'=current_setting('ws.g1') AND g->>'support'='need-clue'),'help signal is visible without secret disclosure');
SELECT pg_temp.ws_denied('a','expedition-map','support','g2','{"kind":"offering"}','42501','cannot edit another team support');
SELECT pg_temp.ws_denied('a','expedition-map','support','g1','{"kind":"complete"}','22023','support cannot mark completion');
DO $$ DECLARE phase integer; who text; team text; token text; expected text; signal text; i integer; order_path text[]; seed integer; before_revision bigint; BEGIN
 SELECT e.seed INTO seed FROM physical_internal.expeditions e WHERE room_id=current_setting('ws.room')::uuid AND game='expedition-map';
 order_path:=CASE seed%6 WHEN 0 THEN ARRAY['river','tower','forest'] WHEN 1 THEN ARRAY['tower','forest','river'] WHEN 2 THEN ARRAY['forest','river','tower'] WHEN 3 THEN ARRAY['river','forest','tower'] WHEN 4 THEN ARRAY['forest','tower','river'] ELSE ARRAY['tower','river','forest'] END;
 FOR phase IN 0..2 LOOP
  expected:=order_path[phase+1];
  signal:=pg_temp.ws_call('e','expedition-map','view','g3')->'mapRules'->'brief'->'signals'->>phase;
  token:=pg_temp.ws_call('owner','expedition-map')->'codes'->>expected;
  FOR i IN 1..3 LOOP
   who:=(ARRAY['a','c','e'])[i];team:='g'||i;
   PERFORM pg_temp.ws_call(who,'expedition-map','visit',team,jsonb_build_object('token',token,'movementConfirmed',true));
   PERFORM pg_temp.ws_call(who,'expedition-map','vote',team,jsonb_build_object('station',expected,'gesture',CASE WHEN signal='open' THEN 'wings' ELSE 'open' END));
  END LOOP;
  PERFORM pg_temp.ws_check((pg_temp.ws_call('owner','expedition-map')->>'phase')::integer=phase,'correct route with wrong carrying signal cannot open gate '||phase);
  PERFORM pg_temp.ws_denied('a','expedition-map','vote','g1',jsonb_build_object('station',expected),'22023','missing agreement rejected');
  FOR i IN 1..3 LOOP
   who:=(ARRAY['a','c','e'])[i];team:='g'||i;
   PERFORM pg_temp.ws_call(who,'expedition-map','vote',team,jsonb_build_object('station',expected,'gesture',signal));
  END LOOP;
  PERFORM pg_temp.ws_check((pg_temp.ws_call('owner','expedition-map')->>'phase')::integer=phase+1,'shared route and agreement open gate '||phase);
  PERFORM pg_temp.ws_check(jsonb_array_length(pg_temp.ws_call('a','expedition-map','view','g1')->'mapRules'->'history')=phase+1,'only opened gates enter the ending history');
 END LOOP;
 PERFORM pg_temp.ws_check(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(pg_temp.ws_call('owner','expedition-map')->'groups') g WHERE g->>'done'<>'true'),'all groups complete through validated agreements');
END $$;
UPDATE public.game_rooms SET status='paused' WHERE id=current_setting('ws.room')::uuid;
SELECT pg_temp.ws_denied('a','expedition-map','support','g1','{"kind":"offering"}','42501','pause rejects support mutation');
UPDATE public.game_rooms SET status='finished' WHERE id=current_setting('ws.room')::uuid;
SELECT pg_temp.ws_denied('a','expedition-map','support','g1','{"kind":"offering"}','42501','finished room rejects support mutation');
UPDATE public.game_rooms SET status='waiting' WHERE id=current_setting('ws.room')::uuid;
SELECT pg_temp.ws_call('owner','expedition-map','start');
SELECT pg_temp.ws_check((pg_temp.ws_call('a','expedition-map','view','g1')->'mapRules')='null'::jsonb,'legacy starts retain original rules');
SELECT pg_temp.ws_call('owner','expedition-boss','start',NULL,'{"mapVersion":2,"settings":{"members":4}}');
SELECT pg_temp.ws_check((pg_temp.ws_call('a','expedition-map','view','g1')->'mapRules'->>'version')='2','new boss passes the opt-in rules to its map child');
SELECT pg_temp.ws_check((pg_temp.ws_call('a','expedition-boss','view','g1')->>'phase')='0','boss still waits for its first cooperative gate');
SELECT jsonb_build_object('status','PASS','checks',count(*),'productionMutated',false) FROM pg_temp.workshop_results;
ROLLBACK;
