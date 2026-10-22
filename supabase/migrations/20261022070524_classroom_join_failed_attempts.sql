-- Count invalid invite guesses, not successful joins or profile corrections.
-- The per-user attempt row serializes concurrent guesses. Existing members can
-- re-enter only their own group with its current valid PIN/QR even when locked.
CREATE OR REPLACE FUNCTION physical_internal.join_classroom_short_pin_profile(
  entry_pin text, student_number integer, nickname text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE target record; attempts integer; result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT r.id AS room_id,g.id AS group_id,g.group_name INTO target
    FROM physical_internal.classroom_members m
    JOIN public.room_groups g ON g.id=m.group_id AND g.room_id=m.room_id
    JOIN public.game_rooms r ON r.id=m.room_id
    JOIN physical_internal.classroom_short_pins p ON p.group_id=g.id
    WHERE m.user_id=auth.uid() AND m.expires_at>now() AND p.pin=entry_pin
      AND r.teacher_id IS NOT NULL AND r.status<>'finished';
  IF FOUND THEN
    result := physical_internal.save_classroom_participant(target.room_id,target.group_id,student_number,nickname);
    RETURN result || CASE WHEN result ? 'error' THEN '{}'::jsonb
      ELSE pg_catalog.jsonb_build_object('group_name',target.group_name) END;
  END IF;
  INSERT INTO physical_internal.classroom_join_attempts(user_id,attempts,until_at)
    VALUES(auth.uid(),1,now()+interval '15 minutes')
    ON CONFLICT(user_id) DO UPDATE SET
      attempts=CASE WHEN classroom_join_attempts.until_at<now() THEN 1 ELSE classroom_join_attempts.attempts+1 END,
      until_at=CASE WHEN classroom_join_attempts.until_at<now() THEN now()+interval '15 minutes' ELSE classroom_join_attempts.until_at END
    RETURNING classroom_join_attempts.attempts INTO attempts;
  IF attempts>12 THEN RETURN pg_catalog.jsonb_build_object('error','rate_limited'); END IF;
  SELECT r.id AS room_id,g.id AS group_id,g.group_name INTO target
    FROM physical_internal.classroom_short_pins p
    JOIN public.room_groups g ON g.id=p.group_id
    JOIN public.game_rooms r ON r.id=g.room_id
    WHERE p.pin=entry_pin AND r.teacher_id IS NOT NULL AND r.status<>'finished';
  IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('error','invalid_pin'); END IF;
  UPDATE physical_internal.classroom_join_attempts a SET attempts=a.attempts-1 WHERE a.user_id=auth.uid();
  result := physical_internal.save_classroom_participant(target.room_id,target.group_id,student_number,nickname);
  RETURN result || CASE WHEN result ? 'error' THEN '{}'::jsonb
    ELSE pg_catalog.jsonb_build_object('group_name',target.group_name) END;
END;
$body$;

CREATE OR REPLACE FUNCTION physical_internal.join_classroom_invite_profile(
  room_uuid uuid, group_name text, invite_code text, student_number integer, nickname text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE target uuid; attempts integer; result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT g.id INTO target FROM physical_internal.classroom_members m
    JOIN public.room_groups g ON g.id=m.group_id AND g.room_id=m.room_id
    JOIN public.game_rooms r ON r.id=m.room_id
    JOIN physical_internal.classroom_invites i ON i.group_id=g.id
    WHERE m.user_id=auth.uid() AND m.expires_at>now() AND g.room_id=room_uuid
      AND g.group_name=join_classroom_invite_profile.group_name
      AND r.teacher_id IS NOT NULL AND r.status<>'finished' AND i.code=pg_catalog.lower(invite_code);
  IF target IS NOT NULL THEN
    result := physical_internal.save_classroom_participant(room_uuid,target,student_number,nickname);
    RETURN result || CASE WHEN result ? 'error' THEN '{}'::jsonb
      ELSE pg_catalog.jsonb_build_object('group_name',group_name) END;
  END IF;
  INSERT INTO physical_internal.classroom_join_attempts(user_id,attempts,until_at)
    VALUES(auth.uid(),1,now()+interval '15 minutes')
    ON CONFLICT(user_id) DO UPDATE SET
      attempts=CASE WHEN classroom_join_attempts.until_at<now() THEN 1 ELSE classroom_join_attempts.attempts+1 END,
      until_at=CASE WHEN classroom_join_attempts.until_at<now() THEN now()+interval '15 minutes' ELSE classroom_join_attempts.until_at END
    RETURNING classroom_join_attempts.attempts INTO attempts;
  IF attempts>12 THEN RETURN pg_catalog.jsonb_build_object('error','rate_limited'); END IF;
  SELECT g.id INTO target FROM public.room_groups g
    JOIN public.game_rooms r ON r.id=g.room_id
    JOIN physical_internal.classroom_invites i ON i.group_id=g.id
    WHERE g.room_id=room_uuid AND g.group_name=join_classroom_invite_profile.group_name
      AND r.teacher_id IS NOT NULL AND r.status<>'finished' AND i.code=pg_catalog.lower(invite_code);
  IF target IS NULL THEN RETURN pg_catalog.jsonb_build_object('error','invalid_invite'); END IF;
  UPDATE physical_internal.classroom_join_attempts a SET attempts=a.attempts-1 WHERE a.user_id=auth.uid();
  result := physical_internal.save_classroom_participant(room_uuid,target,student_number,nickname);
  RETURN result || CASE WHEN result ? 'error' THEN '{}'::jsonb
    ELSE pg_catalog.jsonb_build_object('group_name',group_name) END;
END;
$body$;

-- CREATE OR REPLACE preserves existing restricted execute grants and wrappers.
NOTIFY pgrst,'reload schema';
