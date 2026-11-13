\ir assert_isolated.sql
-- After classroom_access.sql + classroom_display.sql, then ROLLBACK.
UPDATE public.game_rooms SET status='finished' WHERE id=current_setting('test.room_a')::uuid;
INSERT INTO physical_internal.classroom_members(room_id,user_id,group_id,expires_at) VALUES(current_setting('test.room_a')::uuid,current_setting('test.student_b')::uuid,current_setting('test.group_a')::uuid,now()+interval '4 hours');
INSERT INTO physical_internal.classroom_viewers(room_id,user_id,expires_at) VALUES(current_setting('test.room_a')::uuid,current_setting('test.outsider')::uuid,now()+interval '4 hours');
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.student_b'),'role','authenticated')::text,true); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok((SELECT count(*)=1 FROM public.game_rooms WHERE id=current_setting('test.room_a')::uuid),'student can see final result');
SELECT pg_temp.assert_ok((SELECT count(*)=2 FROM public.room_groups WHERE room_id=current_setting('test.room_a')::uuid),'student can see final group scores');
SELECT pg_temp.assert_ok((SELECT count(*)=1 FROM public.mission_templates WHERE id=(SELECT template_id FROM public.game_rooms WHERE id=current_setting('test.room_a')::uuid)),'student can read final result template');
DO $$ DECLARE n integer; BEGIN
 UPDATE public.room_groups SET stats='{}' WHERE room_id=current_setting('test.room_a')::uuid; GET DIAGNOSTICS n=ROW_COUNT; PERFORM pg_temp.assert_ok(n=0,'finished student writes denied');
 BEGIN PERFORM public.increment_classroom_score(current_setting('test.group_a')::uuid,100,'finished-score'); RAISE EXCEPTION 'finished score allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.outsider'),'role','authenticated')::text,true); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok((SELECT count(*)=2 FROM public.room_groups WHERE room_id=current_setting('test.room_a')::uuid),'TV final result readable');
RESET ROLE;
UPDATE physical_internal.classroom_members SET expires_at=now()-interval '1 second' WHERE room_id=current_setting('test.room_a')::uuid AND user_id=current_setting('test.student_b')::uuid;
UPDATE physical_internal.classroom_viewers SET expires_at=now()-interval '1 second' WHERE room_id=current_setting('test.room_a')::uuid AND user_id=current_setting('test.outsider')::uuid;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok((SELECT count(*)=0 FROM public.room_groups WHERE room_id=current_setting('test.room_a')::uuid),'expired TV loses final results');
RESET ROLE;
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.student_b'),'role','authenticated')::text,true); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok((SELECT count(*)=0 FROM public.game_rooms WHERE id=current_setting('test.room_a')::uuid),'expired student loses final results');
SELECT pg_temp.assert_ok(public.get_my_classroom_profile(current_setting('test.room_a')::uuid) IS NULL,'finished profile unavailable');
RESET ROLE;
SELECT 'final result read-only assertions passed' AS result;
