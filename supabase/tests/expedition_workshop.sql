BEGIN;
CREATE TEMP TABLE workshop_results(label text);
CREATE FUNCTION pg_temp.ws_check(ok boolean,label text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'WORKSHOP FAILED: %',label; END IF; INSERT INTO pg_temp.workshop_results VALUES(label); END $$;
DO $$ DECLARE uid uuid; label text; BEGIN
 FOREACH label IN ARRAY ARRAY['owner','other','a','b','c','d','e','f','viewer'] LOOP
  uid:=gen_random_uuid();INSERT INTO auth.users(id,aud,role,is_anonymous) VALUES(uid,'authenticated','authenticated',true);PERFORM set_config('ws.'||label,uid::text,true);
 END LOOP;
 INSERT INTO physical_internal.teacher_access(user_id,expires_at) VALUES(current_setting('ws.owner')::uuid,now()+interval '2 hours'),(current_setting('ws.other')::uuid,now()+interval '2 hours');
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('ws.owner'),'role','authenticated')::text,true);
 PERFORM set_config('ws.room',public.create_secure_classroom('Workshop rollback fixture',NULL,ARRAY['A','B','C'])->>'id',true);
END $$;
DO $$ DECLARE g record; i integer:=0; BEGIN
 FOR g IN SELECT id FROM public.room_groups WHERE room_id=current_setting('ws.room')::uuid ORDER BY id LOOP
  i:=i+1;PERFORM set_config('ws.g'||i,g.id::text,true);
 END LOOP;
 INSERT INTO physical_internal.classroom_members(room_id,user_id,group_id,expires_at)
 SELECT current_setting('ws.room')::uuid,current_setting('ws.'||x.w)::uuid,current_setting('ws.'||x.g)::uuid,now()+interval '2 hours'
 FROM (VALUES('a','g1'),('b','g1'),('c','g2'),('d','g2'),('e','g3'),('f','g3')) x(w,g);
 INSERT INTO physical_internal.classroom_viewers VALUES(current_setting('ws.room')::uuid,current_setting('ws.viewer')::uuid,now()+interval '2 hours');
END $$;
CREATE FUNCTION pg_temp.ws_call(who text,game text,op text DEFAULT 'view',team text DEFAULT NULL,payload jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rid uuid:=current_setting('ws.room')::uuid; gid uuid; args jsonb; BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('ws.'||who,true),'role','authenticated')::text,true);
 IF team IS NOT NULL THEN gid:=current_setting('ws.'||team)::uuid; END IF;
 UPDATE physical_internal.expeditions SET actors='{}' WHERE room_id=rid;
 SELECT jsonb_build_object('runId',run_id,'requestId',gen_random_uuid()) INTO args FROM physical_internal.expeditions WHERE room_id=rid AND expeditions.game=ws_call.game;
 RETURN public.expedition_action(rid,game,op,gid,coalesce(args,'{}')||payload);
