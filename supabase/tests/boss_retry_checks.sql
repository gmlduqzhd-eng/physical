-- Included inside a caller-owned transaction. Real authenticated role, SQL Auth
-- claims fixture only (not an Auth-issued JWT / HTTP / Realtime test).
CREATE OR REPLACE FUNCTION pg_temp.assert_boss(value boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'BOSS RETRY TEST FAILED: %',label; END IF; END; $$;
GRANT EXECUTE ON FUNCTION pg_temp.assert_boss(boolean,text) TO authenticated,anon;
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.boss_student'),'role','authenticated')::text,true); END; $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE room uuid:=current_setting('test.boss_room_a')::uuid; hp integer;
BEGIN
  hp:=public.apply_classroom_boss_damage(room,10,'synthetic-retry');
  PERFORM pg_temp.assert_boss(hp=90,'first request applies damage');
  hp:=public.apply_classroom_boss_damage(room,10,'synthetic-retry');
  PERFORM pg_temp.assert_boss(hp=90,'identical retry does not apply damage again');
  PERFORM pg_temp.assert_boss((SELECT score=500 FROM public.room_groups WHERE id=current_setting('test.boss_group_a')::uuid),'retry does not reward prematurely');
  BEGIN PERFORM public.apply_classroom_boss_damage(room,11,'synthetic-retry'); RAISE EXCEPTION 'Changed retry amount allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.apply_classroom_boss_damage(current_setting('test.boss_room_b')::uuid,10,'synthetic-retry'); RAISE EXCEPTION 'Other room allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.apply_classroom_boss_damage(room,0,'synthetic-invalid'); RAISE EXCEPTION 'Zero damage allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.apply_classroom_boss_damage(room,NULL,'synthetic-invalid'); RAISE EXCEPTION 'Null damage allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.apply_classroom_boss_damage(room,1000001,'synthetic-invalid'); RAISE EXCEPTION 'Oversized damage allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.apply_classroom_boss_damage(room,10,NULL); RAISE EXCEPTION 'Null action allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.apply_classroom_boss_damage(room,10,''); RAISE EXCEPTION 'Empty action allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN UPDATE public.room_groups SET score=999999 WHERE id=current_setting('test.boss_group_a')::uuid; RAISE EXCEPTION 'Direct score update allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
DO $$ BEGIN
  PERFORM pg_temp.assert_boss((SELECT count(*)=1 FROM physical_internal.boss_damage_actions WHERE action_id='synthetic-retry'),'retry ledger has one row');
  PERFORM pg_temp.assert_boss(NOT EXISTS(SELECT 1 FROM physical_internal.boss_damage_actions WHERE action_id='synthetic-invalid'),'invalid requests leave no ledger');
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.boss_teacher_b'),'role','authenticated')::text,true);
END; $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN PERFORM public.apply_classroom_boss_damage(current_setting('test.boss_room_b')::uuid,10,'synthetic-retry'); RAISE EXCEPTION 'Action collision in different owned room allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.apply_classroom_boss_damage(current_setting('test.boss_room_a')::uuid,10,'synthetic-retry'); RAISE EXCEPTION 'Other teacher boss allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
DO $$ DECLARE actor text; BEGIN
  FOREACH actor IN ARRAY ARRAY['outsider','tv','expired'] LOOP
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.boss_'||actor),'role','authenticated')::text,true);
    SET LOCAL ROLE authenticated;
    BEGIN PERFORM public.apply_classroom_boss_damage(current_setting('test.boss_room_a')::uuid,10,'synthetic-retry'); RAISE EXCEPTION 'Unauthorized actor allowed: %',actor; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    RESET ROLE;
  END LOOP;
  PERFORM set_config('request.jwt.claims','{}',true);
  SET LOCAL ROLE anon;
  BEGIN PERFORM public.apply_classroom_boss_damage(current_setting('test.boss_room_a')::uuid,10,'synthetic-retry'); RAISE EXCEPTION 'Anon boss allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.boss_teacher_a'),'role','authenticated')::text,true);
END; $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE hp integer; room uuid:=current_setting('test.boss_room_a')::uuid;
BEGIN
  hp:=public.apply_classroom_boss_damage(room,90,'synthetic-kill');
  PERFORM pg_temp.assert_boss(hp=0,'owner can finish boss');
  PERFORM pg_temp.assert_boss((SELECT score=2500 FROM public.room_groups WHERE id=current_setting('test.boss_group_a')::uuid),'first group rewarded once');
  PERFORM pg_temp.assert_boss((SELECT score=2700 FROM public.room_groups WHERE id=current_setting('test.boss_group_a2')::uuid),'second group rewarded once');
  hp:=public.apply_classroom_boss_damage(room,90,'synthetic-kill');
  PERFORM pg_temp.assert_boss(hp=0,'winning action retry returns completed result');
  hp:=public.apply_classroom_boss_damage(room,10,'synthetic-retry');
  PERFORM pg_temp.assert_boss(hp=0,'earlier action retry returns current completed result');
  PERFORM pg_temp.assert_boss((SELECT sum(score)=5200 FROM public.room_groups WHERE room_id=room),'winning retries cannot double reward');
  PERFORM pg_temp.assert_boss((SELECT status='playing' AND boss_hp IS NULL AND boss_max_hp IS NULL FROM public.game_rooms WHERE id=room),'existing boss completion state retained');
END; $$;
RESET ROLE;
DO $$ BEGIN
  PERFORM pg_temp.assert_boss((SELECT boss_hp=100 FROM public.game_rooms WHERE id=current_setting('test.boss_room_b')::uuid),'other room HP preserved');
  PERFORM pg_temp.assert_boss((SELECT count(*)=2 FROM physical_internal.boss_damage_actions WHERE action_id IN ('synthetic-retry','synthetic-kill')),'exactly two accepted ledger rows');
  UPDATE public.game_rooms SET status='finished' WHERE id=current_setting('test.boss_room_a')::uuid;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.boss_student'),'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.apply_classroom_boss_damage(current_setting('test.boss_room_a')::uuid,10,'synthetic-retry'); RAISE EXCEPTION 'Finished-room student retry allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  UPDATE physical_internal.teacher_access SET expires_at=now()-interval '1 second' WHERE user_id=current_setting('test.boss_teacher_a')::uuid;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.boss_teacher_a'),'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.apply_classroom_boss_damage(current_setting('test.boss_room_a')::uuid,10,'synthetic-retry'); RAISE EXCEPTION 'Expired owner retry allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
END; $$;
\echo 'PASS: boss duplicate damage/reward, collisions, validation and actor restrictions'
