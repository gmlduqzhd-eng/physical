-- Fresh installation only, still in the original transaction. Never run on an upgrade.
DO $$ BEGIN
  IF current_setting('physical.empty_install',true) IS DISTINCT FROM 'transactional' THEN
    RAISE EXCEPTION 'Fresh installer transaction required';
  END IF;
END; $$;
-- Historical ledger policies are obsolete; all access is now guarded private RPC.
-- Do not edit historical migrations or remove policies from an existing database.
DROP POLICY score_actions_read ON physical_internal.score_actions;
DROP POLICY score_actions_insert ON physical_internal.score_actions;
DROP POLICY boss_damage_actions_read ON physical_internal.boss_damage_actions;
DROP POLICY boss_damage_actions_insert ON physical_internal.boss_damage_actions;

-- Preserve existing publication settings and registrations belonging to other apps.
DO $$ DECLARE name text; BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime' AND puballtables) THEN
    FOREACH name IN ARRAY ARRAY['game_rooms','room_groups','mission_templates'] LOOP
      IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=name) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',name);
      END IF;
    END LOOP;
  END IF;
END; $$;
