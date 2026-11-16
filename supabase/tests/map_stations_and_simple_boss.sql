\ir assert_isolated.sql
BEGIN;
CREATE FUNCTION pg_temp.check_it(value boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'STATIONS FAILED: %',label; END IF; END $$;
GRANT EXECUTE ON FUNCTION pg_temp.check_it(boolean,text) TO authenticated,anon;
DO $$ DECLARE uid uuid; label text; BEGIN
 FOREACH label IN ARRAY ARRAY['owner','other'] LOOP
 uid:=gen_random_uuid();INSERT INTO auth.users(id,aud,role,is_anonymous) VALUES(uid,'authenticated','authenticated',true);PERFORM set_config('st.'||label,uid::text,true);END LOOP;
 INSERT INTO physical_internal.teacher_access(user_id,expires_at) VALUES(current_setting('st.owner')::uuid,now()+interval '2 hours'),(current_setting('st.other')::uuid,now()+interval '2 hours');
END $$;
-- 1. The same teacher's map stations keep their codes across runs and across classrooms.
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('st.owner'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT set_config('st.room1',public.create_secure_classroom('Stations fixture 1',NULL,ARRAY['A','B'])->>'id',true);
SELECT set_config('st.room2',public.create_secure_classroom('Stations fixture 2',NULL,ARRAY['A','B'])->>'id',true);
SELECT public.expedition_action(current_setting('st.room1')::uuid,'expedition-map','start');
RESET ROLE;
SELECT set_config('st.codes1',(SELECT config->>'codes' FROM physical_internal.expeditions WHERE room_id=current_setting('st.room1')::uuid AND game='expedition-map'),true);
SELECT pg_temp.check_it(current_setting('st.codes1')::jsonb->>'forest' ~ '^[0-9a-f]{24}$','first run gets random codes');
SET LOCAL ROLE authenticated;
SELECT public.expedition_action(current_setting('st.room1')::uuid,'expedition-map','start');
SELECT public.expedition_action(current_setting('st.room2')::uuid,'expedition-map','start');
RESET ROLE;
SELECT pg_temp.check_it((SELECT config->'codes' FROM physical_internal.expeditions WHERE room_id=current_setting('st.room1')::uuid AND game='expedition-map')=current_setting('st.codes1')::jsonb,'a new run in the same room keeps the printed codes');
SELECT pg_temp.check_it((SELECT config->'codes' FROM physical_internal.expeditions WHERE room_id=current_setting('st.room2')::uuid AND game='expedition-map')=current_setting('st.codes1')::jsonb,'another classroom of the same teacher keeps the printed codes');
-- 2. Another teacher never receives these codes.
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('st.other'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT set_config('st.room3',public.create_secure_classroom('Stations fixture 3',NULL,ARRAY['A'])->>'id',true);
SELECT public.expedition_action(current_setting('st.room3')::uuid,'expedition-map','start');
RESET ROLE;
SELECT pg_temp.check_it((SELECT config->'codes' FROM physical_internal.expeditions WHERE room_id=current_setting('st.room3')::uuid AND game='expedition-map')<>current_setting('st.codes1')::jsonb,'other teachers get their own codes');
-- 3. The two-gate class boss (sent by the app by default) runs map then loop and finishes after the second.
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('st.owner'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT public.expedition_action(current_setting('st.room1')::uuid,'expedition-boss','start',NULL,'{"settings":{"route":"simple"}}'::jsonb);
RESET ROLE;
SELECT pg_temp.check_it((SELECT config->'settings'->>'route' FROM physical_internal.expeditions WHERE room_id=current_setting('st.room1')::uuid AND game='expedition-boss')='simple','two-gate route is stored');
SELECT pg_temp.check_it((SELECT array_agg(k ORDER BY k) FROM physical_internal.expeditions e, jsonb_object_keys(e.config->'children') k WHERE e.room_id=current_setting('st.room1')::uuid AND e.game='expedition-boss')=ARRAY['expedition-loop','expedition-map'],'only the map and loop gates are started');
UPDATE physical_internal.expeditions c SET groups=(SELECT jsonb_object_agg(key,value||'{"done":true}') FROM jsonb_each(c.groups)) WHERE c.room_id=current_setting('st.room1')::uuid AND c.game='expedition-map';
SET LOCAL ROLE authenticated;
SELECT pg_temp.check_it((public.expedition_action(current_setting('st.room1')::uuid,'expedition-boss','view')->>'phase')::integer=1,'after the map gate the boss is on gate two');
RESET ROLE;
UPDATE physical_internal.expeditions c SET groups=(SELECT jsonb_object_agg(key,value||'{"done":true}') FROM jsonb_each(c.groups)) WHERE c.room_id=current_setting('st.room1')::uuid AND c.game='expedition-loop';
SET LOCAL ROLE authenticated;
SELECT set_config('st.boss',public.expedition_action(current_setting('st.room1')::uuid,'expedition-boss','view')::text,true);
RESET ROLE;
SELECT pg_temp.check_it((current_setting('st.boss')::jsonb->>'phase')::integer=2,'two gates done');
SELECT pg_temp.check_it(jsonb_array_length(current_setting('st.boss')::jsonb->'groups')=2 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(current_setting('st.boss')::jsonb->'groups') g WHERE g->>'done' IS DISTINCT FROM 'true'),'every group is done after two gates');
-- 4. The three-gate routes stay available, and a start without settings keeps the old three-gate default.
SELECT pg_temp.check_it(physical_internal.expedition_settings(NULL)->>'route'='balanced','server default unchanged for callers that send no settings');
SELECT pg_temp.check_it(physical_internal.expedition_settings('{"route":"balanced"}')->>'route'='balanced' AND physical_internal.expedition_settings('{"route":"simple"}')->>'route'='simple','routes accepted');
DO $$ BEGIN BEGIN PERFORM physical_internal.expedition_settings('{"route":"short"}');RAISE EXCEPTION 'unknown route accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;END $$;
ROLLBACK;
