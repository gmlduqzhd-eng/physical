-- Additive reliability fixes for the existing anonymous classroom app.
-- The internal ledger is outside the exposed public schema. No legacy records are changed.
CREATE SCHEMA IF NOT EXISTS physical_internal;
REVOKE ALL ON SCHEMA physical_internal FROM PUBLIC;
GRANT USAGE ON SCHEMA physical_internal TO anon, authenticated;

CREATE TABLE IF NOT EXISTS physical_internal.score_actions (
  action_id text PRIMARY KEY CHECK (char_length(action_id) BETWEEN 1 AND 128),
  group_id uuid NOT NULL REFERENCES public.room_groups(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount BETWEEN -1000000 AND 1000000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS score_actions_group_id_idx ON physical_internal.score_actions(group_id);
ALTER TABLE physical_internal.score_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON physical_internal.score_actions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON physical_internal.score_actions TO anon, authenticated;
CREATE POLICY score_actions_read ON physical_internal.score_actions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY score_actions_insert ON physical_internal.score_actions FOR INSERT TO anon, authenticated
  WITH CHECK (amount BETWEEN -1000000 AND 1000000 AND EXISTS (SELECT 1 FROM public.room_groups WHERE id = group_id));

-- No overloaded JSON RPC: the legacy deployment has both text and uuid increment_score.
-- This invoker function uses the explicitly typed, existing score API in one transaction.
CREATE OR REPLACE FUNCTION public.increment_classroom_score(row_id uuid, amount integer, action_id text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  requested_action text := coalesce(action_id, gen_random_uuid()::text);
  previous physical_internal.score_actions%ROWTYPE;
BEGIN
  IF amount IS NULL OR amount NOT BETWEEN -1000000 AND 1000000 OR char_length(requested_action) NOT BETWEEN 1 AND 128 THEN
    RAISE EXCEPTION 'Invalid score action' USING ERRCODE = '22023';
  END IF;
  INSERT INTO physical_internal.score_actions(action_id, group_id, amount)
    VALUES (requested_action, row_id, amount) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    SELECT * INTO previous FROM physical_internal.score_actions WHERE score_actions.action_id = requested_action;
    IF previous.group_id IS DISTINCT FROM row_id OR previous.amount IS DISTINCT FROM amount THEN
      RAISE EXCEPTION 'Score action id already used with a different payload' USING ERRCODE = '22023';
    END IF;
    RETURN true;
  END IF;
  PERFORM public.increment_score(row_id::uuid, amount);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_classroom_score(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_classroom_score(uuid, integer, text) TO anon, authenticated;
ALTER FUNCTION public.increment_score(uuid, integer) SET search_path = public, pg_temp;

-- Purchases lock the group before checking its balance. Flash-sale price comes from the room.
CREATE OR REPLACE FUNCTION public.purchase_classroom_buff(row_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  selected_group public.room_groups%ROWTYPE;
  price integer;
BEGIN
  SELECT * INTO selected_group FROM public.room_groups WHERE id = row_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Group no longer exists' USING ERRCODE = '23503'; END IF;
  IF selected_group.item_buff_until > now() THEN RETURN false; END IF;
  SELECT CASE WHEN coalesce(flash_sale, false) THEN 100 ELSE 200 END INTO price FROM public.game_rooms WHERE id = selected_group.room_id;
  IF selected_group.score < price THEN RETURN false; END IF;
  PERFORM public.increment_score(row_id::uuid, -price);
  UPDATE public.room_groups SET item_buff_until = now() + interval '1 minute', updated_at = now() WHERE id = row_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.purchase_classroom_buff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_classroom_buff(uuid) TO anon, authenticated;

-- Atomic damage avoids lost damage from simultaneous students and stale teacher snapshots.
CREATE OR REPLACE FUNCTION public.damage_classroom_boss(room_uuid uuid, amount integer)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE remaining integer;
BEGIN
  IF amount IS NULL OR amount NOT BETWEEN 1 AND 1000000 THEN RAISE EXCEPTION 'Invalid boss damage' USING ERRCODE = '22023'; END IF;
  UPDATE public.game_rooms SET boss_hp = greatest(0, boss_hp - amount)
    WHERE id = room_uuid AND status = 'boss_raid' AND boss_hp > 0 RETURNING boss_hp INTO remaining;
  RETURN remaining;
END;
$$;
REVOKE ALL ON FUNCTION public.damage_classroom_boss(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.damage_classroom_boss(uuid, integer) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
