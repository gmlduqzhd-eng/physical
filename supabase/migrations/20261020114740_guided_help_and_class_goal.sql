ALTER TABLE public.room_groups ADD COLUMN IF NOT EXISTS help_requested_at timestamptz;
ALTER TABLE public.game_rooms ADD COLUMN IF NOT EXISTS setup_minutes smallint;
ALTER TABLE public.game_rooms ADD COLUMN IF NOT EXISTS goal_percent smallint NOT NULL DEFAULT 75;
ALTER TABLE public.game_rooms ADD CONSTRAINT guided_setup_minutes_range CHECK (setup_minutes IS NULL OR setup_minutes BETWEEN 5 AND 90);
ALTER TABLE public.game_rooms ADD CONSTRAINT guided_goal_percent_choices CHECK (goal_percent IN (50,75,100));

CREATE OR REPLACE FUNCTION physical_internal.secure_set_classroom_help(row_id uuid, requesting boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $secure$
DECLARE selected_group public.room_groups%ROWTYPE; teacher boolean; member boolean;
BEGIN
  IF auth.uid() IS NULL OR requesting IS NULL THEN RAISE EXCEPTION 'Classroom access denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO selected_group FROM public.room_groups WHERE id=row_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Group not found' USING ERRCODE='22023'; END IF;
  teacher := physical_internal.owns_classroom(selected_group.room_id);
  member := physical_internal.member_classroom(selected_group.room_id,row_id);
  IF (requesting AND NOT member) OR (NOT requesting AND NOT (teacher OR member)) THEN
    RAISE EXCEPTION 'Classroom access denied' USING ERRCODE='42501';
  END IF;
  IF requesting AND NOT EXISTS (SELECT 1 FROM public.game_rooms WHERE id=selected_group.room_id AND status IN ('playing','paused')) THEN
    RAISE EXCEPTION 'Classroom is not active' USING ERRCODE='22023';
  END IF;
  UPDATE public.room_groups SET help_requested_at=CASE WHEN requesting THEN coalesce(help_requested_at,now()) ELSE NULL END,
    updated_at=now() WHERE id=row_id;
  RETURN true;
END;
$secure$;

CREATE OR REPLACE FUNCTION public.set_classroom_help(row_id uuid, requesting boolean)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $wrap$
  SELECT physical_internal.secure_set_classroom_help(row_id,requesting);
$wrap$;
REVOKE ALL ON FUNCTION physical_internal.secure_set_classroom_help(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.secure_set_classroom_help(uuid,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.set_classroom_help(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_classroom_help(uuid,boolean) TO authenticated;
NOTIFY pgrst, 'reload schema';
