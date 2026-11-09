CREATE FUNCTION physical_internal.is_google_teacher(user_uuid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM auth.users u JOIN auth.identities i ON i.user_id=u.id WHERE u.id=user_uuid AND u.is_anonymous=false AND u.email_confirmed_at IS NOT NULL AND i.provider='google' AND lower(coalesce(i.email,i.identity_data->>'email'))=lower(u.email));
$$;
REVOKE ALL ON FUNCTION physical_internal.is_google_teacher(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION physical_internal.is_teacher_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT physical_internal.is_google_teacher(auth.uid()) AND EXISTS(SELECT 1 FROM physical_internal.teacher_accounts a JOIN physical_internal.teacher_access t ON t.user_id=a.user_id WHERE a.user_id=auth.uid() AND a.enabled AND NOT a.blocked AND a.role='admin' AND t.expires_at>now());
$$;
CREATE OR REPLACE FUNCTION physical_internal.is_classroom_teacher() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM physical_internal.teacher_access t JOIN auth.users u ON u.id=t.user_id WHERE t.user_id=auth.uid() AND t.expires_at>now() AND (
  (u.is_anonymous IS DISTINCT FROM false AND EXISTS(SELECT 1 FROM physical_internal.teacher_login_policy WHERE id AND legacy_enabled)) OR (physical_internal.is_google_teacher(u.id) AND EXISTS(SELECT 1 FROM physical_internal.teacher_accounts a WHERE a.user_id=u.id AND a.enabled AND NOT a.blocked))
 ));
$$;
CREATE OR REPLACE FUNCTION physical_internal.check_teacher_account(server_secret text, teacher_uuid uuid, session_version integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE entry physical_internal.teacher_accounts%ROWTYPE;
BEGIN
 IF server_secret IS NULL OR length(server_secret) NOT BETWEEN 32 AND 256 OR NOT (
  EXISTS(SELECT 1 FROM physical_internal.classroom_bootstrap WHERE secret_hash=encode(extensions.digest(server_secret,'sha256'),'hex')) OR EXISTS(SELECT 1 FROM physical_studio_limits.config WHERE secret_hash=encode(extensions.digest(server_secret,'sha256'),'hex'))
 ) THEN RAISE EXCEPTION 'Server authorization required' USING ERRCODE='42501'; END IF;
 SELECT * INTO entry FROM physical_internal.teacher_accounts WHERE user_id=teacher_uuid AND enabled AND NOT blocked AND version=session_version AND physical_internal.is_google_teacher(teacher_uuid);
 IF NOT FOUND THEN RETURN jsonb_build_object('enabled',false); END IF;
 RETURN jsonb_build_object('enabled',true,'role',entry.role);
END; $$;
CREATE OR REPLACE FUNCTION physical_internal.teacher_account() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE person auth.users%ROWTYPE; entry physical_internal.teacher_accounts%ROWTYPE;
BEGIN
 SELECT * INTO person FROM auth.users WHERE id=auth.uid();
 IF NOT FOUND OR NOT physical_internal.is_google_teacher(person.id) THEN RAISE EXCEPTION 'Verified Google account required' USING ERRCODE='42501'; END IF;
 INSERT INTO physical_internal.teacher_accounts(user_id,enabled,approved_at) VALUES(person.id,true,now()) ON CONFLICT(user_id) DO NOTHING;
 UPDATE physical_internal.teacher_accounts SET enabled=NOT blocked,approved_at=coalesce(approved_at,now()) WHERE user_id=person.id;
 IF EXISTS(SELECT 1 FROM physical_internal.teacher_admin_invitation WHERE email=lower(person.email) AND claimed_by IS NULL) THEN
  UPDATE physical_internal.teacher_admin_invitation SET claimed_by=person.id WHERE email=lower(person.email) AND claimed_by IS NULL;
  UPDATE physical_internal.teacher_accounts SET role='admin' WHERE user_id=person.id AND NOT blocked;
 END IF;
 SELECT * INTO entry FROM physical_internal.teacher_accounts WHERE user_id=person.id;
 RETURN jsonb_build_object('id',entry.user_id,'enabled',entry.enabled,'role',entry.role,'version',entry.version);
END; $$;
