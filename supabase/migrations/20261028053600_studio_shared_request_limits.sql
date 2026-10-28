-- Dedicated limiter. It has no access to classroom data or student identities.
CREATE SCHEMA IF NOT EXISTS physical_studio_limits;
REVOKE ALL ON SCHEMA physical_studio_limits FROM PUBLIC, anon, authenticated;
CREATE TABLE physical_studio_limits.config (
  id boolean PRIMARY KEY DEFAULT true CHECK(id),
  secret_hash text NOT NULL CHECK(secret_hash ~ '^[a-f0-9]{64}$'),
  daily_limit integer NOT NULL DEFAULT 100 CHECK(daily_limit BETWEEN 1 AND 10000),
  budget_day date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date,
  used integer NOT NULL DEFAULT 0 CHECK(used >= 0)
);
CREATE TABLE physical_studio_limits.counters (
  key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE physical_studio_limits.leases (
  id boolean PRIMARY KEY DEFAULT true CHECK(id), token uuid NOT NULL, expires_at timestamptz NOT NULL
);
ALTER TABLE physical_studio_limits.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_studio_limits.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_studio_limits.leases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA physical_studio_limits FROM PUBLIC, anon, authenticated;

-- The server-only secret is separately provisioned; a fresh project fails closed.
CREATE FUNCTION physical_studio_limits.request(server_secret text, request_kind text, actor_hash text, lease_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  moment timestamptz := clock_timestamp();
  today date := (moment AT TIME ZONE 'Asia/Seoul')::date;
  setting physical_studio_limits.config%ROWTYPE;
  wait_until timestamptz;
  counter_key text;
BEGIN
  SELECT * INTO setting FROM physical_studio_limits.config WHERE id;
  IF server_secret IS NULL OR length(server_secret) NOT BETWEEN 32 AND 256 OR setting.id IS NULL
    OR setting.secret_hash <> encode(extensions.digest(server_secret,'sha256'),'hex') THEN
    RAISE EXCEPTION 'Limiter authorization required' USING ERRCODE='42501';
  END IF;
  IF request_kind IS NULL OR request_kind NOT IN ('login','generate','release')
    OR actor_hash IS NULL OR actor_hash !~ '^[a-f0-9]{64}$' OR lease_token IS NULL THEN
    RAISE EXCEPTION 'Invalid limiter request' USING ERRCODE='22023';
  END IF;
  -- A single transaction lock makes every instance share admission and counters.
  PERFORM pg_catalog.pg_advisory_xact_lock(280532, 1);
  moment := clock_timestamp();
  today := (moment AT TIME ZONE 'Asia/Seoul')::date;
  DELETE FROM physical_studio_limits.counters WHERE expires_at <= moment;
  DELETE FROM physical_studio_limits.leases WHERE expires_at <= moment;
  IF request_kind='release' THEN
    DELETE FROM physical_studio_limits.leases WHERE token=lease_token;
    RETURN jsonb_build_object('allowed',true,'retrySeconds',0,'reason','released');
  END IF;
  IF request_kind='login' THEN
    counter_key := 'login:' || actor_hash;
    INSERT INTO physical_studio_limits.counters AS c(key,count,expires_at)
      VALUES(counter_key,1,moment+interval '15 minutes')
      ON CONFLICT(key) DO UPDATE SET count=least(c.count+1,9);
    SELECT expires_at INTO wait_until FROM physical_studio_limits.counters WHERE key=counter_key AND count>8;
    RETURN jsonb_build_object('allowed',wait_until IS NULL,'retrySeconds',CASE WHEN wait_until IS NULL THEN 0 ELSE greatest(1,ceil(extract(epoch FROM wait_until-moment))::integer) END,'reason','login');
  END IF;
  SELECT expires_at INTO wait_until FROM physical_studio_limits.leases WHERE id;
  IF wait_until IS NOT NULL THEN RETURN jsonb_build_object('allowed',false,'retrySeconds',greatest(1,ceil(extract(epoch FROM wait_until-moment))::integer),'reason','busy'); END IF;
  SELECT expires_at INTO wait_until FROM physical_studio_limits.counters WHERE key='generate:global' AND count>=3;
  IF wait_until IS NOT NULL THEN RETURN jsonb_build_object('allowed',false,'retrySeconds',greatest(1,ceil(extract(epoch FROM wait_until-moment))::integer),'reason','minute'); END IF;
  -- Refresh after lock acquisition so concurrent requests cannot overspend.
  SELECT * INTO setting FROM physical_studio_limits.config WHERE id FOR UPDATE;
  IF setting.budget_day<>today THEN
    UPDATE physical_studio_limits.config SET used=0,budget_day=today WHERE id;
    setting.used:=0;
  END IF;
  IF setting.used>=setting.daily_limit THEN
    RETURN jsonb_build_object('allowed',false,'retrySeconds',greatest(1,ceil(extract(epoch FROM ((today+1)::timestamp AT TIME ZONE 'Asia/Seoul')-moment))::integer),'reason','daily');
  END IF;
  INSERT INTO physical_studio_limits.counters AS c(key,count,expires_at) VALUES('generate:global',1,moment+interval '1 minute')
    ON CONFLICT(key) DO UPDATE SET count=c.count+1;
  UPDATE physical_studio_limits.config SET used=used+1 WHERE id;
  INSERT INTO physical_studio_limits.leases(id,token,expires_at) VALUES(true,lease_token,moment+interval '130 seconds');
  RETURN jsonb_build_object('allowed',true,'retrySeconds',0,'reason','accepted');
END;
$$;
REVOKE ALL ON FUNCTION physical_studio_limits.request(text,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA physical_studio_limits TO anon;
GRANT EXECUTE ON FUNCTION physical_studio_limits.request(text,text,text,uuid) TO anon;
CREATE FUNCTION public.studio_limit_request(server_secret text, request_kind text, actor_hash text, lease_token uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  SELECT physical_studio_limits.request(server_secret,request_kind,actor_hash,lease_token);
$$;
REVOKE ALL ON FUNCTION public.studio_limit_request(text,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.studio_limit_request(text,text,text,uuid) TO anon;
