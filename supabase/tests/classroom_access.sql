
-- Run inside a transaction and ROLLBACK. All fixtures are synthetic and anonymous.
CREATE OR REPLACE FUNCTION pg_temp.assert_ok(value boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'ACCESS TEST FAILED: %',label; END IF; END; $$;
DO $$ DECLARE label text; uid uuid; BEGIN
 FOREACH label IN ARRAY ARRAY['teacher_a','teacher_b','student_a','student_b','outsider'] LOOP uid:=gen_random_uuid(); INSERT INTO auth.users(id,aud,role) VALUES(uid,'authenticated','authenticated'); PERFORM set_config('test.'||label,uid::text,true); END LOOP;
 INSERT INTO physical_internal.teacher_access VALUES(current_setting('test.teacher_a')::uuid,now()+interval '2 hours'),(current_setting('test.teacher_b')::uuid,now()+interval '2 hours');
END; $$;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.teacher_a'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT set_config('test.room_a',(public.create_secure_classroom('Security fixture A',NULL,ARRAY['1모둠','2모둠'])->>'id'),true);
SELECT pg_temp.assert_ok((SELECT count(*)=1 FROM public.game_rooms),'teacher sees only owned room');
SELECT set_config('test.group_a',(SELECT id::text FROM public.room_groups WHERE room_id=current_setting('test.room_a')::uuid AND group_name='1모둠'),true);
SELECT set_config('test.group_a2',(SELECT id::text FROM public.room_groups WHERE room_id=current_setting('test.room_a')::uuid AND group_name='2모둠'),true);
SELECT set_config('test.code_a',(public.get_classroom_invites(current_setting('test.room_a')::uuid)->0->>'code'),true);
RESET ROLE;
-- Select the invite by group name rather than relying on output ordering.
SELECT set_config('test.code_a',(SELECT i.code FROM physical_internal.classroom_invites i WHERE i.group_id=current_setting('test.group_a')::uuid),true);
SELECT set_config('test.code_a2',(SELECT i.code FROM physical_internal.classroom_invites i WHERE i.group_id=current_setting('test.group_a2')::uuid),true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.teacher_b'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT set_config('test.room_b',(public.create_secure_classroom('Security fixture B',NULL,ARRAY['1모둠'])->>'id'),true);
SELECT set_config('test.group_b',(SELECT id::text FROM public.room_groups WHERE room_id=current_setting('test.room_b')::uuid),true);
SELECT pg_temp.assert_ok((SELECT count(*)=1 FROM public.game_rooms),'second teacher isolated');
DO $$ BEGIN BEGIN PERFORM public.get_classroom_invites(current_setting('test.room_a')::uuid); RAISE EXCEPTION 'cross-owner invite allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END; $$;
RESET ROLE;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.student_a'),'role','authenticated','user_metadata',jsonb_build_object('teacher',true))::text,true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok((SELECT count(*)=0 FROM public.game_rooms),'unjoined student cannot enumerate');
SELECT pg_temp.assert_ok(NOT physical_internal.is_classroom_teacher(),'editable metadata cannot grant teacher');
DO $$ BEGIN BEGIN PERFORM public.authorize_classroom_teacher('wrong-test-secret'); RAISE EXCEPTION 'forged teacher allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END; $$;
SELECT pg_temp.assert_ok(public.join_secure_classroom(current_setting('test.room_a')::uuid,'1모둠','wrong-code') IS NULL,'wrong invite rejected');
SELECT pg_temp.assert_ok(public.join_secure_classroom(current_setting('test.room_a')::uuid,'1모둠',current_setting('test.code_a'))=current_setting('test.group_a')::uuid,'valid membership');
SELECT pg_temp.assert_ok((SELECT count(*)=1 FROM public.game_rooms),'student sees assigned room only');
SELECT pg_temp.assert_ok((SELECT count(*)=2 FROM public.room_groups),'same-room cooperative board readable');
SELECT pg_temp.assert_ok(public.join_secure_classroom(current_setting('test.room_a')::uuid,'2모둠',current_setting('test.code_a2')) IS NULL,'group switching denied during membership');
DO $$ DECLARE affected integer; BEGIN
 UPDATE public.game_rooms SET announcement='student takeover' WHERE id=current_setting('test.room_a')::uuid; GET DIAGNOSTICS affected=ROW_COUNT; PERFORM pg_temp.assert_ok(affected=0,'student room control denied');
 UPDATE public.room_groups SET is_hacked=true WHERE id=current_setting('test.group_a2')::uuid; GET DIAGNOSTICS affected=ROW_COUNT; PERFORM pg_temp.assert_ok(affected=0,'arbitrary other-group update denied');
 BEGIN UPDATE public.room_groups SET score=99999 WHERE id=current_setting('test.group_a')::uuid; RAISE EXCEPTION 'direct score update allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.increment_classroom_score(current_setting('test.group_b')::uuid,100,'test-cross-room'); RAISE EXCEPTION 'cross-room RPC allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.increment_classroom_score(current_setting('test.group_a2')::uuid,100,'test-cross-group'); RAISE EXCEPTION 'cross-group RPC allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.reset_group_scores(current_setting('test.room_a')::uuid); RAISE EXCEPTION 'student reset allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.review_classroom_mission(current_setting('test.group_a')::uuid,'fixture',true); RAISE EXCEPTION 'student review allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.claim_classroom_controller(current_setting('test.room_a')::uuid,gen_random_uuid()); RAISE EXCEPTION 'student controller allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.get_classroom_invites(current_setting('test.room_a')::uuid); RAISE EXCEPTION 'student invite read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
SELECT public.increment_classroom_score(current_setting('test.group_a')::uuid,100,'fixture-idempotent-score');
SELECT public.increment_classroom_score(current_setting('test.group_a')::uuid,100,'fixture-idempotent-score');
SELECT pg_temp.assert_ok((SELECT score=100 FROM public.room_groups WHERE id=current_setting('test.group_a')::uuid),'authorized idempotent score writes');
UPDATE public.room_groups SET stats='{"laps":1}'::jsonb WHERE id=current_setting('test.group_a')::uuid;
SELECT pg_temp.assert_ok((SELECT stats->>'laps'='1' FROM public.room_groups WHERE id=current_setting('test.group_a')::uuid),'own cooperative progress retained');
RESET ROLE;
UPDATE physical_internal.classroom_members SET expires_at=now()-interval '1 second' WHERE user_id=current_setting('test.student_a')::uuid;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok((SELECT count(*)=0 FROM public.game_rooms),'expired membership cannot read');
DO $$ BEGIN BEGIN PERFORM public.increment_classroom_score(current_setting('test.group_a')::uuid,100,'expired-score'); RAISE EXCEPTION 'expired write allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END; $$;
RESET ROLE;
SELECT set_config('request.jwt.claims','{}',true);
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM 1 FROM public.game_rooms; RAISE EXCEPTION 'anon room read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.room_groups; RAISE EXCEPTION 'anon group read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.mission_templates; RAISE EXCEPTION 'anon template read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.increment_classroom_score(current_setting('test.group_a')::uuid,100,'anon-score'); RAISE EXCEPTION 'anon RPC allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SELECT 'classroom access allow/deny assertions passed; transaction must roll back' AS result;
