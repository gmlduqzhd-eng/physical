-- After classroom_access.sql + classroom_display.sql, then ROLLBACK.
UPDATE public.game_rooms SET status='finished' WHERE id=current_setting('test.room_a')::uuid;
INSERT INTO physical_internal.classroom_members VALUES(current_setting('test.room_a')::uuid,current_setting('test.student_b')::uuid,current_setting('test.group_a')::uuid,now()+interval '4 hours');
INSERT INTO physical_internal.classroom_viewers VALUES(current_setting('test.room_a')::uuid,current_setting('test.outsider')::uuid,now()+interval '4 hours');
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.student_b'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok((SELECT count(*)=1 FROM public.game_rooms),'student can see final result');
SELECT pg_temp.assert_ok((SELECT count(*)=2 FROM public.room_groups),'student can see final group scores');
DO $$ DECLARE n integer; BEGIN
 UPDATE public.room_groups SET stats='{}'; GET DIAGNOSTICS n=ROW_COUNT; PERFORM pg_temp.assert_ok(n=0,'finished student writes denied');
 BEGIN PERFORM public.increment_classroom_score(current_setting('test.group_a')::uuid,100,'finished-score'); RAISE EXCEPTION 'finished score allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.outsider'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok((SELECT count(*)=2 FROM public.room_groups),'TV final result readable');
RESET ROLE;
SELECT 'final result read-only assertions passed' AS result;
