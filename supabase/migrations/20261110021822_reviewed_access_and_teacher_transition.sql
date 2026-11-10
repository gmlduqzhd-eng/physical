-- Retired tables have no remaining client references. Preserve rows and server-owner access.
ALTER TABLE public.bomb_defusal_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_controls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on bomb_defusal_scores" ON public.bomb_defusal_scores;
DROP POLICY IF EXISTS "Allow all on game_controls" ON public.game_controls;
REVOKE ALL ON TABLE public.bomb_defusal_scores, public.game_controls FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_score(text, integer), public.buy_buff(text) FROM PUBLIC, anon, authenticated;

-- Stop fresh shared-code sessions without breaking already running classrooms.
ALTER TABLE physical_internal.teacher_login_policy ADD COLUMN new_logins_enabled boolean NOT NULL DEFAULT false;
CREATE FUNCTION physical_internal.check_shared_teacher_login(server_secret text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT physical_internal.check_shared_teacher_access(server_secret) THEN RETURN false; END IF;
 RETURN coalesce((SELECT new_logins_enabled FROM physical_internal.teacher_login_policy WHERE id),false);
END; $$;
CREATE FUNCTION public.check_shared_teacher_login(server_secret text) RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.check_shared_teacher_login(server_secret); $$;

CREATE FUNCTION physical_internal.teacher_transition_status() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF NOT physical_internal.is_teacher_admin() THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('newLoginsEnabled',p.new_logins_enabled,'existingAccessEnabled',p.legacy_enabled,
  'remainingRooms',(SELECT count(*) FROM public.game_rooms r JOIN auth.users u ON u.id=r.teacher_id WHERE u.is_anonymous IS DISTINCT FROM false),
  'ongoingRooms',(SELECT count(*) FROM public.game_rooms r JOIN auth.users u ON u.id=r.teacher_id WHERE u.is_anonymous IS DISTINCT FROM false AND r.status<>'finished')) INTO result
 FROM physical_internal.teacher_login_policy p WHERE p.id;
 RETURN result;
END; $$;
CREATE FUNCTION public.teacher_transition_status() RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.teacher_transition_status(); $$;
REVOKE ALL ON FUNCTION physical_internal.check_shared_teacher_login(text),public.check_shared_teacher_login(text),physical_internal.teacher_transition_status(),public.teacher_transition_status() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.check_shared_teacher_login(text),public.check_shared_teacher_login(text) TO anon;
GRANT EXECUTE ON FUNCTION physical_internal.teacher_transition_status(),public.teacher_transition_status() TO authenticated;

-- Don't silently detach teachers from active lessons. Finish or recover them first.
CREATE OR REPLACE FUNCTION physical_internal.teacher_login_policy(enabled boolean DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result boolean;
BEGIN
 IF NOT physical_internal.is_teacher_admin() THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
 IF enabled IS NOT NULL THEN
  IF NOT enabled AND EXISTS(SELECT 1 FROM public.game_rooms r JOIN auth.users u ON u.id=r.teacher_id WHERE u.is_anonymous IS DISTINCT FROM false AND r.status<>'finished') THEN
   RAISE EXCEPTION 'Finish or recover ongoing shared-code classrooms first' USING ERRCODE='22023';
  END IF;
  UPDATE physical_internal.teacher_login_policy SET legacy_enabled=enabled,new_logins_enabled=false WHERE id;
  -- Existing permits expire naturally; the policy check immediately rejects them after cutover.
 END IF;
 SELECT legacy_enabled INTO result FROM physical_internal.teacher_login_policy WHERE id;RETURN result;
END; $$;
