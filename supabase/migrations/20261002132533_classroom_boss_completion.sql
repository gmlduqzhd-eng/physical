-- Keep boss damage retries and the final reward atomic without an open admin tab.
CREATE TABLE physical_internal.boss_damage_actions (
  action_id text PRIMARY KEY CHECK (char_length(action_id) BETWEEN 1 AND 128),
  room_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount BETWEEN 1 AND 1000000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX boss_damage_actions_room_id_idx ON physical_internal.boss_damage_actions(room_id);
ALTER TABLE physical_internal.boss_damage_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON physical_internal.boss_damage_actions FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON physical_internal.boss_damage_actions TO anon,authenticated;
CREATE POLICY boss_damage_actions_read ON physical_internal.boss_damage_actions FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY boss_damage_actions_insert ON physical_internal.boss_damage_actions FOR INSERT TO anon,authenticated
  WITH CHECK (amount BETWEEN 1 AND 1000000 AND EXISTS (SELECT 1 FROM public.game_rooms WHERE id=room_id));

CREATE OR REPLACE FUNCTION public.apply_classroom_boss_damage(room_uuid uuid,amount integer,action_id text)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE remaining integer; previous physical_internal.boss_damage_actions%ROWTYPE; winning_group uuid;
BEGIN
  IF amount IS NULL OR amount NOT BETWEEN 1 AND 1000000 OR action_id IS NULL OR char_length(action_id) NOT BETWEEN 1 AND 128 THEN
    RAISE EXCEPTION 'Invalid boss damage action' USING ERRCODE='22023';
  END IF;
  INSERT INTO physical_internal.boss_damage_actions(action_id,room_id,amount)
    VALUES(action_id,room_uuid,amount) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    SELECT * INTO previous FROM physical_internal.boss_damage_actions WHERE boss_damage_actions.action_id=apply_classroom_boss_damage.action_id;
    IF previous.room_id IS DISTINCT FROM room_uuid OR previous.amount IS DISTINCT FROM amount THEN
      RAISE EXCEPTION 'Boss damage id already used with a different payload' USING ERRCODE='22023';
    END IF;
    SELECT coalesce(boss_hp,0) INTO remaining FROM public.game_rooms WHERE id=room_uuid;
    RETURN remaining;
  END IF;
  UPDATE public.game_rooms SET boss_hp=greatest(0,boss_hp-amount)
    WHERE id=room_uuid AND status='boss_raid' AND boss_hp>0 RETURNING boss_hp INTO remaining;
  IF remaining=0 THEN
    -- The room row remains locked until every group reward commits.
    UPDATE public.game_rooms SET status='playing',boss_hp=null,boss_max_hp=null,
      announcement='🎉 보스 레이드 성공! 모든 모둠에게 2000점이 지급되었습니다!' WHERE id=room_uuid;
    FOR winning_group IN SELECT id FROM public.room_groups WHERE room_id=room_uuid ORDER BY id LOOP
      PERFORM public.increment_classroom_score(winning_group,2000);
    END LOOP;
  END IF;
  RETURN remaining;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_classroom_boss_damage(uuid,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_classroom_boss_damage(uuid,integer,text) TO anon,authenticated;

-- Preserve the existing two-argument client API without introducing overloaded RPCs.
CREATE OR REPLACE FUNCTION public.damage_classroom_boss(room_uuid uuid,amount integer)
RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
  SELECT public.apply_classroom_boss_damage(room_uuid,amount,gen_random_uuid()::text);
$$;
REVOKE ALL ON FUNCTION public.damage_classroom_boss(uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.damage_classroom_boss(uuid,integer) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
