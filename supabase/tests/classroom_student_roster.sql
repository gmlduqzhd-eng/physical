-- Execute as one transaction against a test database. ROLLBACK preserves all real rooms.
BEGIN;
CREATE OR REPLACE FUNCTION pg_temp.assert_ok(value boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'ROSTER TEST FAILED: %',label; END IF; END $$;
DO $$ DECLARE label text; uid uuid; BEGIN
  FOREACH label IN ARRAY ARRAY['teacher_a','teacher_b','student_a','student_b','student_c'] LOOP
    uid:=gen_random_uuid();
    INSERT INTO auth.users(id,aud,role) VALUES(uid,'authenticated','authenticated');
    PERFORM set_config('test.'||label,uid::text,true);
  END LOOP;
  INSERT INTO physical_internal.teacher_access VALUES
    (current_setting('test.teacher_a')::uuid,now()+interval '2 hours'),
    (current_setting('test.teacher_b')::uuid,now()+interval '2 hours');
END $$;

SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.teacher_a'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT set_config('test.room',(public.create_secure_classroom('Roster fixture',NULL,ARRAY['1모둠','2모둠'])->>'id'),true);
SELECT pg_temp.assert_ok(public.get_classroom_roster(current_setting('test.room')::uuid)='[]'::jsonb,'teacher sees empty roster');
RESET ROLE;
SELECT set_config('test.group_a',(SELECT id::text FROM public.room_groups WHERE room_id=current_setting('test.room')::uuid AND group_name='1모둠'),true);
SELECT set_config('test.group_b',(SELECT id::text FROM public.room_groups WHERE room_id=current_setting('test.room')::uuid AND group_name='2모둠'),true);
SELECT set_config('test.pin_a',(SELECT p.pin FROM physical_internal.classroom_short_pins p WHERE p.group_id=current_setting('test.group_a')::uuid),true);
SELECT set_config('test.invite_b',(SELECT i.code FROM physical_internal.classroom_invites i WHERE i.group_id=current_setting('test.group_b')::uuid),true);

SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.student_a'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok(public.join_classroom_short_pin_profile(current_setting('test.pin_a'),7,'달리기왕')->>'group_id'=current_setting('test.group_a'),'PIN join assigns group');
SELECT pg_temp.assert_ok(public.join_classroom_short_pin_profile(current_setting('test.pin_a'),7,'달리기별')->>'nickname'='달리기별','same student updates one row');
SELECT pg_temp.assert_ok(public.get_my_classroom_profile(current_setting('test.room')::uuid)->>'student_number'='7','student sees own number');
SELECT pg_temp.assert_ok(public.join_classroom_invite_profile(current_setting('test.room')::uuid,'2모둠',current_setting('test.invite_b'),7,'달리기별')->>'error'='group_locked','member cannot switch groups');
DO $$ BEGIN BEGIN PERFORM public.get_classroom_roster(current_setting('test.room')::uuid); RAISE EXCEPTION 'student read roster'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.student_b'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok(public.join_classroom_invite_profile(current_setting('test.room')::uuid,'2모둠',current_setting('test.invite_b'),7,'새친구')->>'error'='number_taken','duplicate number rejected');
SELECT pg_temp.assert_ok(public.join_classroom_invite_profile(current_setting('test.room')::uuid,'2모둠',current_setting('test.invite_b'),8,'새친구')->>'group_id'=current_setting('test.group_b'),'QR join assigns group');
RESET ROLE;

SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.student_c'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok(public.join_secure_classroom(current_setting('test.room')::uuid,'2모둠',current_setting('test.invite_b'))=current_setting('test.group_b')::uuid,'legacy member joins');
SELECT pg_temp.assert_ok(public.get_my_classroom_profile(current_setting('test.room')::uuid)->>'nickname' IS NULL,'legacy member has no profile');
SELECT pg_temp.assert_ok(public.complete_classroom_profile(current_setting('test.room')::uuid,current_setting('test.group_b')::uuid,9,'해바라기')->>'nickname'='해바라기','legacy profile completed');
RESET ROLE;

SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.teacher_b'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN BEGIN PERFORM public.get_classroom_roster(current_setting('test.room')::uuid); RAISE EXCEPTION 'other teacher read roster'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;
DO $$ BEGIN BEGIN PERFORM public.release_classroom_number(current_setting('test.room')::uuid,8); RAISE EXCEPTION 'other teacher released number'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.teacher_a'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok(jsonb_array_length(public.get_classroom_roster(current_setting('test.room')::uuid))=3,'three unique members');
SELECT pg_temp.assert_ok(public.release_classroom_number(current_setting('test.room')::uuid,8),'owner can release duplicate number');
SELECT pg_temp.assert_ok((SELECT count(*)=1 FROM jsonb_array_elements(public.get_classroom_roster(current_setting('test.room')::uuid)) v WHERE v->>'nickname' IS NULL),'released member shown as missing');
UPDATE public.game_rooms SET status='finished' WHERE id=current_setting('test.room')::uuid;
RESET ROLE;
SELECT pg_temp.assert_ok((SELECT count(*)=3 AND count(student_number)=0 AND count(nickname)=0 FROM physical_internal.classroom_members WHERE room_id=current_setting('test.room')::uuid),'finish erases identity but retains member rows');
SELECT 'roster access, PIN, QR, duplicate, legacy, release and finish assertions passed' AS result;
ROLLBACK;