END $$;
CREATE FUNCTION pg_temp.ws_denied(who text,game text,op text,team text,payload jsonb,code text,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 BEGIN PERFORM pg_temp.ws_call(who,game,op,team,payload);EXCEPTION WHEN OTHERS THEN IF SQLSTATE=code THEN PERFORM pg_temp.ws_check(true,label);RETURN;END IF;RAISE; END;
 RAISE EXCEPTION 'WORKSHOP FAILED: accepted %',label;
END $$;

SELECT pg_temp.ws_check(NOT has_function_privilege('anon','public.expedition_action(uuid,text,text,uuid,jsonb)','EXECUTE'),'anonymous RPC denied');
SELECT pg_temp.ws_check(NOT has_function_privilege('authenticated','physical_internal.expedition_settings(jsonb)','EXECUTE'),'settings helper not browser callable');
SELECT pg_temp.ws_check(NOT has_table_privilege('authenticated','physical_internal.expeditions','SELECT'),'private state has no direct SELECT grant');
SELECT pg_temp.ws_check(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='physical_internal.expeditions'::regclass AND contype='f' AND confdeltype='c'),'room deletion cascades to workshop state');
SELECT pg_temp.ws_call('owner','expedition-ship','start',NULL,'{"settings":{"level":"challenge","members":6,"packageMinutes":20,"shipCourse":"zigzag","rhythm":[1,1,0,1,0,0,0,0]}}');
SELECT pg_temp.ws_check(pg_temp.ws_call('owner','expedition-ship')->'workshop'->'settings'->>'shipCourse'='zigzag','canonical editor settings roundtrip');
SELECT pg_temp.ws_denied('owner','expedition-ship','start',NULL,'{"settings":{"studentName":"private"}}','22023','unknown/personal editor fields rejected');
SELECT pg_temp.ws_denied('owner','expedition-ship','start',NULL,'{"settings":{"rhythm":[0,0,0,0,0,0,0,0]}}','22023','empty rhythm rejected');
SELECT pg_temp.ws_denied('owner','expedition-ship','start',NULL,'{"settings":{"members":2.5}}','22023','fractional seats rejected');
SELECT pg_temp.ws_denied('other','expedition-ship','view',NULL,'{}','42501','unrelated teacher cannot read');
SELECT pg_temp.ws_denied('a','expedition-ship','start',NULL,'{}','42501','student cannot restart');
SELECT pg_temp.ws_denied('a','expedition-ship','difficulty','g1','{"level":"easy"}','42501','student cannot set course');
SELECT pg_temp.ws_denied('a','expedition-ship','members','g1','{"members":3}','42501','student cannot set group size');
SELECT pg_temp.ws_denied('a','expedition-ship','observe','g1','{"tags":[]}','42501','student cannot set teacher observations');
SELECT pg_temp.ws_denied('viewer','expedition-ship','readiness',NULL,jsonb_build_object('target',current_setting('ws.g1'),'kind','camera','state','ready'),'42501','TV cannot write readiness');
SELECT pg_temp.ws_denied('a','expedition-ship','readiness',NULL,jsonb_build_object('target',current_setting('ws.g1'),'kind','camera','state','ready'),'42501','omitted group cannot bypass membership');
SELECT pg_temp.ws_denied('a','expedition-ship','readiness','g1',jsonb_build_object('target',current_setting('ws.g2'),'kind','camera','state','ready'),'42501','foreign target rejected');
SELECT pg_temp.ws_check(pg_temp.ws_call('viewer','expedition-ship')->>'owner'='false','TV can read only shared projection');
SELECT pg_temp.ws_denied('owner','expedition-ship','lesson-step',NULL,'{"step":1}','22023','waiting lesson cannot advance');
SELECT pg_temp.ws_call('owner','expedition-ship','members',NULL,jsonb_build_object('target',current_setting('ws.g1'),'members',5));
SELECT pg_temp.ws_check((SELECT groups->current_setting('ws.g1')->'workshop'->>'members'='5' FROM physical_internal.expeditions WHERE room_id=current_setting('ws.room')::uuid AND game='expedition-ship'),'teacher changes own room seats');
UPDATE public.game_rooms SET status='playing' WHERE id=current_setting('ws.room')::uuid;
SELECT pg_temp.ws_call('a','expedition-ship','claim','g1','{"slot":0}');
SELECT pg_temp.ws_call('b','expedition-ship','claim','g1','{"slot":1}');
SELECT pg_temp.ws_call('a','expedition-ship','rotate','g1','{"requestId":"11111111-1111-4111-8111-111111111111"}');
SELECT pg_temp.ws_call('a','expedition-ship','rotate','g1','{"requestId":"11111111-1111-4111-8111-111111111111"}');
SELECT pg_temp.ws_check((SELECT groups->current_setting('ws.g1')->'workshop'->>'roleSwaps'='1' AND groups->current_setting('ws.g1')->'axes'->0->'user'='null'::jsonb AND groups->current_setting('ws.g1')->'axes'->1->'user'='null'::jsonb FROM physical_internal.expeditions WHERE room_id=current_setting('ws.room')::uuid AND game='expedition-ship'),'role rotation idempotent and releases both controllers');
SELECT pg_temp.ws_call('a','expedition-ship','readiness','g1','{"kind":"camera","state":"lost","rawAngle":123,"studentName":"DO_NOT_STORE"}');
SELECT pg_temp.ws_check(pg_temp.ws_call('owner','expedition-ship')::text NOT LIKE '%DO_NOT_STORE%' AND pg_temp.ws_call('owner','expedition-ship')::text NOT LIKE '%rawAngle%','readiness stores only coarse allowlist');
SELECT pg_temp.ws_denied('a','expedition-ship','readiness','g1','{"kind":"camera","state":"ready","runId":"00000000-0000-4000-8000-000000000000"}','22023','stale run cannot report readiness');
SELECT pg_temp.ws_denied('owner','expedition-ship','difficulty',NULL,jsonb_build_object('target',current_setting('ws.g1'),'level','easy'),'22023','playing course changes rejected');
SELECT pg_temp.ws_call('owner','expedition-ship','lesson-step',NULL,'{"step":1}');
SELECT pg_temp.ws_denied('owner','expedition-ship','lesson-step',NULL,'{"step":3}','22023','lesson stage skipping rejected');
SELECT pg_temp.ws_call('owner','expedition-ship','lesson-step',NULL,'{"step":2}');
SELECT pg_temp.ws_call('owner','expedition-ship','lesson-step',NULL,'{"step":3}');
SELECT pg_temp.ws_check(pg_temp.ws_call('owner','expedition-ship')->'workshop'->>'lessonStep'='3','all four lesson stages connected');
UPDATE public.game_rooms SET status='paused' WHERE id=current_setting('ws.room')::uuid;
UPDATE public.room_groups SET score=35 WHERE id=current_setting('ws.g1')::uuid;
SELECT pg_temp.ws_call('owner','expedition-ship','difficulty',NULL,jsonb_build_object('target',current_setting('ws.g1'),'level','easy'));
SELECT pg_temp.ws_check((SELECT groups->current_setting('ws.g1')->'workshop'->>'level'='easy' AND groups->current_setting('ws.g2')->'workshop'->>'level'='challenge' FROM physical_internal.expeditions WHERE room_id=current_setting('ws.room')::uuid AND game='expedition-ship'),'group course does not change other groups');
SELECT pg_temp.ws_check((SELECT score=35 FROM public.room_groups WHERE id=current_setting('ws.g1')::uuid),'course adjustment preserves awarded classroom points');
SELECT pg_temp.ws_call('owner','expedition-ship','observe',NULL,jsonb_build_object('target',current_setting('ws.g1'),'tags',jsonb_build_array('고른 역할 참여')));
SELECT pg_temp.ws_check(pg_temp.ws_call('owner','expedition-ship')->'workshop'->'observations'->current_setting('ws.g1') ? '고른 역할 참여','owner observations returned');
SELECT pg_temp.ws_check(pg_temp.ws_call('a','expedition-ship','view','g1')->'workshop'->'observations'='{}'::jsonb AND pg_temp.ws_call('viewer','expedition-ship')->'workshop'->'observations'='{}'::jsonb,'observation tags hidden from students and TV');
SELECT pg_temp.ws_denied('owner','expedition-ship','observe',NULL,jsonb_build_object('target',current_setting('ws.g1'),'tags',jsonb_build_array('private free text')),'22023','raw observations rejected');

