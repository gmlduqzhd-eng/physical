\ir assert_isolated.sql
-- Append after classroom_access.sql, in the same transaction. Roll back all fixtures.
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.teacher_a'),'role','authenticated')::text,true); END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE template_uuid uuid; BEGIN
 INSERT INTO public.mission_templates(name,buttons) VALUES('Recovery template fixture','[]'::jsonb) RETURNING id INTO template_uuid;
 PERFORM set_config('test.template_a',template_uuid::text,true);
END $$;
UPDATE public.game_rooms SET template_id=current_setting('test.template_a')::uuid WHERE id=current_setting('test.room_a')::uuid;
DO $$ BEGIN PERFORM set_config('test.device_codes',public.get_classroom_device_codes(current_setting('test.room_a')::uuid)::text,true); END $$;
RESET ROLE;
DO $$ BEGIN PERFORM set_config('test.pin_a',(SELECT pin_code FROM public.game_rooms WHERE id=current_setting('test.room_a')::uuid),true); END $$;
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.outsider'),'role','authenticated')::text,true); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok(NOT public.join_classroom_board(current_setting('test.room_a')::uuid,'wrong'),'wrong board code rejected');
SELECT pg_temp.assert_ok(public.join_classroom_board(current_setting('test.room_a')::uuid,current_setting('test.device_codes')::jsonb->>'board_code'),'valid board code accepted');
SELECT pg_temp.assert_ok((SELECT count(*)=1 FROM public.game_rooms WHERE id IN (current_setting('test.room_a')::uuid,current_setting('test.room_b')::uuid)),'viewer sees only assigned room');
SELECT pg_temp.assert_ok((SELECT count(*)=2 FROM public.room_groups WHERE room_id=current_setting('test.room_a')::uuid),'viewer sees cooperative board');
SELECT pg_temp.assert_ok((SELECT count(*)=0 FROM public.room_groups WHERE room_id=current_setting('test.room_b')::uuid),'viewer cannot see another room groups');
DO $$ DECLARE n integer; BEGIN
 UPDATE public.game_rooms SET announcement='viewer takeover' WHERE id=current_setting('test.room_a')::uuid; GET DIAGNOSTICS n=ROW_COUNT; PERFORM pg_temp.assert_ok(n=0,'viewer cannot control');
 UPDATE public.room_groups SET stats='{"forged":true}' WHERE id=current_setting('test.group_a')::uuid; GET DIAGNOSTICS n=ROW_COUNT; PERFORM pg_temp.assert_ok(n=0,'viewer cannot update group progress');
 BEGIN UPDATE public.room_groups SET score=99999 WHERE id=current_setting('test.group_a')::uuid; RAISE EXCEPTION 'viewer direct score allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.increment_classroom_score(current_setting('test.group_a')::uuid,100,'viewer-score'); RAISE EXCEPTION 'viewer score allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.get_classroom_roster(current_setting('test.room_a')::uuid); RAISE EXCEPTION 'viewer roster allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.get_classroom_device_codes(current_setting('test.room_a')::uuid); RAISE EXCEPTION 'viewer code disclosure allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.teacher_b'),'role','authenticated')::text,true); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok(public.recover_secure_classroom(current_setting('test.pin_a'),'wrong') IS NULL,'wrong recovery code denied');
SELECT pg_temp.assert_ok(public.recover_secure_classroom(current_setting('test.pin_a'),current_setting('test.device_codes')::jsonb->>'recovery_code')->>'id'=current_setting('test.room_a'),'authorized teacher recovery');
SELECT pg_temp.assert_ok((SELECT count(*)=2 FROM public.game_rooms WHERE id IN (current_setting('test.room_a')::uuid,current_setting('test.room_b')::uuid)),'new owner sees recovered and original rooms');
SELECT pg_temp.assert_ok((SELECT template_id<>current_setting('test.template_a')::uuid FROM public.game_rooms WHERE id=current_setting('test.room_a')::uuid),'recovery clones another teacher template');
SELECT pg_temp.assert_ok((SELECT count(*)=1 FROM public.mission_templates WHERE id=(SELECT template_id FROM public.game_rooms WHERE id=current_setting('test.room_a')::uuid) AND teacher_id=auth.uid()),'recovered template owned by new teacher');
SELECT pg_temp.assert_ok(public.get_classroom_device_codes(current_setting('test.room_a')::uuid)->>'recovery_code'<>current_setting('test.device_codes')::jsonb->>'recovery_code','recovery code rotated');
RESET ROLE;
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.teacher_a'),'role','authenticated')::text,true); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok((SELECT count(*)=0 FROM public.game_rooms WHERE id=current_setting('test.room_a')::uuid),'old owner access revoked');
RESET ROLE;
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.outsider'),'role','authenticated')::text,true); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok((SELECT count(*)=0 FROM public.game_rooms WHERE id=current_setting('test.room_a')::uuid),'old viewer access revoked');
SELECT pg_temp.assert_ok(NOT public.join_classroom_board(current_setting('test.room_a')::uuid,current_setting('test.device_codes')::jsonb->>'board_code'),'old board code revoked');
RESET ROLE;
SELECT 'display and recovery assertions passed' AS result;
