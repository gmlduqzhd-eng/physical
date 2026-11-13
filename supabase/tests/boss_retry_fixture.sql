-- Synthetic fixture only, inside a caller-owned ROLLBACK transaction.
DO $$ DECLARE label text; uid uuid; template uuid; room_a uuid; room_b uuid; group_a uuid; group_a2 uuid; group_b uuid;
BEGIN
  IF current_setting('physical.test_database',true) IS DISTINCT FROM 'on'
    OR (
      -- Native stacks proxy loopback TCP to a Unix socket (inet_* is NULL).
      ((inet_server_addr() IS NULL OR inet_server_addr()='127.0.0.1'::inet) AND EXISTS (
        SELECT 1 FROM pg_namespace WHERE nspname='physical_api_test_environment'
          AND obj_description(oid,'pg_namespace')='physical-hardening-native-20261113'
      ))
    ) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Marked loopback test database required'; END IF;
  FOREACH label IN ARRAY ARRAY['teacher_a','teacher_b','student','outsider','tv','expired'] LOOP
    uid:=gen_random_uuid(); INSERT INTO auth.users(id,aud,role,is_anonymous) VALUES(uid,'authenticated','authenticated',true);
    PERFORM set_config('test.boss_'||label,uid::text,true);
  END LOOP;
  INSERT INTO physical_internal.teacher_access(user_id,expires_at) VALUES
    (current_setting('test.boss_teacher_a')::uuid,now()+interval '2 hours'),
    (current_setting('test.boss_teacher_b')::uuid,now()+interval '2 hours');
  INSERT INTO public.mission_templates(name,buttons,teacher_id) VALUES('Boss preservation fixture','[]',current_setting('test.boss_teacher_a')::uuid) RETURNING id INTO template;
  INSERT INTO public.game_rooms(pin_code,name,teacher_id,status,boss_hp,boss_max_hp,template_id)
    VALUES(gen_random_uuid()::text,'Boss fixture A',current_setting('test.boss_teacher_a')::uuid,'boss_raid',100,100,template) RETURNING id INTO room_a;
  INSERT INTO public.game_rooms(pin_code,name,teacher_id,status,boss_hp,boss_max_hp)
    VALUES(gen_random_uuid()::text,'Boss fixture B',current_setting('test.boss_teacher_b')::uuid,'boss_raid',100,100) RETURNING id INTO room_b;
  INSERT INTO public.room_groups(room_id,group_name,score,help_requested_at) VALUES(room_a,'A1',500,now()) RETURNING id INTO group_a;
  INSERT INTO public.room_groups(room_id,group_name,score) VALUES(room_a,'A2',700) RETURNING id INTO group_a2;
  INSERT INTO public.room_groups(room_id,group_name,score) VALUES(room_b,'B1',900) RETURNING id INTO group_b;
  INSERT INTO physical_internal.classroom_members(room_id,user_id,group_id,expires_at,student_number,nickname) VALUES
    (room_a,current_setting('test.boss_student')::uuid,group_a,now()+interval '4 hours',1,'합성학생'),
    (room_a,current_setting('test.boss_expired')::uuid,group_a,now()-interval '1 second',2,'만료학생');
  INSERT INTO physical_internal.classroom_viewers(room_id,user_id,expires_at) VALUES(room_a,current_setting('test.boss_tv')::uuid,now()+interval '4 hours');
  INSERT INTO physical_internal.classroom_invites(group_id,code) VALUES(group_a,'synthetic-boss-invite');
  INSERT INTO physical_internal.classroom_board_invites(room_id,code) VALUES(room_a,'synthetic-boss-board');
  INSERT INTO physical_internal.classroom_recovery(room_id,code) VALUES(room_a,'synthetic-boss-recovery');
  INSERT INTO physical_internal.classroom_bootstrap(id,secret_hash) VALUES(true,'synthetic-boss-test-not-a-production-hash');
  INSERT INTO physical_internal.classroom_join_attempts(user_id,attempts,until_at) VALUES(current_setting('test.boss_student')::uuid,1,now()+interval '15 minutes');
  INSERT INTO physical_internal.teacher_leases(room_id,holder,until_at) VALUES(room_a,current_setting('test.boss_teacher_a')::uuid,now()+interval '5 seconds');
  INSERT INTO physical_internal.score_actions(action_id,group_id,amount) VALUES('synthetic-preserved-score',group_a,500);
  INSERT INTO physical_internal.boss_damage_actions(action_id,room_id,amount) VALUES('synthetic-preserved-damage',room_a,3);
  PERFORM set_config('test.boss_room_a',room_a::text,true); PERFORM set_config('test.boss_room_b',room_b::text,true);
  PERFORM set_config('test.boss_group_a',group_a::text,true); PERFORM set_config('test.boss_group_a2',group_a2::text,true);
END; $$;
