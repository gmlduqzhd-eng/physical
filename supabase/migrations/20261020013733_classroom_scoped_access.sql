-- Preserve every existing room/template; unowned legacy rows remain locked.
CREATE SCHEMA IF NOT EXISTS physical_internal;
REVOKE ALL ON SCHEMA physical_internal FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA physical_internal TO authenticated;
ALTER TABLE public.game_rooms ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES auth.users(id);
ALTER TABLE public.game_rooms ALTER COLUMN teacher_id SET DEFAULT auth.uid();
ALTER TABLE public.mission_templates ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES auth.users(id);
ALTER TABLE public.mission_templates ALTER COLUMN teacher_id SET DEFAULT auth.uid();
CREATE TABLE physical_internal.teacher_access(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE TABLE physical_internal.classroom_members(room_id uuid REFERENCES public.game_rooms(id) ON DELETE CASCADE, user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, group_id uuid NOT NULL REFERENCES public.room_groups(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL, PRIMARY KEY(room_id,user_id));
CREATE INDEX classroom_members_group_idx ON physical_internal.classroom_members(group_id,user_id);
CREATE TABLE physical_internal.classroom_invites(group_id uuid PRIMARY KEY REFERENCES public.room_groups(id) ON DELETE CASCADE, code text NOT NULL);
CREATE TABLE physical_internal.classroom_join_attempts(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, attempts integer NOT NULL DEFAULT 0, until_at timestamptz NOT NULL);
CREATE TABLE physical_internal.classroom_bootstrap(id boolean PRIMARY KEY DEFAULT true CHECK(id), secret_hash text NOT NULL);
ALTER TABLE physical_internal.teacher_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_internal.classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_internal.classroom_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_internal.classroom_join_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_internal.classroom_bootstrap ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA physical_internal FROM PUBLIC,anon,authenticated;
-- Install the random server secret hash separately; never commit the plaintext secret.
CREATE OR REPLACE FUNCTION physical_internal.is_classroom_teacher()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM physical_internal.teacher_access WHERE user_id=auth.uid() AND expires_at>now());
$$;
CREATE OR REPLACE FUNCTION physical_internal.owns_classroom(room_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT physical_internal.is_classroom_teacher() AND EXISTS(SELECT 1 FROM public.game_rooms WHERE id=room_uuid AND teacher_id=auth.uid());
$$;
CREATE OR REPLACE FUNCTION physical_internal.member_classroom(room_uuid uuid, group_uuid uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM physical_internal.classroom_members m JOIN public.game_rooms r ON r.id=m.room_id WHERE m.user_id=auth.uid() AND m.room_id=room_uuid AND (group_uuid IS NULL OR m.group_id=group_uuid) AND m.expires_at>now() AND r.status<>'finished');
$$;
CREATE OR REPLACE FUNCTION physical_internal.can_write_group(group_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.room_groups g WHERE g.id=group_uuid AND (physical_internal.owns_classroom(g.room_id) OR physical_internal.member_classroom(g.room_id,g.id)));
$$;
CREATE OR REPLACE FUNCTION physical_internal.authorize_classroom_teacher(bootstrap text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM physical_internal.classroom_bootstrap WHERE secret_hash=encode(extensions.digest(bootstrap,'sha256'),'hex')) THEN RAISE EXCEPTION 'Teacher authorization required' USING ERRCODE='42501'; END IF;
 INSERT INTO physical_internal.teacher_access(user_id,expires_at) VALUES(auth.uid(),now()+interval '2 hours') ON CONFLICT(user_id) DO UPDATE SET expires_at=EXCLUDED.expires_at;
 RETURN true;
END; $$;
CREATE OR REPLACE FUNCTION public.authorize_classroom_teacher(bootstrap text)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.authorize_classroom_teacher(bootstrap); $$;
CREATE OR REPLACE FUNCTION physical_internal.revoke_classroom_teacher()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF; DELETE FROM physical_internal.teacher_access WHERE user_id=auth.uid(); END; $$;
CREATE OR REPLACE FUNCTION public.revoke_classroom_teacher()
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.revoke_classroom_teacher(); $$;
CREATE OR REPLACE FUNCTION physical_internal.lookup_classroom(pin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_room public.game_rooms%ROWTYPE; n integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 INSERT INTO physical_internal.classroom_join_attempts(user_id,attempts,until_at) VALUES(auth.uid(),1,now()+interval '15 minutes') ON CONFLICT(user_id) DO UPDATE SET attempts=CASE WHEN classroom_join_attempts.until_at<now() THEN 1 ELSE classroom_join_attempts.attempts+1 END,until_at=CASE WHEN classroom_join_attempts.until_at<now() THEN now()+interval '15 minutes' ELSE classroom_join_attempts.until_at END RETURNING attempts INTO n;
 IF n>12 THEN RETURN jsonb_build_object('error','요청이 많습니다. 15분 후 다시 시도하세요.'); END IF;
 SELECT * INTO v_room FROM public.game_rooms WHERE pin_code=pin AND teacher_id IS NOT NULL AND status<>'finished';
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('id',v_room.id,'name',v_room.name,'pin_code',v_room.pin_code,'status',v_room.status);
END; $$;
CREATE OR REPLACE FUNCTION public.lookup_classroom(pin text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.lookup_classroom(pin); $$;
CREATE OR REPLACE FUNCTION physical_internal.join_secure_classroom(room_uuid uuid, group_name text, invite_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE group_uuid uuid; n integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 INSERT INTO physical_internal.classroom_join_attempts(user_id,attempts,until_at) VALUES(auth.uid(),1,now()+interval '15 minutes') ON CONFLICT(user_id) DO UPDATE SET attempts=CASE WHEN classroom_join_attempts.until_at<now() THEN 1 ELSE classroom_join_attempts.attempts+1 END,until_at=CASE WHEN classroom_join_attempts.until_at<now() THEN now()+interval '15 minutes' ELSE classroom_join_attempts.until_at END RETURNING attempts INTO n;
 IF n>12 THEN RETURN NULL; END IF;
 SELECT g.id INTO group_uuid FROM public.room_groups g JOIN public.game_rooms r ON r.id=g.room_id JOIN physical_internal.classroom_invites i ON i.group_id=g.id WHERE g.room_id=room_uuid AND g.group_name=join_secure_classroom.group_name AND r.status<>'finished' AND i.code=lower(invite_code);
 IF group_uuid IS NULL THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM physical_internal.classroom_members WHERE user_id=auth.uid() AND room_id=room_uuid AND group_id<>group_uuid AND expires_at>now()) THEN RETURN NULL; END IF;
 INSERT INTO physical_internal.classroom_members(room_id,user_id,group_id,expires_at) VALUES(room_uuid,auth.uid(),group_uuid,now()+interval '4 hours') ON CONFLICT(room_id,user_id) DO UPDATE SET group_id=EXCLUDED.group_id,expires_at=EXCLUDED.expires_at;
 RETURN group_uuid;
END; $$;
CREATE OR REPLACE FUNCTION public.join_secure_classroom(room_uuid uuid, group_name text, invite_code text)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.join_secure_classroom(room_uuid,group_name,invite_code); $$;
CREATE OR REPLACE FUNCTION physical_internal.create_secure_classroom(room_name text, template_uuid uuid, group_names text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE room public.game_rooms%ROWTYPE; g uuid; label text; pin text;
BEGIN
 IF NOT physical_internal.is_classroom_teacher() THEN RAISE EXCEPTION 'Teacher authorization required' USING ERRCODE='42501'; END IF;
 IF char_length(trim(room_name)) NOT BETWEEN 1 AND 80 OR cardinality(group_names) NOT BETWEEN 1 AND 12 OR EXISTS(SELECT 1 FROM unnest(group_names) v WHERE char_length(v) NOT BETWEEN 1 AND 30) THEN RAISE EXCEPTION 'Invalid classroom' USING ERRCODE='22023'; END IF;
 IF template_uuid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.mission_templates WHERE id=template_uuid AND (teacher_id=auth.uid() OR teacher_id IS NULL)) THEN RAISE EXCEPTION 'Template access denied' USING ERRCODE='42501'; END IF;
 -- Serialize the small room creation operation so PIN collision is checked transactionally.
 PERFORM pg_advisory_xact_lock(82171020);
 LOOP pin:=lpad((floor(random()*90000000)+10000000)::bigint::text,8,'0'); EXIT WHEN NOT EXISTS(SELECT 1 FROM public.game_rooms WHERE pin_code=pin); END LOOP;
 INSERT INTO public.game_rooms(name,pin_code,template_id,teacher_id) VALUES(trim(room_name),pin,template_uuid,auth.uid()) RETURNING * INTO room;
 FOREACH label IN ARRAY group_names LOOP
   INSERT INTO public.room_groups(room_id,group_name,avatar) VALUES(room.id,label,'Smile') RETURNING id INTO g;
   INSERT INTO physical_internal.classroom_invites(group_id,code) VALUES(g,encode(extensions.gen_random_bytes(6),'hex'));
 END LOOP;
 RETURN to_jsonb(room);
END; $$;
CREATE OR REPLACE FUNCTION public.create_secure_classroom(room_name text, template_uuid uuid, group_names text[])
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.create_secure_classroom(room_name,template_uuid,group_names); $$;
CREATE OR REPLACE FUNCTION physical_internal.get_classroom_invites(room_uuid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN IF NOT physical_internal.owns_classroom(room_uuid) THEN RAISE EXCEPTION 'Room owner required' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('group_name',g.group_name,'code',i.code)),'[]'::jsonb) FROM public.room_groups g JOIN physical_internal.classroom_invites i ON i.group_id=g.id WHERE g.room_id=room_uuid);
END; $$;
CREATE OR REPLACE FUNCTION public.get_classroom_invites(room_uuid uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.get_classroom_invites(room_uuid); $$;
-- No anonymous direct table access. Keep ownership checks for every operation.
DO $$ DECLARE p record; BEGIN FOR p IN SELECT schemaname,tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('game_rooms','room_groups','mission_templates') LOOP EXECUTE format('DROP POLICY %I ON %I.%I',p.policyname,p.schemaname,p.tablename); END LOOP; END; $$;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_rooms,public.room_groups,public.mission_templates FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.game_rooms,public.room_groups,public.mission_templates TO authenticated;
REVOKE UPDATE ON public.room_groups FROM authenticated;
GRANT UPDATE(group_name,avatar,is_defused,is_hacked,item_buff_until,is_blinded_until,completed_missions,pending_missions,badges,stats,spy_device_id,updated_at) ON public.room_groups TO authenticated;
CREATE POLICY classroom_room_select ON public.game_rooms FOR SELECT TO authenticated USING(physical_internal.owns_classroom(id) OR physical_internal.member_classroom(id));
CREATE POLICY classroom_room_insert ON public.game_rooms FOR INSERT TO authenticated WITH CHECK(teacher_id=auth.uid() AND physical_internal.is_classroom_teacher());
CREATE POLICY classroom_room_update ON public.game_rooms FOR UPDATE TO authenticated USING(physical_internal.owns_classroom(id)) WITH CHECK(teacher_id=auth.uid() AND physical_internal.is_classroom_teacher());
CREATE POLICY classroom_room_delete ON public.game_rooms FOR DELETE TO authenticated USING(physical_internal.owns_classroom(id));
CREATE POLICY classroom_group_select ON public.room_groups FOR SELECT TO authenticated USING(physical_internal.owns_classroom(room_id) OR physical_internal.member_classroom(room_id));
CREATE POLICY classroom_group_insert ON public.room_groups FOR INSERT TO authenticated WITH CHECK(physical_internal.owns_classroom(room_id));
CREATE POLICY classroom_group_update ON public.room_groups FOR UPDATE TO authenticated USING(physical_internal.owns_classroom(room_id) OR physical_internal.member_classroom(room_id,id)) WITH CHECK(physical_internal.owns_classroom(room_id) OR physical_internal.member_classroom(room_id,id));
CREATE POLICY classroom_group_delete ON public.room_groups FOR DELETE TO authenticated USING(physical_internal.owns_classroom(room_id));
CREATE POLICY classroom_template_select ON public.mission_templates FOR SELECT TO authenticated USING((physical_internal.is_classroom_teacher() AND (teacher_id=auth.uid() OR teacher_id IS NULL)) OR EXISTS(SELECT 1 FROM public.game_rooms r WHERE r.template_id=mission_templates.id));
CREATE POLICY classroom_template_insert ON public.mission_templates FOR INSERT TO authenticated WITH CHECK(teacher_id=auth.uid() AND physical_internal.is_classroom_teacher());
CREATE POLICY classroom_template_update ON public.mission_templates FOR UPDATE TO authenticated USING(teacher_id=auth.uid() AND physical_internal.is_classroom_teacher()) WITH CHECK(teacher_id=auth.uid() AND physical_internal.is_classroom_teacher());
CREATE POLICY classroom_template_delete ON public.mission_templates FOR DELETE TO authenticated USING(teacher_id=auth.uid() AND physical_internal.is_classroom_teacher());
CREATE INDEX IF NOT EXISTS game_rooms_teacher_id_idx ON public.game_rooms(teacher_id);
CREATE INDEX IF NOT EXISTS mission_templates_teacher_id_idx ON public.mission_templates(teacher_id);

-- Legacy RPC entry points now delegate to guarded private definer implementations.
CREATE OR REPLACE FUNCTION physical_internal.secure_damage_classroom_boss(room_uuid uuid, amount integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $secure$
BEGIN
 IF auth.uid() IS NULL OR NOT (physical_internal.owns_classroom(room_uuid) OR physical_internal.member_classroom(room_uuid)) THEN RAISE EXCEPTION 'Classroom access denied' USING ERRCODE='42501'; END IF;
 RETURN public.apply_classroom_boss_damage(room_uuid,amount,gen_random_uuid()::text);
END;
$secure$;
CREATE OR REPLACE FUNCTION public.damage_classroom_boss(room_uuid uuid, amount integer) RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path='' AS $wrap$ SELECT physical_internal.secure_damage_classroom_boss(room_uuid,amount); $wrap$;
CREATE OR REPLACE FUNCTION physical_internal.secure_increment_classroom_score(row_id uuid, amount integer, action_id text DEFAULT NULL::text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $secure$
DECLARE
  requested_action text := coalesce(action_id, gen_random_uuid()::text);
  previous physical_internal.score_actions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT (physical_internal.can_write_group(row_id)) THEN RAISE EXCEPTION 'Classroom access denied' USING ERRCODE='42501'; END IF;
  IF amount IS NULL OR amount NOT BETWEEN -1000000 AND 1000000 OR char_length(requested_action) NOT BETWEEN 1 AND 128 THEN
    RAISE EXCEPTION 'Invalid score action' USING ERRCODE = '22023';
  END IF;
  INSERT INTO physical_internal.score_actions(action_id, group_id, amount)
    VALUES (requested_action, row_id, amount) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    SELECT * INTO previous FROM physical_internal.score_actions WHERE score_actions.action_id = requested_action;
    IF previous.group_id IS DISTINCT FROM row_id OR previous.amount IS DISTINCT FROM amount THEN
      RAISE EXCEPTION 'Score action id already used with a different payload' USING ERRCODE = '22023';
    END IF;
    RETURN true;
  END IF;
  PERFORM public.increment_score(row_id::uuid, amount);
  RETURN true;
END;
$secure$;
CREATE OR REPLACE FUNCTION public.increment_classroom_score(row_id uuid, amount integer, action_id text DEFAULT NULL::text) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $wrap$ SELECT physical_internal.secure_increment_classroom_score(row_id,amount,action_id); $wrap$;
CREATE OR REPLACE FUNCTION physical_internal.secure_purchase_classroom_buff(row_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $secure$
DECLARE
  selected_group public.room_groups%ROWTYPE;
  price integer;
BEGIN
  IF auth.uid() IS NULL OR NOT (physical_internal.can_write_group(row_id)) THEN RAISE EXCEPTION 'Classroom access denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO selected_group FROM public.room_groups WHERE id = row_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Group no longer exists' USING ERRCODE = '23503'; END IF;
  IF selected_group.item_buff_until > now() THEN RETURN false; END IF;
  SELECT CASE WHEN coalesce(flash_sale, false) THEN 100 ELSE 200 END INTO price FROM public.game_rooms WHERE id = selected_group.room_id;
  IF selected_group.score < price THEN RETURN false; END IF;
  PERFORM public.increment_score(row_id::uuid, -price);
  UPDATE public.room_groups SET item_buff_until = now() + interval '1 minute', updated_at = now() WHERE id = row_id;
  RETURN true;
END;
$secure$;
CREATE OR REPLACE FUNCTION public.purchase_classroom_buff(row_id uuid) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $wrap$ SELECT physical_internal.secure_purchase_classroom_buff(row_id); $wrap$;
CREATE OR REPLACE FUNCTION physical_internal.secure_submit_classroom_mission(row_id uuid, mission_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $secure$
BEGIN
  IF auth.uid() IS NULL OR NOT (physical_internal.can_write_group(row_id)) THEN RAISE EXCEPTION 'Classroom access denied' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.room_groups g JOIN public.game_rooms r ON r.id=g.room_id
    JOIN public.mission_templates t ON t.id=r.template_id,
    jsonb_array_elements(t.buttons) mission
    WHERE g.id=row_id AND mission->>'id'=mission_id AND coalesce((mission->>'requires_approval')::boolean,false)
  ) THEN RAISE EXCEPTION 'Approval mission not found' USING ERRCODE='22023'; END IF;
  UPDATE public.room_groups SET pending_missions=coalesce(pending_missions,'[]'::jsonb)||jsonb_build_array(mission_id), updated_at=now()
    WHERE id=row_id AND NOT coalesce(pending_missions,'[]'::jsonb) ? mission_id;
  RETURN FOUND;
END;
$secure$;
CREATE OR REPLACE FUNCTION public.submit_classroom_mission(row_id uuid, mission_id text) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $wrap$ SELECT physical_internal.secure_submit_classroom_mission(row_id,mission_id); $wrap$;
CREATE OR REPLACE FUNCTION physical_internal.secure_review_classroom_mission(row_id uuid, mission_id text, approve boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $secure$
DECLARE selected_group public.room_groups%ROWTYPE; mission jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT (EXISTS(SELECT 1 FROM public.room_groups g WHERE g.id=row_id AND physical_internal.owns_classroom(g.room_id))) THEN RAISE EXCEPTION 'Classroom access denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO selected_group FROM public.room_groups WHERE id=row_id FOR UPDATE;
  IF NOT FOUND OR NOT coalesce(selected_group.pending_missions,'[]'::jsonb) ? mission_id THEN RETURN false; END IF;
  SELECT item INTO mission FROM public.game_rooms r JOIN public.mission_templates t ON t.id=r.template_id,
    jsonb_array_elements(t.buttons) item WHERE r.id=selected_group.room_id AND item->>'id'=mission_id;
  IF approve AND mission IS NULL THEN RAISE EXCEPTION 'Mission no longer exists' USING ERRCODE='22023'; END IF;
  UPDATE public.room_groups SET pending_missions=coalesce(pending_missions,'[]'::jsonb)-mission_id,
    completed_missions=CASE WHEN approve AND NOT coalesce(completed_missions,'[]'::jsonb) ? mission_id
      THEN coalesce(completed_missions,'[]'::jsonb)||jsonb_build_array(mission_id) ELSE completed_missions END,updated_at=now()
    WHERE id=row_id;
  IF approve THEN PERFORM public.increment_classroom_score(row_id,(mission->>'amount')::integer); END IF;
  RETURN true;
END;
$secure$;
CREATE OR REPLACE FUNCTION public.review_classroom_mission(row_id uuid, mission_id text, approve boolean) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $wrap$ SELECT physical_internal.secure_review_classroom_mission(row_id,mission_id,approve); $wrap$;
CREATE OR REPLACE FUNCTION physical_internal.secure_reset_group_scores(room_uuid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $secure$
BEGIN
  IF auth.uid() IS NULL OR NOT (physical_internal.owns_classroom(room_uuid)) THEN RAISE EXCEPTION 'Classroom access denied' USING ERRCODE='42501'; END IF;
  UPDATE public.room_groups
  SET score = 0,
      is_defused = false,
      is_hacked = false,
      item_buff_until = null,
      is_blinded_until = null,
      completed_missions = '[]'::jsonb,
      pending_missions = '[]'::jsonb,
      badges = '[]'::jsonb,
      stats = '{}'::jsonb,
      spy_device_id = null,
      updated_at = NOW()
  WHERE room_id = room_uuid;
END;
$secure$;
CREATE OR REPLACE FUNCTION public.reset_group_scores(room_uuid uuid) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $wrap$ SELECT physical_internal.secure_reset_group_scores(room_uuid); $wrap$;
CREATE OR REPLACE FUNCTION physical_internal.secure_attack_group(attacker_id uuid, target_id uuid, cost integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $secure$
DECLARE attacker public.room_groups%ROWTYPE; target public.room_groups%ROWTYPE; price integer;
BEGIN
  IF auth.uid() IS NULL OR NOT (physical_internal.can_write_group(attacker_id)) THEN RAISE EXCEPTION 'Classroom access denied' USING ERRCODE='42501'; END IF;
  IF attacker_id IS NULL OR target_id IS NULL OR attacker_id=target_id OR cost IS NULL OR cost NOT IN (150,300) THEN
    RAISE EXCEPTION 'Invalid attack target or price' USING ERRCODE='22023';
  END IF;
  -- Always lock in UUID order, including reciprocal attacks, to avoid deadlocks.
  PERFORM 1 FROM public.room_groups WHERE id IN (attacker_id,target_id) ORDER BY id FOR UPDATE;
  SELECT * INTO attacker FROM public.room_groups WHERE id=attacker_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attacker no longer exists' USING ERRCODE='23503'; END IF;
  SELECT * INTO target FROM public.room_groups WHERE id=target_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target no longer exists' USING ERRCODE='23503'; END IF;
  IF attacker.room_id IS DISTINCT FROM target.room_id THEN
    RAISE EXCEPTION 'Target belongs to a different classroom' USING ERRCODE='22023';
  END IF;
  SELECT CASE WHEN coalesce(flash_sale,false) THEN 150 ELSE 300 END INTO price
    FROM public.game_rooms WHERE id=attacker.room_id;
  IF cost IS DISTINCT FROM price THEN RAISE EXCEPTION 'Attack price changed; refresh the classroom' USING ERRCODE='22023'; END IF;
  IF target.is_hacked THEN RAISE EXCEPTION 'Target is already hacked' USING ERRCODE='22023'; END IF;
  IF attacker.score < price THEN RAISE EXCEPTION 'Not enough score to attack' USING ERRCODE='22023'; END IF;
  UPDATE public.room_groups SET score=score-price,updated_at=now() WHERE id=attacker_id;
  UPDATE public.room_groups SET is_hacked=true,updated_at=now() WHERE id=target_id;
END;
$secure$;
CREATE OR REPLACE FUNCTION public.attack_group(attacker_id uuid, target_id uuid, cost integer) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $wrap$ SELECT physical_internal.secure_attack_group(attacker_id,target_id,cost); $wrap$;
CREATE OR REPLACE FUNCTION physical_internal.secure_apply_classroom_boss_damage(room_uuid uuid, amount integer, action_id text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $secure$
DECLARE remaining integer; previous physical_internal.boss_damage_actions%ROWTYPE; winning_group uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT ((physical_internal.owns_classroom(room_uuid) OR physical_internal.member_classroom(room_uuid))) THEN RAISE EXCEPTION 'Classroom access denied' USING ERRCODE='42501'; END IF;
  IF amount IS NULL OR amount NOT BETWEEN 1 AND 1000000 OR action_id IS NULL OR char_length(action_id) NOT BETWEEN 1 AND 128 THEN
    RAISE EXCEPTION 'Invalid boss damage action' USING ERRCODE='22023';
  END IF;
  INSERT INTO physical_internal.boss_damage_actions(action_id,room_id,amount)
    VALUES(action_id,room_uuid,amount) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    SELECT * INTO previous FROM physical_internal.boss_damage_actions WHERE boss_damage_actions.action_id=apply_classroom_boss_damage.action_id;
    IF previous.room_id IS DISTINCT FROM room_uuid OR previous.amount IS DISTINCT FROM amount THEN
      RAISE EXCEPTION 'Boss damage id already used with a different payload' USING ERRCODE='22023';
    END IF;
    SELECT coalesce(boss_hp,0) INTO remaining FROM public.game_rooms WHERE id=room_uuid;
    RETURN remaining;
  END IF;
  UPDATE public.game_rooms SET boss_hp=greatest(0,boss_hp-amount)
    WHERE id=room_uuid AND status='boss_raid' AND boss_hp>0 RETURNING boss_hp INTO remaining;
  IF remaining=0 THEN
    -- The room row remains locked until every group reward commits.
    UPDATE public.game_rooms SET status='playing',boss_hp=null,boss_max_hp=null,
      announcement='🎉 보스 레이드 성공! 모든 모둠에게 2000점이 지급되었습니다!' WHERE id=room_uuid;
    FOR winning_group IN SELECT id FROM public.room_groups WHERE room_id=room_uuid ORDER BY id LOOP
      UPDATE public.room_groups SET score=score+2000,updated_at=now() WHERE id=winning_group;
    END LOOP;
  END IF;
  RETURN remaining;
END;
$secure$;
CREATE OR REPLACE FUNCTION public.apply_classroom_boss_damage(room_uuid uuid, amount integer, action_id text) RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path='' AS $wrap$ SELECT physical_internal.secure_apply_classroom_boss_damage(room_uuid,amount,action_id); $wrap$;

REVOKE ALL ON FUNCTION public.increment_score(uuid,integer),public.buy_buff(uuid) FROM PUBLIC,anon,authenticated;
-- Every private helper checks auth.uid / ownership / membership, and none is public.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA physical_internal FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.is_classroom_teacher(),physical_internal.owns_classroom(uuid),physical_internal.member_classroom(uuid,uuid),physical_internal.can_write_group(uuid),physical_internal.authorize_classroom_teacher(text),physical_internal.revoke_classroom_teacher(),physical_internal.lookup_classroom(text),physical_internal.join_secure_classroom(uuid,text,text),physical_internal.create_secure_classroom(text,uuid,text[]),physical_internal.get_classroom_invites(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.secure_damage_classroom_boss(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.secure_increment_classroom_score(uuid,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.secure_purchase_classroom_buff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.secure_submit_classroom_mission(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.secure_review_classroom_mission(uuid,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.secure_reset_group_scores(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.secure_attack_group(uuid,uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.secure_apply_classroom_boss_damage(uuid,integer,text) TO authenticated;

REVOKE ALL ON FUNCTION public.authorize_classroom_teacher(text),public.revoke_classroom_teacher(),public.lookup_classroom(text),public.join_secure_classroom(uuid,text,text),public.create_secure_classroom(text,uuid,text[]),public.get_classroom_invites(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_classroom_teacher(text),public.revoke_classroom_teacher(),public.lookup_classroom(text),public.join_secure_classroom(uuid,text,text),public.create_secure_classroom(text,uuid,text[]),public.get_classroom_invites(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.damage_classroom_boss(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.damage_classroom_boss(uuid,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.increment_classroom_score(uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.increment_classroom_score(uuid,integer,text) TO authenticated;
REVOKE ALL ON FUNCTION public.purchase_classroom_buff(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_classroom_buff(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_classroom_mission(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_classroom_mission(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.review_classroom_mission(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_classroom_mission(uuid,text,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.reset_group_scores(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reset_group_scores(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.attack_group(uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.attack_group(uuid,uuid,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.apply_classroom_boss_damage(uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_classroom_boss_damage(uuid,integer,text) TO authenticated;

CREATE OR REPLACE FUNCTION physical_internal.check_group_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF current_user IN ('anon','authenticated') AND NOT physical_internal.owns_classroom(OLD.room_id) AND (NEW.group_name IS DISTINCT FROM OLD.group_name OR NEW.id IS DISTINCT FROM OLD.id OR NEW.room_id IS DISTINCT FROM OLD.room_id) THEN RAISE EXCEPTION 'Group identity is teacher controlled' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION physical_internal.check_group_identity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER physical_group_identity BEFORE UPDATE ON public.room_groups FOR EACH ROW EXECUTE FUNCTION physical_internal.check_group_identity();
NOTIFY pgrst,'reload schema';

CREATE OR REPLACE FUNCTION physical_internal.logout_classroom()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF; DELETE FROM physical_internal.teacher_access WHERE user_id=auth.uid(); DELETE FROM physical_internal.classroom_members WHERE user_id=auth.uid(); END; $$;
CREATE OR REPLACE FUNCTION public.logout_classroom() RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.logout_classroom(); $$;
REVOKE ALL ON FUNCTION physical_internal.logout_classroom(),public.logout_classroom() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.logout_classroom(),public.logout_classroom() TO authenticated;
CREATE TABLE physical_internal.teacher_leases(room_id uuid PRIMARY KEY REFERENCES public.game_rooms(id) ON DELETE CASCADE,holder uuid NOT NULL,until_at timestamptz NOT NULL);
ALTER TABLE physical_internal.teacher_leases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON physical_internal.teacher_leases FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION physical_internal.claim_classroom_controller(room_uuid uuid,holder_uuid uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF auth.uid() IS NULL OR NOT physical_internal.owns_classroom(room_uuid) THEN RAISE EXCEPTION 'Room owner required' USING ERRCODE='42501'; END IF;
 INSERT INTO physical_internal.teacher_leases VALUES(room_uuid,holder_uuid,now()+interval '5 seconds') ON CONFLICT(room_id) DO UPDATE SET holder=EXCLUDED.holder,until_at=EXCLUDED.until_at WHERE teacher_leases.until_at<now() OR teacher_leases.holder=holder_uuid;
 RETURN FOUND;
END; $$;
CREATE OR REPLACE FUNCTION public.claim_classroom_controller(room_uuid uuid,holder_uuid uuid) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.claim_classroom_controller(room_uuid,holder_uuid); $$;
REVOKE ALL ON FUNCTION physical_internal.claim_classroom_controller(uuid,uuid),public.claim_classroom_controller(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.claim_classroom_controller(uuid,uuid),public.claim_classroom_controller(uuid,uuid) TO authenticated;
-- Cross-group game effects are fixed server operations, never arbitrary row updates.
CREATE OR REPLACE FUNCTION physical_internal.classroom_effect(room_uuid uuid,effect text,target_uuid uuid DEFAULT NULL,player_role text DEFAULT 'novice')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE own_group public.room_groups%ROWTYPE; target public.room_groups%ROWTYPE; room public.game_rooms%ROWTYPE; price integer;
BEGIN
 IF auth.uid() IS NULL OR NOT physical_internal.member_classroom(room_uuid) THEN RAISE EXCEPTION 'Classroom membership required' USING ERRCODE='42501'; END IF;
 SELECT r.* INTO room FROM public.game_rooms r WHERE r.id=room_uuid FOR UPDATE;
 IF room.status NOT IN ('playing','boss_raid','time_attack','defense','zombie','mafia','tsunami') THEN RAISE EXCEPTION 'Classroom not playing' USING ERRCODE='22023'; END IF;
 SELECT g.* INTO own_group FROM public.room_groups g JOIN physical_internal.classroom_members m ON m.group_id=g.id WHERE m.user_id=auth.uid() AND m.room_id=room_uuid FOR UPDATE OF g;
 IF target_uuid IS NOT NULL THEN SELECT * INTO target FROM public.room_groups WHERE id=target_uuid AND room_id=room_uuid AND id<>own_group.id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Invalid classroom target' USING ERRCODE='42501'; END IF; END IF;
 IF effect='bomb_pass' THEN
  IF target.id IS NULL OR (room.active_minigame->>'type') IS DISTINCT FROM 'bomb' OR (room.active_minigame->>'holderId') IS DISTINCT FROM own_group.id::text THEN RETURN false; END IF;
  UPDATE public.game_rooms SET active_minigame=jsonb_set(active_minigame,'{holderId}',to_jsonb(target.id::text)) WHERE id=room_uuid; RETURN true;
 ELSIF effect='infect' THEN
  IF target.id IS NULL OR room.status<>'zombie' OR NOT coalesce(own_group.badges,'[]'::jsonb)?'zombie' OR coalesce(target.badges,'[]'::jsonb)?'zombie' THEN RETURN false; END IF;
  UPDATE public.room_groups SET badges=coalesce(badges,'[]'::jsonb)||'["zombie"]'::jsonb,score=score-300 WHERE id=target.id;
  UPDATE public.room_groups SET score=score+500 WHERE id=own_group.id; RETURN true;
 END IF;
 price:=CASE effect WHEN 'donate' THEN 100 WHEN 'steal' THEN 150 WHEN 'time' THEN 200 WHEN 'blind' THEN 200 ELSE NULL END;
 IF price IS NULL THEN RAISE EXCEPTION 'Unknown effect' USING ERRCODE='22023'; END IF;
 IF room.flash_sale THEN price:=price/2; END IF;
 IF effect='steal' AND player_role='thief' THEN price:=price/2; END IF;
 IF own_group.score<price THEN RETURN false; END IF;
 IF effect IN ('donate','steal','blind') AND target.id IS NULL THEN RETURN false; END IF;
 UPDATE public.room_groups SET score=score-price,updated_at=now() WHERE id=own_group.id;
 IF effect='time' THEN UPDATE public.game_rooms SET global_time_modifier=global_time_modifier+30 WHERE id=room_uuid;
 ELSIF effect='donate' THEN UPDATE public.room_groups SET score=score+CASE WHEN player_role='priest' THEN 400 ELSE 200 END WHERE id=target.id;
 ELSIF effect='steal' THEN UPDATE public.room_groups SET score=score-100 WHERE id=target.id; UPDATE public.room_groups SET score=score+100 WHERE id=own_group.id;
 ELSIF effect='blind' THEN UPDATE public.room_groups SET is_blinded_until=now()+interval '15 seconds' WHERE id=target.id;
 END IF;
 RETURN true;
END; $$;
CREATE OR REPLACE FUNCTION public.classroom_effect(room_uuid uuid,effect text,target_uuid uuid DEFAULT NULL,player_role text DEFAULT 'novice')
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.classroom_effect(room_uuid,effect,target_uuid,player_role); $$;
REVOKE ALL ON FUNCTION physical_internal.classroom_effect(uuid,text,uuid,text),public.classroom_effect(uuid,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.classroom_effect(uuid,text,uuid,text),public.classroom_effect(uuid,text,uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
