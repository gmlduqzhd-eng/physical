CREATE TABLE physical_internal.teacher_accounts (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL DEFAULT 'teacher' CHECK(role IN ('teacher','admin')),
 enabled boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1,
 requested_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz
);
CREATE TABLE physical_internal.teacher_admin_invitation (
 email text PRIMARY KEY, claimed_by uuid REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE physical_internal.teacher_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_internal.teacher_admin_invitation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON physical_internal.teacher_accounts,physical_internal.teacher_admin_invitation FROM PUBLIC,anon,authenticated;

CREATE FUNCTION physical_internal.teacher_account() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE person auth.users%ROWTYPE; entry physical_internal.teacher_accounts%ROWTYPE;
BEGIN
 SELECT * INTO person FROM auth.users WHERE id=auth.uid();
 IF NOT FOUND OR person.is_anonymous IS DISTINCT FROM false OR person.email_confirmed_at IS NULL THEN RAISE EXCEPTION 'Verified teacher account required' USING ERRCODE='42501'; END IF;
 INSERT INTO physical_internal.teacher_accounts(user_id) VALUES(person.id) ON CONFLICT DO NOTHING;
 -- A project administrator provisions this exact verified-email invitation.
 IF EXISTS(SELECT 1 FROM physical_internal.teacher_admin_invitation WHERE email=lower(person.email) AND claimed_by IS NULL) THEN
  UPDATE physical_internal.teacher_admin_invitation SET claimed_by=person.id WHERE email=lower(person.email) AND claimed_by IS NULL;
  UPDATE physical_internal.teacher_accounts SET role='admin',enabled=true,approved_at=coalesce(approved_at,now()) WHERE user_id=person.id;
 END IF;
 SELECT * INTO entry FROM physical_internal.teacher_accounts WHERE user_id=person.id;
 RETURN jsonb_build_object('id',entry.user_id,'enabled',entry.enabled,'role',entry.role,'version',entry.version);
END; $$;
CREATE FUNCTION public.teacher_account() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.teacher_account(); $$;

CREATE FUNCTION physical_internal.is_teacher_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM physical_internal.teacher_accounts a JOIN auth.users u ON u.id=a.user_id WHERE a.user_id=auth.uid() AND a.enabled AND a.role='admin' AND u.is_anonymous=false AND u.email_confirmed_at IS NOT NULL);
$$;
CREATE OR REPLACE FUNCTION physical_internal.is_classroom_teacher() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
  SELECT 1 FROM physical_internal.teacher_access t JOIN auth.users u ON u.id=t.user_id
  WHERE t.user_id=auth.uid() AND t.expires_at>now()
  AND (u.is_anonymous IS DISTINCT FROM false OR EXISTS(SELECT 1 FROM physical_internal.teacher_accounts a WHERE a.user_id=u.id AND a.enabled))
 );
$$;

CREATE FUNCTION physical_internal.manage_teacher_account(target_user uuid DEFAULT NULL, approve boolean DEFAULT NULL, desired_role text DEFAULT 'teacher')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT physical_internal.is_teacher_admin() THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(110901,1);
 IF target_user IS NOT NULL THEN
  IF approve IS NULL OR desired_role NOT IN ('teacher','admin') OR desired_role IS NULL THEN RAISE EXCEPTION 'Invalid account action' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM physical_internal.teacher_accounts WHERE user_id=target_user AND enabled AND role='admin') AND (NOT approve OR desired_role<>'admin')
   AND (SELECT count(*) FROM physical_internal.teacher_accounts WHERE enabled AND role='admin')<=1 THEN RAISE EXCEPTION 'Keep at least one administrator' USING ERRCODE='22023'; END IF;
  UPDATE physical_internal.teacher_accounts SET enabled=approve,role=desired_role,version=version+1,approved_at=CASE WHEN approve THEN now() ELSE approved_at END WHERE user_id=target_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Teacher request not found' USING ERRCODE='22023'; END IF;
  DELETE FROM physical_internal.teacher_access WHERE user_id=target_user;
  -- An invitation is consumed once; later revocation must not self-reenable it.
  DELETE FROM physical_internal.teacher_admin_invitation WHERE claimed_by=target_user;
 END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.user_id,'email',u.email,'role',a.role,'enabled',a.enabled,'requestedAt',a.requested_at) ORDER BY a.requested_at DESC) FROM physical_internal.teacher_accounts a JOIN auth.users u ON u.id=a.user_id),'[]'::jsonb);
END; $$;
CREATE FUNCTION public.manage_teacher_account(target_user uuid DEFAULT NULL, approve boolean DEFAULT NULL, desired_role text DEFAULT 'teacher')
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.manage_teacher_account(target_user,approve,desired_role); $$;

CREATE FUNCTION physical_internal.check_teacher_account(server_secret text, teacher_uuid uuid, session_version integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE entry physical_internal.teacher_accounts%ROWTYPE;
BEGIN
 IF server_secret IS NULL OR length(server_secret) NOT BETWEEN 32 AND 256 OR NOT (
  EXISTS(SELECT 1 FROM physical_internal.classroom_bootstrap WHERE secret_hash=encode(extensions.digest(server_secret,'sha256'),'hex')) OR
  EXISTS(SELECT 1 FROM physical_studio_limits.config WHERE secret_hash=encode(extensions.digest(server_secret,'sha256'),'hex'))
 ) THEN RAISE EXCEPTION 'Server authorization required' USING ERRCODE='42501'; END IF;
 SELECT a.* INTO entry FROM physical_internal.teacher_accounts a JOIN auth.users u ON u.id=a.user_id WHERE a.user_id=teacher_uuid AND a.enabled AND a.version=session_version AND u.is_anonymous=false AND u.email_confirmed_at IS NOT NULL;
 IF NOT FOUND THEN RETURN jsonb_build_object('enabled',false); END IF;
 RETURN jsonb_build_object('enabled',true,'role',entry.role);
END; $$;
CREATE FUNCTION public.check_teacher_account(server_secret text, teacher_uuid uuid, session_version integer)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.check_teacher_account(server_secret,teacher_uuid,session_version); $$;
REVOKE ALL ON FUNCTION physical_internal.teacher_account(),public.teacher_account(),physical_internal.is_teacher_admin(),physical_internal.manage_teacher_account(uuid,boolean,text),public.manage_teacher_account(uuid,boolean,text),physical_internal.check_teacher_account(text,uuid,integer),public.check_teacher_account(text,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.teacher_account(),public.teacher_account(),physical_internal.is_teacher_admin(),physical_internal.manage_teacher_account(uuid,boolean,text),public.manage_teacher_account(uuid,boolean,text) TO authenticated;
-- This private helper discloses only approval/role and requires a server secret.
GRANT USAGE ON SCHEMA physical_internal TO anon;
GRANT EXECUTE ON FUNCTION physical_internal.check_teacher_account(text,uuid,integer),public.check_teacher_account(text,uuid,integer) TO anon;
