\ir assert_isolated.sql

-- Test database only. Run through run_classroom_security.sql, which rolls back.
-- Counts and mutations below are scoped to synthetic fixture IDs, never all rows.
DO $$ BEGIN IF current_setting('physical.test_database',true) IS DISTINCT FROM 'on' THEN RAISE EXCEPTION 'Isolated test database marker missing'; END IF; END $$;
CREATE OR REPLACE FUNCTION pg_temp.assert_ok(value boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'ACCESS TEST FAILED: %',label; END IF; END; $$;
-- The harness also removes automatic PUBLIC function EXECUTE privileges.
-- This temporary assertion helper is the only test function clients may call.
GRANT EXECUTE ON FUNCTION pg_temp.assert_ok(boolean,text) TO authenticated,anon;
DO $$ DECLARE label text; uid uuid; BEGIN
 FOREACH label IN ARRAY ARRAY['teacher_a','teacher_b','student_a','student_b','outsider'] LOOP uid:=gen_random_uuid(); INSERT INTO auth.users(id,aud,role,is_anonymous) VALUES(uid,'authenticated','authenticated',true); PERFORM set_config('test.'||label,uid::text,true); END LOOP;
 INSERT INTO physical_internal.teacher_access(user_id,expires_at) VALUES(current_setting('test.teacher_a')::uuid,now()+interval '2 hours'),(current_setting('test.teacher_b')::uuid,now()+interval '2 hours');
END; $$;
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.teacher_a'),'role','authenticated')::text,true); END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM set_config('test.room_a',(public.create_secure_classroom('Security fixture A',NULL,ARRAY['1모둠','2모둠'])->>'id'),true); END $$;
-- Keep the newest teacher review default; explicitly opt this legacy-score fixture out.
SELECT public.classroom_operations(current_setting('test.room_a')::uuid,'score-policy',NULL,false,10000);
UPDATE public.game_rooms SET status='playing' WHERE id=current_setting('test.room_a')::uuid;
SELECT pg_temp.assert_ok((SELECT count(*)=1 FROM public.game_rooms WHERE id=current_setting('test.room_a')::uuid),'teacher sees owned room');
DO $$ BEGIN PERFORM set_config('test.group_a',(SELECT id::text FROM public.room_groups WHERE room_id=current_setting('test.room_a')::uuid AND group_name='1모둠'),true); END $$;
DO $$ BEGIN PERFORM set_config('test.group_a2',(SELECT id::text FROM public.room_groups WHERE room_id=current_setting('test.room_a')::uuid AND group_name='2모둠'),true); END $$;
DO $$ BEGIN PERFORM set_config('test.code_a',(public.get_classroom_invites(current_setting('test.room_a')::uuid)->0->>'code'),true); END $$;
RESET ROLE;
-- Select the invite by group name rather than relying on output ordering.
DO $$ BEGIN PERFORM set_config('test.code_a',(SELECT i.code FROM physical_internal.classroom_invites i WHERE i.group_id=current_setting('test.group_a')::uuid),true); END $$;
DO $$ BEGIN PERFORM set_config('test.code_a2',(SELECT i.code FROM physical_internal.classroom_invites i WHERE i.group_id=current_setting('test.group_a2')::uuid),true); END $$;
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.teacher_b'),'role','authenticated')::text,true); END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM set_config('test.room_b',(public.create_secure_classroom('Security fixture B',NULL,ARRAY['1모둠'])->>'id'),true); END $$;
DO $$ BEGIN PERFORM set_config('test.group_b',(SELECT id::text FROM public.room_groups WHERE room_id=current_setting('test.room_b')::uuid),true); END $$;
SELECT pg_temp.assert_ok((SELECT count(*)=1 FROM public.game_rooms WHERE id IN (current_setting('test.room_a')::uuid,current_setting('test.room_b')::uuid)),'second teacher isolated');
DO $$ BEGIN BEGIN PERFORM public.get_classroom_invites(current_setting('test.room_a')::uuid); RAISE EXCEPTION 'cross-owner invite allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END; $$;
DO $$ DECLARE n integer; BEGIN
 UPDATE public.game_rooms SET announcement='cross-owner takeover' WHERE id=current_setting('test.room_a')::uuid; GET DIAGNOSTICS n=ROW_COUNT; PERFORM pg_temp.assert_ok(n=0,'other teacher cannot update room');
 DELETE FROM public.game_rooms WHERE id=current_setting('test.room_a')::uuid; GET DIAGNOSTICS n=ROW_COUNT; PERFORM pg_temp.assert_ok(n=0,'other teacher cannot delete room');
 BEGIN INSERT INTO public.room_groups(room_id,group_name) VALUES(current_setting('test.room_a')::uuid,'forged group'); RAISE EXCEPTION 'other teacher group insert allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.room_groups SET score=99999 WHERE id=current_setting('test.group_b')::uuid; RAISE EXCEPTION 'owner direct score update allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.room_groups SET help_requested_at=now() WHERE id=current_setting('test.group_b')::uuid; RAISE EXCEPTION 'owner direct help timestamp allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
-- Exercise direct CRUD still used by the application, on disposable owned rows.
DO $$ DECLARE template_uuid uuid; room_uuid uuid; group_uuid uuid; n integer; BEGIN
 INSERT INTO public.mission_templates(name,buttons) VALUES('CRUD fixture','[]'::jsonb) RETURNING id INTO template_uuid;
 UPDATE public.mission_templates SET name='CRUD updated' WHERE id=template_uuid; GET DIAGNOSTICS n=ROW_COUNT; PERFORM pg_temp.assert_ok(n=1,'owner template update');
 -- The unchanged owner SELECT helper reads the persisted row. Read after INSERT
 -- rather than adding RETURNING, which also applies SELECT RLS in that statement.
 room_uuid:=gen_random_uuid();
 INSERT INTO public.game_rooms(id,pin_code,name,template_id) VALUES(room_uuid,gen_random_uuid()::text,'CRUD fixture',template_uuid);
 PERFORM pg_temp.assert_ok(EXISTS(SELECT 1 FROM public.game_rooms WHERE id=room_uuid),'owner room insert and subsequent read');
 UPDATE public.game_rooms SET announcement='CRUD updated' WHERE id=room_uuid; GET DIAGNOSTICS n=ROW_COUNT; PERFORM pg_temp.assert_ok(n=1,'owner room update');
 INSERT INTO public.room_groups(room_id,group_name) VALUES(room_uuid,'CRUD group') RETURNING id INTO group_uuid;
 UPDATE public.room_groups SET group_name='CRUD renamed',stats='{"ready":true}' WHERE id=group_uuid; GET DIAGNOSTICS n=ROW_COUNT; PERFORM pg_temp.assert_ok(n=1,'owner allowed group columns');
 DELETE FROM public.room_groups WHERE id=group_uuid; GET DIAGNOSTICS n=ROW_COUNT; PERFORM pg_temp.assert_ok(n=1,'owner group delete');
 DELETE FROM public.game_rooms WHERE id=room_uuid; GET DIAGNOSTICS n=ROW_COUNT; PERFORM pg_temp.assert_ok(n=1,'owner room delete');
 DELETE FROM public.mission_templates WHERE id=template_uuid; GET DIAGNOSTICS n=ROW_COUNT; PERFORM pg_temp.assert_ok(n=1,'owner template delete');
END; $$;
RESET ROLE;
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.student_a'),'role','authenticated','user_metadata',jsonb_build_object('teacher',true))::text,true); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok((SELECT count(*)=0 FROM public.game_rooms WHERE id IN (current_setting('test.room_a')::uuid,current_setting('test.room_b')::uuid)),'unjoined student cannot enumerate fixture rooms');
SELECT pg_temp.assert_ok(NOT physical_internal.is_classroom_teacher(),'editable metadata cannot grant teacher');
DO $$ BEGIN
 BEGIN PERFORM public.create_secure_classroom('forged teacher',NULL,ARRAY['forged']); RAISE EXCEPTION 'student created room'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.mission_templates(name,buttons) VALUES('forged template','[]'); RAISE EXCEPTION 'student created template'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM physical_internal.classroom_members; RAISE EXCEPTION 'student read private roster table'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
DO $$ BEGIN BEGIN PERFORM public.authorize_classroom_teacher('wrong-test-secret'); RAISE EXCEPTION 'forged teacher allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END; $$;
SELECT pg_temp.assert_ok(public.join_secure_classroom(current_setting('test.room_a')::uuid,'1모둠','wrong-code') IS NULL,'wrong invite rejected');
SELECT pg_temp.assert_ok(public.join_secure_classroom(current_setting('test.room_a')::uuid,'1모둠',current_setting('test.code_a'))=current_setting('test.group_a')::uuid,'valid membership');
SELECT pg_temp.assert_ok((SELECT count(*)=1 FROM public.game_rooms WHERE id IN (current_setting('test.room_a')::uuid,current_setting('test.room_b')::uuid)),'student sees assigned room only');
SELECT pg_temp.assert_ok((SELECT count(*)=2 FROM public.room_groups WHERE room_id=current_setting('test.room_a')::uuid),'same-room cooperative board readable');
SELECT pg_temp.assert_ok((SELECT count(*)=0 FROM public.room_groups WHERE room_id=current_setting('test.room_b')::uuid),'other classroom group rows hidden');
SELECT pg_temp.assert_ok(public.join_secure_classroom(current_setting('test.room_a')::uuid,'2모둠',current_setting('test.code_a2')) IS NULL,'group switching denied during membership');
DO $$ DECLARE affected integer; BEGIN
 UPDATE public.game_rooms SET announcement='student takeover' WHERE id=current_setting('test.room_a')::uuid; GET DIAGNOSTICS affected=ROW_COUNT; PERFORM pg_temp.assert_ok(affected=0,'student room control denied');
 UPDATE public.room_groups SET is_hacked=true WHERE id=current_setting('test.group_a2')::uuid; GET DIAGNOSTICS affected=ROW_COUNT; PERFORM pg_temp.assert_ok(affected=0,'arbitrary other-group update denied');
 BEGIN UPDATE public.room_groups SET score=99999 WHERE id=current_setting('test.group_a')::uuid; RAISE EXCEPTION 'direct score update allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.room_groups SET help_requested_at=now() WHERE id=current_setting('test.group_a')::uuid; RAISE EXCEPTION 'direct help timestamp update allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.room_groups SET group_name='takeover' WHERE id=current_setting('test.group_a')::uuid; RAISE EXCEPTION 'student group identity update allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.increment_classroom_score(current_setting('test.group_b')::uuid,100,'test-cross-room'); RAISE EXCEPTION 'cross-room RPC allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.increment_classroom_score(current_setting('test.group_a2')::uuid,100,'test-cross-group'); RAISE EXCEPTION 'cross-group RPC allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.reset_group_scores(current_setting('test.room_a')::uuid); RAISE EXCEPTION 'student reset allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.review_classroom_mission(current_setting('test.group_a')::uuid,'fixture',true); RAISE EXCEPTION 'student review allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.claim_classroom_controller(current_setting('test.room_a')::uuid,gen_random_uuid()); RAISE EXCEPTION 'student controller allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.get_classroom_invites(current_setting('test.room_a')::uuid); RAISE EXCEPTION 'student invite read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
SELECT public.increment_classroom_score(current_setting('test.group_a')::uuid,100,'fixture-score-'||current_setting('test.group_a'));
SELECT public.increment_classroom_score(current_setting('test.group_a')::uuid,100,'fixture-score-'||current_setting('test.group_a'));
SELECT pg_temp.assert_ok((SELECT score=100 FROM public.room_groups WHERE id=current_setting('test.group_a')::uuid),'authorized idempotent score writes');
UPDATE public.room_groups SET stats='{"laps":1}'::jsonb WHERE id=current_setting('test.group_a')::uuid;
SELECT pg_temp.assert_ok((SELECT stats->>'laps'='1' FROM public.room_groups WHERE id=current_setting('test.group_a')::uuid),'own cooperative progress retained');
RESET ROLE;
UPDATE physical_internal.classroom_members SET expires_at=now()-interval '1 second' WHERE user_id=current_setting('test.student_a')::uuid;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok((SELECT count(*)=0 FROM public.game_rooms WHERE id=current_setting('test.room_a')::uuid),'expired membership cannot read');
DO $$ BEGIN BEGIN PERFORM public.increment_classroom_score(current_setting('test.group_a')::uuid,100,'expired-score'); RAISE EXCEPTION 'expired write allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END; $$;
RESET ROLE;
-- Expired teacher authorization does not become valid merely through authenticated.
UPDATE physical_internal.teacher_access SET expires_at=now()-interval '1 second' WHERE user_id=current_setting('test.teacher_a')::uuid;
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.teacher_a'),'role','authenticated')::text,true); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok((SELECT count(*)=0 FROM public.game_rooms WHERE id=current_setting('test.room_a')::uuid),'expired teacher cannot read owned room');
DO $$ BEGIN BEGIN PERFORM public.get_classroom_invites(current_setting('test.room_a')::uuid); RAISE EXCEPTION 'expired teacher invite access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END; $$;
RESET ROLE;
UPDATE physical_internal.teacher_access SET expires_at=now()+interval '2 hours' WHERE user_id=current_setting('test.teacher_a')::uuid;
DO $$ BEGIN PERFORM set_config('request.jwt.claims','{}',true); END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM 1 FROM public.game_rooms; RAISE EXCEPTION 'anon room read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.room_groups; RAISE EXCEPTION 'anon group read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.mission_templates; RAISE EXCEPTION 'anon template read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.increment_classroom_score(current_setting('test.group_a')::uuid,100,'anon-score'); RAISE EXCEPTION 'anon RPC allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SELECT 'classroom access allow/deny assertions passed; transaction must roll back' AS result;
