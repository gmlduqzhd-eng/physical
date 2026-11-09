CREATE TABLE physical_internal.teacher_auth_attempts(key text PRIMARY KEY,count integer NOT NULL,expires_at timestamptz NOT NULL);
ALTER TABLE physical_internal.teacher_auth_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON physical_internal.teacher_auth_attempts FROM PUBLIC,anon,authenticated;
CREATE FUNCTION physical_internal.teacher_login_attempt(server_secret text,actor_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE moment timestamptz; record physical_internal.teacher_auth_attempts%ROWTYPE;
BEGIN
 IF server_secret IS NULL OR length(server_secret) NOT BETWEEN 32 AND 256 OR NOT EXISTS(SELECT 1 FROM physical_internal.classroom_bootstrap WHERE secret_hash=encode(extensions.digest(server_secret,'sha256'),'hex')) THEN RAISE EXCEPTION 'Server required' USING ERRCODE='42501'; END IF;
 IF actor_hash IS NULL OR actor_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid attempt' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(110904,1); moment:=clock_timestamp();
 DELETE FROM physical_internal.teacher_auth_attempts WHERE expires_at<=moment;
 INSERT INTO physical_internal.teacher_auth_attempts AS a(key,count,expires_at) VALUES(actor_hash,1,moment+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET count=least(a.count+1,9) RETURNING * INTO record;
 RETURN jsonb_build_object('allowed',record.count<=8,'retrySeconds',CASE WHEN record.count<=8 THEN 0 ELSE greatest(1,ceil(extract(epoch FROM record.expires_at-moment))::integer) END);
END; $$;
CREATE FUNCTION public.teacher_login_attempt(server_secret text,actor_hash text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.teacher_login_attempt(server_secret,actor_hash); $$;
REVOKE ALL ON FUNCTION physical_internal.teacher_login_attempt(text,text),public.teacher_login_attempt(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.teacher_login_attempt(text,text),public.teacher_login_attempt(text,text) TO anon;
CREATE OR REPLACE FUNCTION physical_internal.is_teacher_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM physical_internal.teacher_accounts a JOIN auth.users u ON u.id=a.user_id JOIN physical_internal.teacher_access t ON t.user_id=a.user_id WHERE a.user_id=auth.uid() AND a.enabled AND a.role='admin' AND u.is_anonymous=false AND u.email_confirmed_at IS NOT NULL AND t.expires_at>now());
$$;
CREATE OR REPLACE FUNCTION physical_internal.delete_managed_classroom(room_uuid uuid, confirmation text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE room public.game_rooms%ROWTYPE;
BEGIN
 SELECT * INTO room FROM public.game_rooms WHERE id=room_uuid FOR UPDATE;
 IF NOT FOUND OR NOT physical_internal.is_classroom_teacher() OR NOT coalesce((room.teacher_id=auth.uid() OR physical_internal.is_teacher_admin()),false) THEN RAISE EXCEPTION 'Room owner or administrator required' USING ERRCODE='42501'; END IF;
 IF confirmation IS DISTINCT FROM room.name THEN RAISE EXCEPTION 'Room name confirmation required' USING ERRCODE='22023'; END IF;
 DELETE FROM public.game_rooms WHERE id=room_uuid; RETURN true;
END; $$;
