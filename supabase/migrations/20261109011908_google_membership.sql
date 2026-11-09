ALTER TABLE physical_internal.teacher_accounts ADD COLUMN blocked boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION physical_internal.teacher_account() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE person auth.users%ROWTYPE; entry physical_internal.teacher_accounts%ROWTYPE;
BEGIN
 SELECT * INTO person FROM auth.users WHERE id=auth.uid();
 IF NOT FOUND OR person.is_anonymous IS DISTINCT FROM false OR person.email_confirmed_at IS NULL OR NOT EXISTS(SELECT 1 FROM auth.identities WHERE user_id=person.id AND provider='google') THEN RAISE EXCEPTION 'Verified Google account required' USING ERRCODE='42501'; END IF;
 INSERT INTO physical_internal.teacher_accounts(user_id,enabled,approved_at) VALUES(person.id,true,now()) ON CONFLICT(user_id) DO NOTHING;
 UPDATE physical_internal.teacher_accounts SET enabled=NOT blocked,approved_at=coalesce(approved_at,now()) WHERE user_id=person.id;
 IF EXISTS(SELECT 1 FROM physical_internal.teacher_admin_invitation WHERE email=lower(person.email) AND claimed_by IS NULL) THEN
  UPDATE physical_internal.teacher_admin_invitation SET claimed_by=person.id WHERE email=lower(person.email) AND claimed_by IS NULL;
  UPDATE physical_internal.teacher_accounts SET role='admin' WHERE user_id=person.id AND NOT blocked;
 END IF;
 SELECT * INTO entry FROM physical_internal.teacher_accounts WHERE user_id=person.id;
 RETURN jsonb_build_object('id',entry.user_id,'enabled',entry.enabled,'role',entry.role,'version',entry.version);
END; $$;
CREATE OR REPLACE FUNCTION physical_internal.manage_teacher_account(target_user uuid DEFAULT NULL, approve boolean DEFAULT NULL, desired_role text DEFAULT 'teacher') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT physical_internal.is_teacher_admin() THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(110901,1);
 IF target_user IS NOT NULL THEN
  IF approve IS NULL OR desired_role IS NULL OR desired_role NOT IN ('teacher','admin') THEN RAISE EXCEPTION 'Invalid account action' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM physical_internal.teacher_accounts WHERE user_id=target_user AND enabled AND role='admin') AND (NOT approve OR desired_role<>'admin') AND (SELECT count(*) FROM physical_internal.teacher_accounts WHERE enabled AND role='admin')<=1 THEN RAISE EXCEPTION 'Keep at least one administrator' USING ERRCODE='22023'; END IF;
  UPDATE physical_internal.teacher_accounts SET enabled=approve,blocked=NOT approve,role=desired_role,version=version+1 WHERE user_id=target_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found' USING ERRCODE='22023'; END IF;
  DELETE FROM physical_internal.teacher_access WHERE user_id=target_user;
  DELETE FROM physical_internal.teacher_admin_invitation WHERE claimed_by=target_user;
 END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.user_id,'email',u.email,'role',a.role,'enabled',a.enabled,'requestedAt',a.requested_at) ORDER BY a.requested_at DESC) FROM physical_internal.teacher_accounts a JOIN auth.users u ON u.id=a.user_id),'[]'::jsonb);
END; $$;
CREATE FUNCTION physical_internal.teacher_members(page_offset integer DEFAULT 0, page_size integer DEFAULT 30, query text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE total integer; members jsonb;
BEGIN
 IF NOT physical_internal.is_teacher_admin() THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
 IF page_offset IS NULL OR page_offset NOT BETWEEN 0 AND 100000 OR page_size IS NULL OR page_size NOT BETWEEN 1 AND 50 OR query IS NULL OR length(query)>100 THEN RAISE EXCEPTION 'Invalid page' USING ERRCODE='22023'; END IF;
 SELECT count(*) INTO total FROM physical_internal.teacher_accounts a JOIN auth.users u ON u.id=a.user_id WHERE position(lower(query) in lower(coalesce(u.email,'')))>0 OR query='';
 SELECT coalesce(jsonb_agg(entry),'[]'::jsonb) INTO members FROM (
  SELECT a.user_id AS id,u.email,a.role,a.enabled,a.requested_at AS "joinedAt",u.last_sign_in_at AS "lastSignInAt" FROM physical_internal.teacher_accounts a JOIN auth.users u ON u.id=a.user_id WHERE position(lower(query) in lower(coalesce(u.email,'')))>0 OR query='' ORDER BY a.requested_at DESC,a.user_id LIMIT page_size OFFSET page_offset
 )entry;
 RETURN jsonb_build_object('total',total,'members',members);
END; $$;
CREATE FUNCTION public.teacher_members(page_offset integer DEFAULT 0,page_size integer DEFAULT 30,query text DEFAULT '') RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.teacher_members(page_offset,page_size,query); $$;
REVOKE ALL ON FUNCTION physical_internal.teacher_members(integer,integer,text),public.teacher_members(integer,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.teacher_members(integer,integer,text),public.teacher_members(integer,integer,text) TO authenticated;
