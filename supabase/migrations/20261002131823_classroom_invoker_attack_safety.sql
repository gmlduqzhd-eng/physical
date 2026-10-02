-- These functions only use tables already granted to the caller. Keep RLS applicable
-- instead of running public score mutations with the database owner's privileges.
ALTER FUNCTION public.increment_score(uuid,integer) SECURITY INVOKER;
ALTER FUNCTION public.buy_buff(uuid) SECURITY INVOKER;
ALTER FUNCTION public.reset_group_scores(uuid) SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.attack_group(attacker_id uuid,target_id uuid,cost integer)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE attacker public.room_groups%ROWTYPE; target public.room_groups%ROWTYPE; price integer;
BEGIN
  IF attacker_id IS NULL OR target_id IS NULL OR attacker_id=target_id OR cost IS NULL OR cost NOT IN (150,300) THEN
    RAISE EXCEPTION 'Invalid attack target or price' USING ERRCODE='22023';
  END IF;
  -- Always lock in UUID order, including reciprocal attacks, to avoid deadlocks.
  PERFORM 1 FROM public.room_groups WHERE id IN (attacker_id,target_id) ORDER BY id FOR UPDATE;
  SELECT * INTO attacker FROM public.room_groups WHERE id=attacker_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attacker no longer exists' USING ERRCODE='23503'; END IF;
  SELECT * INTO target FROM public.room_groups WHERE id=target_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target no longer exists' USING ERRCODE='23503'; END IF;
  IF attacker.room_id IS DISTINCT FROM target.room_id THEN
    RAISE EXCEPTION 'Target belongs to a different classroom' USING ERRCODE='22023';
  END IF;
  SELECT CASE WHEN coalesce(flash_sale,false) THEN 150 ELSE 300 END INTO price
    FROM public.game_rooms WHERE id=attacker.room_id;
  IF cost IS DISTINCT FROM price THEN RAISE EXCEPTION 'Attack price changed; refresh the classroom' USING ERRCODE='22023'; END IF;
  IF target.is_hacked THEN RAISE EXCEPTION 'Target is already hacked' USING ERRCODE='22023'; END IF;
  IF attacker.score < price THEN RAISE EXCEPTION 'Not enough score to attack' USING ERRCODE='22023'; END IF;
  UPDATE public.room_groups SET score=score-price,updated_at=now() WHERE id=attacker_id;
  UPDATE public.room_groups SET is_hacked=true,updated_at=now() WHERE id=target_id;
END;
$$;
REVOKE ALL ON FUNCTION public.attack_group(uuid,uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attack_group(uuid,uuid,integer) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
