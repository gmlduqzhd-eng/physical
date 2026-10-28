-- A replaced device must lose its room membership, not just its display name.
-- Replace only functions; do not bulk delete existing classroom data.
CREATE OR REPLACE FUNCTION physical_internal.release_classroom_number(room_uuid uuid,number_value integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
BEGIN
  IF NOT physical_internal.owns_classroom(room_uuid) THEN RAISE EXCEPTION 'Room owner required' USING ERRCODE='42501'; END IF;
  IF number_value IS NULL OR number_value NOT BETWEEN 1 AND 99 THEN RETURN false; END IF;
  PERFORM 1 FROM public.game_rooms WHERE id=room_uuid FOR UPDATE;
  DELETE FROM physical_internal.classroom_members
    WHERE room_id=room_uuid AND student_number=number_value;
  RETURN FOUND;
END;
$body$;

-- Attendance counts current completed registrations, not anonymous auth rows.
-- Historical blank or expired rows are ignored without deleting unrelated data.
CREATE OR REPLACE FUNCTION physical_internal.get_classroom_roster(room_uuid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $body$
BEGIN
  IF NOT physical_internal.owns_classroom(room_uuid) THEN RAISE EXCEPTION 'Room owner required' USING ERRCODE='42501'; END IF;
  RETURN (SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'group_id',m.group_id,'student_number',m.student_number,'nickname',m.nickname)
      ORDER BY g.group_name,m.student_number,m.user_id),'[]'::jsonb)
    FROM physical_internal.classroom_members m
    JOIN public.room_groups g ON g.id=m.group_id AND g.room_id=m.room_id
    WHERE m.room_id=room_uuid AND m.expires_at>now()
      AND m.student_number IS NOT NULL AND m.nickname IS NOT NULL);
END;
$body$;

CREATE OR REPLACE FUNCTION physical_internal.save_classroom_participant(
  room_uuid uuid, group_uuid uuid, number_value integer, nickname_value text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE cleaned text;
BEGIN
  cleaned := pg_catalog.btrim(nickname_value);
  IF auth.uid() IS NULL OR number_value IS NULL OR number_value NOT BETWEEN 1 AND 99
    OR cleaned IS NULL OR pg_catalog.char_length(cleaned) NOT BETWEEN 2 AND 12
    OR cleaned ~ '[[:cntrl:]<>]' THEN
    RETURN pg_catalog.jsonb_build_object('error','invalid_profile');
  END IF;
  -- Serialize profile writes with teacher release and class finish. The finish
  -- trigger then cannot miss a concurrent registration containing a nickname.
  PERFORM 1 FROM public.room_groups g JOIN public.game_rooms r ON r.id=g.room_id
    WHERE g.id=group_uuid AND g.room_id=room_uuid AND r.teacher_id IS NOT NULL AND r.status<>'finished'
    FOR UPDATE OF r;
  IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('error','room_closed'); END IF;
  IF EXISTS (SELECT 1 FROM physical_internal.classroom_members m
    WHERE m.room_id=room_uuid AND m.user_id=auth.uid()
      AND m.group_id<>group_uuid AND m.expires_at>now()) THEN
    RETURN pg_catalog.jsonb_build_object('error','group_locked');
  END IF;
  -- An expired registration no longer reserves a number forever. This runs
  -- only after a valid entry code or verified current membership authorized it.
  DELETE FROM physical_internal.classroom_members
    WHERE room_id=room_uuid AND student_number=number_value AND expires_at<=now();
  BEGIN
    INSERT INTO physical_internal.classroom_members
      (room_id,user_id,group_id,expires_at,student_number,nickname)
    VALUES(room_uuid,auth.uid(),group_uuid,now()+interval '4 hours',number_value,cleaned)
    ON CONFLICT(room_id,user_id) DO UPDATE SET
      group_id=EXCLUDED.group_id,expires_at=EXCLUDED.expires_at,
      student_number=EXCLUDED.student_number,nickname=EXCLUDED.nickname;
  EXCEPTION WHEN unique_violation THEN
    RETURN pg_catalog.jsonb_build_object('error','number_taken');
  END;
  RETURN pg_catalog.jsonb_build_object('room_id',room_uuid,'group_id',group_uuid,'student_number',number_value,'nickname',cleaned);
END;
$body$;

CREATE OR REPLACE FUNCTION physical_internal.complete_classroom_profile(
  room_uuid uuid, group_uuid uuid, student_number integer, nickname text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
BEGIN
  -- Check membership after taking the same lock as release; an already-open
  -- profile form cannot recreate a membership deleted while it was waiting.
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM physical_internal.classroom_members m
    WHERE m.room_id=room_uuid AND m.group_id=group_uuid AND m.user_id=auth.uid() AND m.expires_at>now()
  ) THEN RAISE EXCEPTION 'Classroom membership required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.game_rooms WHERE id=room_uuid FOR UPDATE;
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM physical_internal.classroom_members m
    WHERE m.room_id=room_uuid AND m.group_id=group_uuid AND m.user_id=auth.uid() AND m.expires_at>now()
  ) THEN RAISE EXCEPTION 'Classroom membership required' USING ERRCODE='42501'; END IF;
  RETURN physical_internal.save_classroom_participant(room_uuid,group_uuid,student_number,nickname);
END;
$body$;

-- CREATE OR REPLACE retains the existing restricted execute grants.
NOTIFY pgrst,'reload schema';