-- Three independently reset paths: server verifies bound children and ordering.
UPDATE public.game_rooms SET status='playing' WHERE id=current_setting('ws.room')::uuid;
SELECT pg_temp.ws_call('owner','expedition-loop','start');
SELECT pg_temp.ws_check(pg_temp.ws_call('owner','expedition-loop')->'workshop'->>'version'='0','legacy caller receives legacy rhythm version');
SELECT pg_temp.ws_call('e','expedition-loop','loop','g3','{"taps":[0,1800,3600],"loop":[1,0,0,1,0,0,1,0],"movementConfirmed":true}');
SELECT pg_temp.ws_check((SELECT groups->current_setting('ws.g3')->>'quality'='100' FROM physical_internal.expeditions WHERE room_id=current_setting('ws.room')::uuid AND game='expedition-loop'),'old third-group pattern still scores correctly');
SELECT pg_temp.ws_call('owner','expedition-loop','start',NULL,'{"settings":{}}');
SELECT pg_temp.ws_call('e','expedition-loop','loop','g3','{"taps":[0,1200,2400,3600],"loop":[1,0,1,0,1,0,1,0],"movementConfirmed":true}');
SELECT pg_temp.ws_check((SELECT groups->current_setting('ws.g3')->>'quality'='100' FROM physical_internal.expeditions WHERE room_id=current_setting('ws.room')::uuid AND game='expedition-loop'),'new third-group editor rhythm scores correctly');
DO $$ DECLARE route_name text; path text[]; child text; result jsonb; gid text; who text; idx integer; childop text; BEGIN
 FOREACH route_name IN ARRAY ARRAY['balanced','rescue','shadow'] LOOP
  result:=pg_temp.ws_call('owner','expedition-boss','start',NULL,jsonb_build_object('settings',jsonb_build_object('route',route_name)));
  SELECT physical_internal.expedition_route(config) INTO path FROM physical_internal.expeditions WHERE room_id=current_setting('ws.room')::uuid AND game='expedition-boss';
  PERFORM pg_temp.ws_check(result->'workshop'->'settings'->>'route'=route_name,'boss route '||route_name);
  child:=path[2];childop:=CASE WHEN child='expedition-ship' THEN 'claim' ELSE 'complete' END;
  PERFORM pg_temp.ws_denied('a',child,childop,'g1','{"slot":0,"mode":"assisted","movementConfirmed":true}','42501','prior gate blocks '||route_name);
  -- Fixture advancement isolates sequence/binding tests from hardware/scoring tests.
  UPDATE physical_internal.expeditions SET phase=3,groups=(SELECT jsonb_object_agg(key,value||jsonb_build_object('done',true)) FROM jsonb_each(groups)) WHERE room_id=current_setting('ws.room')::uuid AND game=path[1];
  PERFORM pg_temp.ws_check(pg_temp.ws_call('owner','expedition-boss')->>'phase'='1','first bound gate advances '||route_name);
  IF path[2]='expedition-rescue' THEN
   PERFORM pg_temp.ws_call('a',path[2],'complete','g1','{"mode":"assisted","movementConfirmed":true}');
  ELSE
   PERFORM pg_temp.ws_call('a',path[2],'claim','g1','{"slot":0}');
  END IF;
  PERFORM pg_temp.ws_denied('a',path[3],CASE WHEN path[3]='expedition-loop' THEN 'loop' ELSE 'complete' END,'g1','{"mode":"assisted","movementConfirmed":true,"taps":[0],"loop":[1,0,0,0,0,0,0,0]}','42501','third gate waits for all groups '||route_name);
  PERFORM pg_temp.ws_call('owner','expedition-boss','rotate',NULL,jsonb_build_object('target',current_setting('ws.g1')));
  PERFORM pg_temp.ws_check((SELECT (groups->current_setting('ws.g1')->'workshop'->>'roleSwaps')::integer=1 FROM physical_internal.expeditions WHERE room_id=current_setting('ws.room')::uuid AND game=path[2]),'teacher rotates active child '||route_name);
  UPDATE physical_internal.expeditions SET groups=(SELECT jsonb_object_agg(key,value||jsonb_build_object('done',true)) FROM jsonb_each(groups)) WHERE room_id=current_setting('ws.room')::uuid AND game=path[2];
  PERFORM pg_temp.ws_check(pg_temp.ws_call('owner','expedition-boss')->>'phase'='2','second bound gate advances '||route_name);
  FOR idx IN 1..3 LOOP
   gid:='g'||idx;who:=(ARRAY['a','c','e'])[idx];
   IF path[3]='expedition-shadow' THEN
    PERFORM pg_temp.ws_call(who,path[3],'complete',gid,'{"mode":"assisted","movementConfirmed":true}');
   ELSE
    PERFORM pg_temp.ws_call(who,path[3],'loop',gid,CASE WHEN idx%2=1 THEN '{"taps":[0,1200,2400,3600],"loop":[1,0,1,0,1,0,1,0],"movementConfirmed":true}' ELSE '{"taps":[600,1800,3000,4200],"loop":[0,1,0,1,0,1,0,1],"movementConfirmed":true}' END::jsonb);
   END IF;
  END LOOP;
  result:=pg_temp.ws_call('owner','expedition-boss');
  PERFORM pg_temp.ws_check(result->>'phase'='3' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(result->'groups') g WHERE g->>'done'<>'true'),'all groups complete '||route_name);
  PERFORM pg_temp.ws_check(jsonb_array_length(result->'groups'->0->'workshop'->'contributions')=3,'boss report includes actual child contributions '||route_name);
 END LOOP;
END $$;
UPDATE public.game_rooms SET status='finished' WHERE id=current_setting('ws.room')::uuid;
SELECT pg_temp.ws_denied('a','expedition-boss','rotate','g1','{}','42501','finished role writes denied');
SELECT pg_temp.ws_call('owner','expedition-boss','observe',NULL,jsonb_build_object('target',current_setting('ws.g1'),'tags',jsonb_build_array('고른 역할 참여')));
SELECT pg_temp.ws_check(pg_temp.ws_call('owner','expedition-boss')->'workshop'->'observations'->current_setting('ws.g1') ? '고른 역할 참여','finished owner may finish observation summary');
UPDATE physical_internal.classroom_members SET expires_at=now()-interval '1 second' WHERE user_id=current_setting('ws.a')::uuid;
SELECT pg_temp.ws_denied('a','expedition-boss','view',NULL,'{}','42501','expired membership cannot read final workshop');
SELECT jsonb_build_object('assertions',count(*),'passed',jsonb_agg(label)) AS workshop_result FROM pg_temp.workshop_results;
ROLLBACK;
