-- Preserve concurrent pending/completed mission updates and approve a request only once.
CREATE OR REPLACE FUNCTION public.submit_classroom_mission(row_id uuid, mission_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.room_groups g JOIN public.game_rooms r ON r.id=g.room_id
    JOIN public.mission_templates t ON t.id=r.template_id,
    jsonb_array_elements(t.buttons) mission
    WHERE g.id=row_id AND mission->>'id'=mission_id AND coalesce((mission->>'requires_approval')::boolean,false)
  ) THEN RAISE EXCEPTION 'Approval mission not found' USING ERRCODE='22023'; END IF;
  UPDATE public.room_groups SET pending_missions=coalesce(pending_missions,'[]'::jsonb)||jsonb_build_array(mission_id), updated_at=now()
    WHERE id=row_id AND NOT coalesce(pending_missions,'[]'::jsonb) ? mission_id;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_classroom_mission(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_classroom_mission(uuid,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.review_classroom_mission(row_id uuid, mission_id text, approve boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE selected_group public.room_groups%ROWTYPE; mission jsonb;
BEGIN
  SELECT * INTO selected_group FROM public.room_groups WHERE id=row_id FOR UPDATE;
  IF NOT FOUND OR NOT coalesce(selected_group.pending_missions,'[]'::jsonb) ? mission_id THEN RETURN false; END IF;
  SELECT item INTO mission FROM public.game_rooms r JOIN public.mission_templates t ON t.id=r.template_id,
    jsonb_array_elements(t.buttons) item WHERE r.id=selected_group.room_id AND item->>'id'=mission_id;
  IF approve AND mission IS NULL THEN RAISE EXCEPTION 'Mission no longer exists' USING ERRCODE='22023'; END IF;
  UPDATE public.room_groups SET pending_missions=coalesce(pending_missions,'[]'::jsonb)-mission_id,
    completed_missions=CASE WHEN approve AND NOT coalesce(completed_missions,'[]'::jsonb) ? mission_id
      THEN coalesce(completed_missions,'[]'::jsonb)||jsonb_build_array(mission_id) ELSE completed_missions END,updated_at=now()
    WHERE id=row_id;
  IF approve THEN PERFORM public.increment_classroom_score(row_id,(mission->>'amount')::integer); END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.review_classroom_mission(uuid,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_classroom_mission(uuid,text,boolean) TO anon,authenticated;
-- Pin the remaining legacy function search paths without changing their existing behavior.
ALTER FUNCTION public.increment_score(text,integer) SET search_path=public,pg_temp;
ALTER FUNCTION public.buy_buff(text) SET search_path=public,pg_temp;
ALTER FUNCTION public.buy_buff(uuid) SET search_path=public,pg_temp;
ALTER FUNCTION public.attack_group(uuid,uuid,integer) SET search_path=public,pg_temp;
ALTER FUNCTION public.reset_group_scores(uuid) SET search_path=public,pg_temp;
NOTIFY pgrst,'reload schema';
