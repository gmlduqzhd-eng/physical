\ir assert_isolated.sql
BEGIN;
-- Transaction-only assertions; no real room, account or result writes.
DO $$ DECLARE table_name text; role_name text; BEGIN
 FOREACH table_name IN ARRAY ARRAY['bomb_defusal_scores','game_controls'] LOOP
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_table_privilege(role_name,'public.'||table_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') THEN
    RAISE EXCEPTION 'Retired table still exposed: % %',table_name,role_name;
   END IF;
  END LOOP;
 END LOOP;
 IF has_function_privilege('anon','public.increment_score(text,integer)','EXECUTE') OR has_function_privilege('authenticated','public.buy_buff(text)','EXECUTE') THEN RAISE EXCEPTION 'Old write function still exposed'; END IF;
 IF (SELECT new_logins_enabled FROM physical_internal.teacher_login_policy WHERE id) THEN RAISE EXCEPTION 'Shared logins still enabled'; END IF;
 IF NOT (SELECT bool_and(relrowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND relname IN ('game_rooms','room_groups','mission_templates')) THEN RAISE EXCEPTION 'Classroom RLS changed'; END IF;
END; $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.check_shared_teacher_login('synthetic-invalid-server-secret-123456');RAISE EXCEPTION 'Invalid server secret accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.teacher_transition_status();RAISE EXCEPTION 'Anonymous transition access accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END; $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated"}',true);
DO $$ BEGIN
 BEGIN PERFORM public.teacher_transition_status();RAISE EXCEPTION 'Non-admin transition access accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END; $$;
RESET ROLE;
DO $$ DECLARE fixture uuid:=gen_random_uuid(); BEGIN
 INSERT INTO auth.users(id,aud,role,is_anonymous,email,email_confirmed_at) VALUES(fixture,'authenticated','authenticated',false,'qa-review-'||fixture||'@example.invalid',now());
 INSERT INTO auth.identities(provider_id,user_id,identity_data,provider) VALUES(fixture::text,fixture,jsonb_build_object('sub',fixture::text,'email','qa-review-'||fixture||'@example.invalid'),'google');
 INSERT INTO physical_internal.teacher_accounts(user_id,role,enabled) VALUES(fixture,'admin',true);
 INSERT INTO physical_internal.teacher_access(user_id,expires_at) VALUES(fixture,now()+interval '5 minutes');
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',fixture,'role','authenticated')::text,true);
END; $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE status jsonb; BEGIN
 status:=public.teacher_transition_status();
 IF status IS NULL OR (status->>'newLoginsEnabled')::boolean THEN RAISE EXCEPTION 'Admin transition state invalid'; END IF;
 IF (status->>'ongoingRooms')::integer>0 THEN
  BEGIN PERFORM public.teacher_login_policy(false);RAISE EXCEPTION 'Ongoing classroom was detached';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
  IF NOT public.teacher_login_policy() THEN RAISE EXCEPTION 'Existing teacher access was revoked'; END IF;
 END IF;
END; $$;
RESET ROLE;
SELECT 'reviewed access assertions passed' AS result;
ROLLBACK;
