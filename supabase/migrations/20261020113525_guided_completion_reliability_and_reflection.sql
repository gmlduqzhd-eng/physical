-- Guided completion is idempotent even when a browser resends after a timeout.
CREATE OR REPLACE FUNCTION physical_internal.secure_submit_classroom_mission(row_id uuid, mission_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $secure$
DECLARE selected_group public.room_groups%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT physical_internal.can_write_group(row_id) THEN
    RAISE EXCEPTION 'Classroom access denied' USING ERRCODE='42501';
  END IF;
  SELECT * INTO selected_group FROM public.room_groups WHERE id=row_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Group not found' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.game_rooms r JOIN public.mission_templates t ON t.id=r.template_id,
      jsonb_array_elements(t.buttons) mission
    WHERE r.id=selected_group.room_id AND mission->>'id'=mission_id
      AND coalesce((mission->>'requires_approval')::boolean,false)
  ) THEN RAISE EXCEPTION 'Approval mission not found' USING ERRCODE='22023'; END IF;
  IF coalesce(selected_group.completed_missions,'[]'::jsonb) ? mission_id
    OR coalesce(selected_group.pending_missions,'[]'::jsonb) ? mission_id THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.game_rooms WHERE id=selected_group.room_id AND status IN ('playing','paused')) THEN
    RAISE EXCEPTION 'Classroom is closed' USING ERRCODE='22023';
  END IF;
  UPDATE public.room_groups SET pending_missions=coalesce(pending_missions,'[]'::jsonb)||jsonb_build_array(mission_id),updated_at=now()
    WHERE id=row_id;
  RETURN true;
END;
$secure$;

CREATE OR REPLACE FUNCTION physical_internal.secure_review_classroom_mission(row_id uuid, mission_id text, approve boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $secure$
DECLARE selected_group public.room_groups%ROWTYPE; mission jsonb; already_completed boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.room_groups g WHERE g.id=row_id AND physical_internal.owns_classroom(g.room_id)) THEN
    RAISE EXCEPTION 'Classroom access denied' USING ERRCODE='42501';
  END IF;
  SELECT * INTO selected_group FROM public.room_groups WHERE id=row_id FOR UPDATE;
  IF NOT FOUND OR NOT coalesce(selected_group.pending_missions,'[]'::jsonb) ? mission_id THEN RETURN false; END IF;
  already_completed := coalesce(selected_group.completed_missions,'[]'::jsonb) ? mission_id;
  SELECT item INTO mission FROM public.game_rooms r JOIN public.mission_templates t ON t.id=r.template_id,
    jsonb_array_elements(t.buttons) item WHERE r.id=selected_group.room_id AND item->>'id'=mission_id;
  IF approve AND mission IS NULL THEN RAISE EXCEPTION 'Mission no longer exists' USING ERRCODE='22023'; END IF;
  UPDATE public.room_groups SET pending_missions=coalesce(pending_missions,'[]'::jsonb)-mission_id,
    completed_missions=CASE WHEN approve AND NOT already_completed
      THEN coalesce(completed_missions,'[]'::jsonb)||jsonb_build_array(mission_id) ELSE completed_missions END,
    updated_at=now() WHERE id=row_id;
  IF approve AND NOT already_completed THEN PERFORM public.increment_classroom_score(row_id,(mission->>'amount')::integer); END IF;
  RETURN true;
END;
$secure$;

-- Reflections are one short answer per group and mission. They do not affect score.
CREATE OR REPLACE FUNCTION physical_internal.secure_save_guided_reflection(row_id uuid, mission_id text, choice text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $secure$
DECLARE selected_group public.room_groups%ROWTYPE;
BEGIN
  IF choice IS NULL OR choice NOT IN ('try','together','finish') OR mission_id IS NULL OR length(mission_id)>128 THEN
    RAISE EXCEPTION 'Invalid reflection' USING ERRCODE='22023';
  END IF;
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.room_groups g JOIN physical_internal.classroom_members m
      ON m.room_id=g.room_id AND m.group_id=g.id
    WHERE g.id=row_id AND m.user_id=auth.uid() AND m.expires_at>now()
  ) THEN RAISE EXCEPTION 'Classroom access denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO selected_group FROM public.room_groups WHERE id=row_id FOR UPDATE;
  IF NOT FOUND OR (NOT coalesce(selected_group.pending_missions,'[]'::jsonb) ? mission_id
    AND NOT coalesce(selected_group.completed_missions,'[]'::jsonb) ? mission_id) THEN
    RAISE EXCEPTION 'Completion required' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.game_rooms r JOIN public.mission_templates t ON t.id=r.template_id,
      jsonb_array_elements(t.buttons) mission
    WHERE r.id=selected_group.room_id AND mission->>'id'=mission_id
      AND coalesce((mission->>'requires_approval')::boolean,false)
  ) THEN RAISE EXCEPTION 'Mission not found' USING ERRCODE='22023'; END IF;
  UPDATE public.room_groups SET stats=coalesce(stats,'{}'::jsonb) || jsonb_build_object(
    'guided_reflections',coalesce(stats->'guided_reflections','{}'::jsonb) || jsonb_build_object(mission_id,choice)),
    updated_at=now() WHERE id=row_id;
  RETURN true;
END;
$secure$;

CREATE OR REPLACE FUNCTION public.save_guided_reflection(row_id uuid, mission_id text, choice text)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $wrap$
  SELECT physical_internal.secure_save_guided_reflection(row_id,mission_id,choice);
$wrap$;
REVOKE ALL ON FUNCTION physical_internal.secure_save_guided_reflection(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.secure_save_guided_reflection(uuid,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.save_guided_reflection(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_guided_reflection(uuid,text,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
