BEGIN;
INSERT INTO physical_studio_limits.config(id,secret_hash,daily_limit,budget_day,used)
VALUES(true,encode(extensions.digest('synthetic-limiter-test-secret-12345678','sha256'),'hex'),100,(now() AT TIME ZONE 'Asia/Seoul')::date,0)
ON CONFLICT(id) DO UPDATE SET secret_hash=excluded.secret_hash,daily_limit=100,budget_day=excluded.budget_day,used=0;
DELETE FROM physical_studio_limits.counters;
DELETE FROM physical_studio_limits.leases;
DO $$
DECLARE secret text:='synthetic-limiter-test-secret-12345678'; actor text:=repeat('a',64); first uuid:=gen_random_uuid(); other uuid:=gen_random_uuid(); answer jsonb;
BEGIN
  BEGIN
    PERFORM public.studio_limit_request('wrong-secret-value-123456789012345678','generate',actor,first);
    RAISE EXCEPTION 'Bad secret accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  answer:=public.studio_limit_request(secret,'generate',actor,first);
  ASSERT (answer->>'allowed')::boolean,'First request rejected';
  answer:=public.studio_limit_request(secret,'generate',repeat('b',64),other);
  ASSERT NOT (answer->>'allowed')::boolean AND answer->>'reason'='busy','Other instance bypassed global lease';
  PERFORM public.studio_limit_request(secret,'release',actor,other);
  ASSERT EXISTS(SELECT 1 FROM physical_studio_limits.leases WHERE token=first),'Wrong token released lease';
  PERFORM public.studio_limit_request(secret,'release',actor,first);
  FOR i IN 1..2 LOOP
    ASSERT (public.studio_limit_request(secret,'generate',actor,first)->>'allowed')::boolean;
    PERFORM public.studio_limit_request(secret,'release',actor,first);
  END LOOP;
  answer:=public.studio_limit_request(secret,'generate',actor,first);
  ASSERT NOT (answer->>'allowed')::boolean AND answer->>'reason'='minute','Minute cap bypassed';
  UPDATE physical_studio_limits.counters SET expires_at=now()-interval '1 second';
  ASSERT (public.studio_limit_request(secret,'generate',actor,first)->>'allowed')::boolean,'Window did not reset';
  UPDATE physical_studio_limits.leases SET expires_at=now()-interval '1 second';
  ASSERT (public.studio_limit_request(secret,'generate',actor,other)->>'allowed')::boolean,'Expired instance lease did not recover';
  PERFORM public.studio_limit_request(secret,'release',actor,other);
  DELETE FROM physical_studio_limits.counters;
  UPDATE physical_studio_limits.config SET used=daily_limit WHERE id;
  answer:=public.studio_limit_request(secret,'generate',actor,first);
  ASSERT NOT (answer->>'allowed')::boolean AND answer->>'reason'='daily','Daily cap bypassed';
  UPDATE physical_studio_limits.config SET budget_day=budget_day-1 WHERE id;
  ASSERT (public.studio_limit_request(secret,'generate',actor,first)->>'allowed')::boolean,'Daily cap did not reset';
  FOR i IN 1..8 LOOP ASSERT (public.studio_limit_request(secret,'login',actor,first)->>'allowed')::boolean; END LOOP;
  ASSERT NOT (public.studio_limit_request(secret,'login',actor,first)->>'allowed')::boolean,'Login cap bypassed';
  ASSERT NOT has_table_privilege('anon','physical_studio_limits.config','SELECT'),'Anonymous secret config read';
  ASSERT NOT has_table_privilege('anon','physical_studio_limits.counters','SELECT'),'Anonymous counter read';
  ASSERT NOT has_function_privilege('authenticated','public.studio_limit_request(text,text,text,uuid)','EXECUTE'),'Student can call limiter';
END $$;
ROLLBACK;
