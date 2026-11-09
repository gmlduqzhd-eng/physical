BEGIN;
CREATE FUNCTION pg_temp.check_it(value boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'FLAGSHIP FAILED: %',label; END IF; END $$;
DO $$ DECLARE uid uuid; label text; BEGIN
 FOREACH label IN ARRAY ARRAY['owner','other','a','b','c','d','viewer'] LOOP
 uid:=gen_random_uuid();INSERT INTO auth.users(id,aud,role,is_anonymous) VALUES(uid,'authenticated','authenticated',true);PERFORM set_config('exp.'||label,uid::text,true);END LOOP;
 INSERT INTO physical_internal.teacher_access(user_id,expires_at) VALUES(current_setting('exp.owner')::uuid,now()+interval '2 hours'),(current_setting('exp.other')::uuid,now()+interval '2 hours');
END $$;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('exp.owner'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT set_config('exp.room',public.create_secure_classroom('Flagship disposable fixture',NULL,ARRAY['A','B','C'])->>'id',true);
UPDATE public.game_rooms SET status='playing' WHERE id=current_setting('exp.room')::uuid;
SELECT pg_temp.check_it((public.expedition_action(current_setting('exp.room')::uuid,'expedition-map','start')->>'owner')::boolean,'owner starts');
RESET ROLE;
SELECT set_config('exp.g1',(SELECT id::text FROM public.room_groups WHERE room_id=current_setting('exp.room')::uuid ORDER BY id LIMIT 1),true);
SELECT set_config('exp.g2',(SELECT id::text FROM public.room_groups WHERE room_id=current_setting('exp.room')::uuid ORDER BY id OFFSET 1 LIMIT 1),true);
SELECT set_config('exp.g3',(SELECT id::text FROM public.room_groups WHERE room_id=current_setting('exp.room')::uuid ORDER BY id OFFSET 2 LIMIT 1),true);
INSERT INTO physical_internal.classroom_members(room_id,user_id,group_id,expires_at) VALUES
 (current_setting('exp.room')::uuid,current_setting('exp.a')::uuid,current_setting('exp.g1')::uuid,now()+interval '2 hours'),
 (current_setting('exp.room')::uuid,current_setting('exp.b')::uuid,current_setting('exp.g1')::uuid,now()+interval '2 hours'),
 (current_setting('exp.room')::uuid,current_setting('exp.c')::uuid,current_setting('exp.g2')::uuid,now()+interval '2 hours'),
 (current_setting('exp.room')::uuid,current_setting('exp.d')::uuid,current_setting('exp.g3')::uuid,now()+interval '2 hours');
SELECT set_config('exp.run',(SELECT run_id::text FROM physical_internal.expeditions WHERE room_id=current_setting('exp.room')::uuid AND game='expedition-map'),true);
SELECT set_config('exp.token',(SELECT config->'codes'->>'forest' FROM physical_internal.expeditions WHERE room_id=current_setting('exp.room')::uuid AND game='expedition-map'),true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('exp.a'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.check_it(public.expedition_action(current_setting('exp.room')::uuid,'expedition-map','view',current_setting('exp.g1')::uuid)->'codes'='null'::jsonb,'student cannot read station tokens');
SELECT pg_temp.check_it(length(public.expedition_action(current_setting('exp.room')::uuid,'expedition-map','view',current_setting('exp.g1')::uuid)->>'clue')>0,'own private clue');
DO $$ BEGIN BEGIN PERFORM public.expedition_action(current_setting('exp.room')::uuid,'expedition-map','view',current_setting('exp.g2')::uuid);RAISE EXCEPTION 'foreign group clue read';EXCEPTION WHEN insufficient_privilege THEN NULL;END;END $$;
DO $$ BEGIN BEGIN PERFORM public.expedition_action(current_setting('exp.room')::uuid,'expedition-map','start');RAISE EXCEPTION 'student reset game';EXCEPTION WHEN insufficient_privilege THEN NULL;END;END $$;
DO $$ BEGIN BEGIN PERFORM public.expedition_action(current_setting('exp.room')::uuid,'expedition-map','visit',current_setting('exp.g1')::uuid,jsonb_build_object('runId',current_setting('exp.run'),'requestId',gen_random_uuid(),'token','wrong','movementConfirmed',true));RAISE EXCEPTION 'wrong token accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;END $$;
SELECT public.expedition_action(current_setting('exp.room')::uuid,'expedition-map','visit',current_setting('exp.g1')::uuid,jsonb_build_object('runId',current_setting('exp.run'),'requestId',gen_random_uuid(),'token',current_setting('exp.token'),'movementConfirmed',true));
RESET ROLE;
SELECT pg_temp.check_it((SELECT groups->current_setting('exp.g1')->'visited' ? 'forest' FROM physical_internal.expeditions WHERE room_id=current_setting('exp.room')::uuid AND game='expedition-map'),'station recorded');
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('exp.other'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN BEGIN PERFORM public.expedition_action(current_setting('exp.room')::uuid,'expedition-map');RAISE EXCEPTION 'unrelated teacher read';EXCEPTION WHEN insufficient_privilege THEN NULL;END;END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('exp.owner'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT public.expedition_action(current_setting('exp.room')::uuid,'expedition-ship','start');
SELECT public.expedition_action(current_setting('exp.room')::uuid,'expedition-loop','start');
RESET ROLE;
SELECT set_config('exp.shiprun',(SELECT run_id::text FROM physical_internal.expeditions WHERE room_id=current_setting('exp.room')::uuid AND game='expedition-ship'),true);
SELECT set_config('exp.looprun',(SELECT run_id::text FROM physical_internal.expeditions WHERE room_id=current_setting('exp.room')::uuid AND game='expedition-loop'),true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('exp.a'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT public.expedition_action(current_setting('exp.room')::uuid,'expedition-ship','claim',current_setting('exp.g1')::uuid,jsonb_build_object('runId',current_setting('exp.shiprun'),'requestId',gen_random_uuid(),'slot',0));
RESET ROLE;
UPDATE physical_internal.expeditions SET actors='{}' WHERE room_id=current_setting('exp.room')::uuid;
SET LOCAL ROLE authenticated;
DO $$ BEGIN BEGIN PERFORM public.expedition_action(current_setting('exp.room')::uuid,'expedition-ship','claim',current_setting('exp.g1')::uuid,jsonb_build_object('runId',current_setting('exp.shiprun'),'requestId',gen_random_uuid(),'slot',1));RAISE EXCEPTION 'same device claimed both axes';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;END $$;
DO $$ BEGIN BEGIN PERFORM public.expedition_action(current_setting('exp.room')::uuid,'expedition-ship','steer',current_setting('exp.g1')::uuid,jsonb_build_object('runId',current_setting('exp.shiprun'),'requestId',gen_random_uuid(),'slot',0));RAISE EXCEPTION 'null steering accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('exp.b'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT public.expedition_action(current_setting('exp.room')::uuid,'expedition-ship','claim',current_setting('exp.g1')::uuid,jsonb_build_object('runId',current_setting('exp.shiprun'),'requestId',gen_random_uuid(),'slot',1));
SELECT pg_temp.check_it(public.expedition_action(current_setting('exp.room')::uuid,'expedition-ship','view',current_setting('exp.g1')::uuid)::text NOT LIKE '%'||current_setting('exp.a')||'%','controller identity not exposed');
RESET ROLE;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('exp.a'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT public.expedition_action(current_setting('exp.room')::uuid,'expedition-loop','loop',current_setting('exp.g1')::uuid,jsonb_build_object('runId',current_setting('exp.looprun'),'requestId',gen_random_uuid(),'taps',jsonb_build_array(0,1200,2400,3600),'loop',jsonb_build_array(1,0,1,0,1,0,1,0),'movementConfirmed',true));
RESET ROLE;
SELECT pg_temp.check_it((SELECT (groups->current_setting('exp.g1')->>'quality')::integer=100 FROM physical_internal.expeditions WHERE room_id=current_setting('exp.room')::uuid AND game='expedition-loop'),'server rhythm score');
-- Two independent controllers drive the actual server simulation to all docks.
DO $$ DECLARE g jsonb; ship jsonb; cp integer; targetx numeric; targety numeric; control numeric; slot integer; who text; response jsonb; BEGIN
 FOR i IN 1..450 LOOP
  SELECT groups->current_setting('exp.g1') INTO g FROM physical_internal.expeditions WHERE room_id=current_setting('exp.room')::uuid AND game='expedition-ship';
  ship:=g->'ship';cp:=(ship->>'checkpoint')::integer;EXIT WHEN cp=3;
  targetx:=(ARRAY[25,75,50])[cp+1];targety:=(ARRAY[25,65,30])[cp+1];
  FOR slot IN 0..1 LOOP
   who:=CASE WHEN slot=0 THEN current_setting('exp.a') ELSE current_setting('exp.b') END;
   control:=CASE WHEN slot=0 THEN (targetx-(ship->>'x')::numeric)*.04-(ship->>'vx')::numeric*.12 ELSE (targety-(ship->>'y')::numeric)*.04-(ship->>'vy')::numeric*.12 END;
   PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',who,'role','authenticated')::text,true);
   UPDATE physical_internal.expeditions SET actors='{}',groups=jsonb_set(groups,ARRAY[current_setting('exp.g1'),'tick'],to_jsonb(extract(epoch FROM clock_timestamp())*1000-150)) WHERE room_id=current_setting('exp.room')::uuid AND game='expedition-ship';
   response:=public.expedition_action(current_setting('exp.room')::uuid,'expedition-ship','steer',current_setting('exp.g1')::uuid,jsonb_build_object('runId',current_setting('exp.shiprun'),'requestId',gen_random_uuid(),'slot',slot,'value',least(1,greatest(-1,control))));
  END LOOP;
 END LOOP;
 PERFORM pg_temp.check_it((SELECT (groups->current_setting('exp.g1')->>'done')::boolean FROM physical_internal.expeditions WHERE room_id=current_setting('exp.room')::uuid AND game='expedition-ship'),'two-controller server docking completes');
END $$;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('exp.a'),'role','authenticated')::text,true);
UPDATE public.game_rooms SET status='paused' WHERE id=current_setting('exp.room')::uuid;
SET LOCAL ROLE authenticated;
DO $$ BEGIN BEGIN PERFORM public.expedition_action(current_setting('exp.room')::uuid,'expedition-ship','steer',current_setting('exp.g1')::uuid,jsonb_build_object('runId',current_setting('exp.shiprun'),'requestId',gen_random_uuid(),'slot',0,'value',.5));RAISE EXCEPTION 'paused input accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;END $$;
RESET ROLE;
-- Complete all three map gates with three independent group members.
UPDATE public.game_rooms SET status='playing' WHERE id=current_setting('exp.room')::uuid;
UPDATE physical_internal.expeditions SET actors='{}',groups=(SELECT jsonb_object_agg(key,value||jsonb_build_object('visited','[]'::jsonb,'vote',NULL)) FROM jsonb_each(groups)) WHERE room_id=current_setting('exp.room')::uuid AND game='expedition-map';
DO $$ DECLARE seq text[]; st text; who text; gid text; token text; response jsonb; BEGIN
 SELECT CASE WHEN seed%2=0 THEN ARRAY['river','tower','forest'] ELSE ARRAY['tower','forest','river'] END INTO seq FROM physical_internal.expeditions WHERE room_id=current_setting('exp.room')::uuid AND game='expedition-map';
 FOREACH st IN ARRAY seq LOOP
  FOR who,gid IN SELECT * FROM (VALUES(current_setting('exp.a'),current_setting('exp.g1')),(current_setting('exp.c'),current_setting('exp.g2')),(current_setting('exp.d'),current_setting('exp.g3'))) v(w,g) LOOP
   SELECT config->'codes'->>st INTO token FROM physical_internal.expeditions WHERE room_id=current_setting('exp.room')::uuid AND game='expedition-map';
   PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',who,'role','authenticated')::text,true);
   UPDATE physical_internal.expeditions SET actors='{}' WHERE room_id=current_setting('exp.room')::uuid;
   PERFORM public.expedition_action(current_setting('exp.room')::uuid,'expedition-map','visit',gid::uuid,jsonb_build_object('runId',current_setting('exp.run'),'requestId',gen_random_uuid(),'token',token,'movementConfirmed',true));
   UPDATE physical_internal.expeditions SET actors='{}' WHERE room_id=current_setting('exp.room')::uuid;
   response:=public.expedition_action(current_setting('exp.room')::uuid,'expedition-map','vote',gid::uuid,jsonb_build_object('runId',current_setting('exp.run'),'requestId',gen_random_uuid(),'station',st));
  END LOOP;
 END LOOP;
 PERFORM pg_temp.check_it((response->>'phase')::integer=3,'all-group three-gate map');
END $$;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('exp.owner'),'role','authenticated')::text,true);
SELECT public.expedition_action(current_setting('exp.room')::uuid,'expedition-boss','start');
SELECT set_config('exp.shiprun',(SELECT run_id::text FROM physical_internal.expeditions WHERE room_id=current_setting('exp.room')::uuid AND game='expedition-ship'),true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('exp.a'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN BEGIN PERFORM public.expedition_action(current_setting('exp.room')::uuid,'expedition-ship','claim',current_setting('exp.g1')::uuid,jsonb_build_object('runId',current_setting('exp.shiprun'),'requestId',gen_random_uuid(),'slot',0));RAISE EXCEPTION 'boss stage bypass';EXCEPTION WHEN insufficient_privilege THEN NULL;END;END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('exp.owner'),'role','authenticated')::text,true);
DO $$ BEGIN FOR i IN 1..3 LOOP
 UPDATE physical_internal.expeditions SET actors='{}' WHERE room_id=current_setting('exp.room')::uuid;
 PERFORM public.expedition_action(current_setting('exp.room')::uuid,'expedition-boss','event',NULL,jsonb_build_object('event','slow'));
 END LOOP;
 UPDATE physical_internal.expeditions SET actors='{}' WHERE room_id=current_setting('exp.room')::uuid;
 BEGIN PERFORM public.expedition_action(current_setting('exp.room')::uuid,'expedition-boss','event',NULL,jsonb_build_object('event','calm'));RAISE EXCEPTION 'unlimited boss events';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
END $$;
UPDATE public.game_rooms SET status='finished' WHERE id=current_setting('exp.room')::uuid;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('exp.a'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.check_it(public.expedition_action(current_setting('exp.room')::uuid,'expedition-map') IS NOT NULL,'finished results readable');
DO $$ BEGIN BEGIN PERFORM public.expedition_action(current_setting('exp.room')::uuid,'expedition-ship','claim',current_setting('exp.g1')::uuid,'{}');RAISE EXCEPTION 'finished write';EXCEPTION WHEN insufficient_privilege THEN NULL;END;END $$;
RESET ROLE;
UPDATE physical_internal.classroom_members SET expires_at=now()-interval '1 second' WHERE user_id=current_setting('exp.a')::uuid;
SET LOCAL ROLE authenticated;
DO $$ BEGIN BEGIN PERFORM public.expedition_action(current_setting('exp.room')::uuid,'expedition-map');RAISE EXCEPTION 'expired member read';EXCEPTION WHEN insufficient_privilege THEN NULL;END;END $$;
RESET ROLE;
SELECT 'flagship access, station, controller, rhythm and pause assertions passed' AS result;
ROLLBACK;
