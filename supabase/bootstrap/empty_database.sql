-- EMPTY SUPABASE DATABASE ONLY. Called inside install_empty.psql's transaction.
-- No seeds, classroom records, bootstrap secrets, or destructive reset operations.
DO $preflight$
DECLARE has_history boolean;
BEGIN
  IF current_setting('physical.empty_install', true) IS DISTINCT FROM 'transactional' THEN
    RAISE EXCEPTION 'Use supabase/install_empty.psql, not this file directly';
  END IF;
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations)' INTO has_history;
    IF has_history THEN RAISE EXCEPTION 'Existing migration history: empty installer is prohibited'; END IF;
  END IF;
  IF to_regnamespace('physical_internal') IS NOT NULL
     OR to_regnamespace('physical_studio_limits') IS NOT NULL OR EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e')
  ) OR EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')
  ) OR EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_type'::regclass AND d.objid=t.oid AND d.deptype IN ('e','i','a'))
  ) THEN
    RAISE EXCEPTION 'Empty database required: existing public application or physical_internal objects found. Nothing changed.';
  END IF;
  IF to_regclass('auth.users') IS NULL OR to_regprocedure('auth.uid()') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    RAISE EXCEPTION 'Supabase Auth schema and client roles must already exist';
  END IF;
END;
$preflight$;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
DO $$ BEGIN
  IF to_regprocedure('extensions.digest(text,text)') IS NULL OR to_regprocedure('extensions.gen_random_bytes(integer)') IS NULL THEN
    RAISE EXCEPTION 'pgcrypto must be available in extensions; do not move an existing extension automatically';
  END IF;
END; $$;

CREATE TABLE public.mission_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  buttons jsonb NOT NULL DEFAULT '[]'::jsonb, created_at timestamptz DEFAULT now()
);
CREATE TABLE public.game_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pin_code text UNIQUE NOT NULL, name text NOT NULL,
  template_id uuid REFERENCES public.mission_templates(id) ON DELETE SET NULL,
  status text CHECK (status IN ('waiting','playing','paused','locked','tsunami','boss_raid','time_attack','defense','zombie','mafia','finished')) DEFAULT 'waiting',
  global_time_modifier integer DEFAULT 0, boss_hp integer, boss_max_hp integer,
  active_minigame jsonb, announcement text, flash_sale boolean DEFAULT false,
  started_at timestamptz, created_at timestamptz DEFAULT now()
);
CREATE TABLE public.room_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  group_name text NOT NULL, score integer DEFAULT 0, is_defused boolean DEFAULT false,
  is_hacked boolean DEFAULT false, item_buff_until timestamptz, is_blinded_until timestamptz,
  completed_missions jsonb DEFAULT '[]'::jsonb, pending_missions jsonb DEFAULT '[]'::jsonb,
  badges jsonb DEFAULT '[]'::jsonb, stats jsonb DEFAULT '{}'::jsonb,
  spy_device_id text, avatar text, updated_at timestamptz DEFAULT now(), UNIQUE(room_id,group_name)
);
ALTER TABLE public.mission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_groups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mission_templates,public.game_rooms,public.room_groups FROM PUBLIC,anon,authenticated;
-- No policies here: deny by default, including before all migrations finish.

-- Compatibility objects required by the immutable 20261110021822 migration.
-- They start empty and closed; retired application data is never seeded here.
CREATE TABLE public.bomb_defusal_scores (
  id text PRIMARY KEY, class_name text NOT NULL, group_name text NOT NULL,
  score integer DEFAULT 0, mission_stats jsonb DEFAULT '{}'::jsonb,
  is_defused boolean DEFAULT false, updated_at timestamptz DEFAULT now(),
  is_hacked boolean DEFAULT false, item_buff_until timestamptz
);
CREATE TABLE public.game_controls (
  id integer PRIMARY KEY DEFAULT 1, status text DEFAULT 'paused',
  global_time_modifier integer DEFAULT 0, started_at timestamptz,
  current_event text DEFAULT 'none', last_score_time timestamptz, last_score_group text
);
ALTER TABLE public.bomb_defusal_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_controls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bomb_defusal_scores,public.game_controls FROM PUBLIC,anon,authenticated;

-- Required primitives and overloads referenced by immutable historical migrations.
-- INVOKER + no client EXECUTE + deny-all initial RLS. Final guarded private RPCs
-- call the UUID score primitive as their owner; a raise-only stub would break scoring.
CREATE FUNCTION public.increment_score(row_id uuid, amount integer) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF row_id IS NULL OR amount IS NULL OR amount NOT BETWEEN -1000000 AND 1000000 THEN
    RAISE EXCEPTION 'Invalid score action' USING ERRCODE='22023';
  END IF;
  UPDATE public.room_groups SET score=score+amount,updated_at=now() WHERE id=row_id;
END; $$;
CREATE FUNCTION public.increment_score(row_id text, amount integer) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT public.increment_score(row_id::uuid,amount); $$;
CREATE FUNCTION public.buy_buff(row_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  UPDATE public.room_groups SET score=score-200,item_buff_until=now()+interval '1 minute',updated_at=now()
  WHERE id=row_id AND score>=200;
END; $$;
CREATE FUNCTION public.buy_buff(row_id text) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT public.buy_buff(row_id::uuid); $$;
-- These are replaced by historical guarded implementations before commit.
CREATE FUNCTION public.attack_group(attacker_id uuid,target_id uuid,cost integer) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN RAISE EXCEPTION 'Installation incomplete' USING ERRCODE='42501'; END; $$;
CREATE FUNCTION public.reset_group_scores(room_uuid uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN RAISE EXCEPTION 'Installation incomplete' USING ERRCODE='42501'; END; $$;
REVOKE ALL ON FUNCTION public.increment_score(uuid,integer),public.increment_score(text,integer),public.buy_buff(uuid),public.buy_buff(text),public.attack_group(uuid,uuid,integer),public.reset_group_scores(uuid) FROM PUBLIC,anon,authenticated;
