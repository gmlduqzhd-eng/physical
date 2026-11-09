CREATE TABLE physical_internal.teacher_login_policy(id boolean PRIMARY KEY DEFAULT true CHECK(id),legacy_enabled boolean NOT NULL DEFAULT true);
INSERT INTO physical_internal.teacher_login_policy(id,legacy_enabled) VALUES(true,true);
ALTER TABLE physical_internal.teacher_login_policy ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON physical_internal.teacher_login_policy FROM PUBLIC,anon,authenticated;
CREATE FUNCTION physical_internal.teacher_login_policy(enabled boolean DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result boolean;
BEGIN
 IF NOT physical_internal.is_teacher_admin() THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
 IF enabled IS NOT NULL THEN
  UPDATE physical_internal.teacher_login_policy SET legacy_enabled=enabled WHERE id;
  IF NOT enabled THEN DELETE FROM physical_internal.teacher_access t USING auth.users u WHERE u.id=t.user_id AND u.is_anonymous IS DISTINCT FROM false; END IF;
 END IF;
 SELECT legacy_enabled INTO result FROM physical_internal.teacher_login_policy WHERE id;RETURN result;
END; $$;
CREATE FUNCTION public.teacher_login_policy(enabled boolean DEFAULT NULL) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.teacher_login_policy(enabled); $$;
CREATE FUNCTION physical_internal.check_shared_teacher_access(server_secret text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result boolean;
BEGIN
 IF server_secret IS NULL OR length(server_secret) NOT BETWEEN 32 AND 256 OR NOT (
  EXISTS(SELECT 1 FROM physical_internal.classroom_bootstrap WHERE secret_hash=encode(extensions.digest(server_secret,'sha256'),'hex')) OR EXISTS(SELECT 1 FROM physical_studio_limits.config WHERE secret_hash=encode(extensions.digest(server_secret,'sha256'),'hex'))
 ) THEN RAISE EXCEPTION 'Server required' USING ERRCODE='42501'; END IF;
 SELECT legacy_enabled INTO result FROM physical_internal.teacher_login_policy WHERE id;RETURN coalesce(result,false);
END; $$;
CREATE FUNCTION public.check_shared_teacher_access(server_secret text) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.check_shared_teacher_access(server_secret); $$;
CREATE OR REPLACE FUNCTION physical_internal.is_classroom_teacher() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM physical_internal.teacher_access t JOIN auth.users u ON u.id=t.user_id WHERE t.user_id=auth.uid() AND t.expires_at>now() AND (
  (u.is_anonymous IS DISTINCT FROM false AND EXISTS(SELECT 1 FROM physical_internal.teacher_login_policy WHERE id AND legacy_enabled)) OR EXISTS(SELECT 1 FROM physical_internal.teacher_accounts a WHERE a.user_id=u.id AND a.enabled)
 ));
$$;
REVOKE ALL ON FUNCTION physical_internal.teacher_login_policy(boolean),public.teacher_login_policy(boolean),physical_internal.check_shared_teacher_access(text),public.check_shared_teacher_access(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.teacher_login_policy(boolean),public.teacher_login_policy(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.check_shared_teacher_access(text),public.check_shared_teacher_access(text) TO anon;
