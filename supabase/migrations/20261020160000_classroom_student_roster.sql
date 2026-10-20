-- Attendance belongs to a room member, never to a browser tab or a public group row.
ALTER TABLE physical_internal.classroom_members
  ADD COLUMN student_number smallint,
  ADD COLUMN nickname text;
ALTER TABLE physical_internal.classroom_members
  ADD CONSTRAINT classroom_member_profile_valid CHECK (
    (student_number IS NULL AND nickname IS NULL) OR
    (student_number BETWEEN 1 AND 99 AND nickname IS NOT NULL
      AND nickname = pg_catalog.btrim(nickname)
      AND pg_catalog.char_length(nickname) BETWEEN 2 AND 12
      AND nickname !~ '[[:cntrl:]<>]')
  );
CREATE UNIQUE INDEX classroom_member_number_unique
  ON physical_internal.classroom_members(room_id,student_number)
  WHERE student_number IS NOT NULL;

-- This function is called only after a valid PIN, QR invite or an existing membership.
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
  IF NOT EXISTS (SELECT 1 FROM public.room_groups g
    JOIN public.game_rooms r ON r.id=g.room_id
    WHERE g.id=group_uuid AND g.room_id=room_uuid AND r.teacher_id IS NOT NULL AND r.status<>'finished') THEN
    RETURN pg_catalog.jsonb_build_object('error','room_closed');
  END IF;
  IF EXISTS (SELECT 1 FROM physical_internal.classroom_members m
    WHERE m.room_id=room_uuid AND m.user_id=auth.uid()
      AND m.group_id<>group_uuid AND m.expires_at>now()) THEN
    RETURN pg_catalog.jsonb_build_object('error','group_locked');
  END IF;
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

CREATE OR REPLACE FUNCTION physical_internal.join_classroom_short_pin_profile(
  entry_pin text, student_number integer, nickname text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE target record; attempts integer; result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF entry_pin !~ '^[0-9]{4}$' THEN RETURN pg_catalog.jsonb_build_object('error','invalid_pin'); END IF;
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
  result := physical_internal.save_classroom_participant(target.room_id,target.group_id,student_number,nickname);
  IF result ? 'error' THEN RETURN result; END IF;
  RETURN result || pg_catalog.jsonb_build_object('group_name',target.group_name);
END;
$body$;
CREATE OR REPLACE FUNCTION public.join_classroom_short_pin_profile(
  entry_pin text, student_number integer, nickname text
) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $body$
  SELECT physical_internal.join_classroom_short_pin_profile(entry_pin,student_number,nickname);
$body$;

CREATE OR REPLACE FUNCTION physical_internal.join_classroom_invite_profile(
  room_uuid uuid, group_name text, invite_code text, student_number integer, nickname text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE target uuid; attempts integer; result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
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
  result := physical_internal.save_classroom_participant(room_uuid,target,student_number,nickname);
  IF result ? 'error' THEN RETURN result; END IF;
  RETURN result || pg_catalog.jsonb_build_object('group_name',group_name);
END;
$body$;
CREATE OR REPLACE FUNCTION public.join_classroom_invite_profile(
  room_uuid uuid, group_name text, invite_code text, student_number integer, nickname text
) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $body$
  SELECT physical_internal.join_classroom_invite_profile(room_uuid,group_name,invite_code,student_number,nickname);
$body$;

-- Existing members can fill in missing information without consuming another PIN attempt.
CREATE OR REPLACE FUNCTION physical_internal.complete_classroom_profile(
  room_uuid uuid, group_uuid uuid, student_number integer, nickname text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM physical_internal.classroom_members m
    WHERE m.room_id=room_uuid AND m.group_id=group_uuid AND m.user_id=auth.uid() AND m.expires_at>now()
  ) THEN RAISE EXCEPTION 'Classroom membership required' USING ERRCODE='42501'; END IF;
  RETURN physical_internal.save_classroom_participant(room_uuid,group_uuid,student_number,nickname);
END;
$body$;
CREATE OR REPLACE FUNCTION public.complete_classroom_profile(
  room_uuid uuid, group_uuid uuid, student_number integer, nickname text
) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $body$
  SELECT physical_internal.complete_classroom_profile(room_uuid,group_uuid,student_number,nickname);
$body$;

CREATE OR REPLACE FUNCTION physical_internal.get_my_classroom_profile(room_uuid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $body$
DECLARE member record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT m.group_id,m.student_number,m.nickname INTO member
    FROM physical_internal.classroom_members m JOIN public.game_rooms r ON r.id=m.room_id
    WHERE m.room_id=room_uuid AND m.user_id=auth.uid() AND m.expires_at>now() AND r.status<>'finished';
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN pg_catalog.jsonb_build_object('group_id',member.group_id,'student_number',member.student_number,'nickname',member.nickname);
END;
$body$;
CREATE OR REPLACE FUNCTION public.get_my_classroom_profile(room_uuid uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $body$
  SELECT physical_internal.get_my_classroom_profile(room_uuid);
$body$;

CREATE OR REPLACE FUNCTION physical_internal.get_classroom_roster(room_uuid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $body$
BEGIN
  IF NOT physical_internal.owns_classroom(room_uuid) THEN RAISE EXCEPTION 'Room owner required' USING ERRCODE='42501'; END IF;
  RETURN (SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'group_id',m.group_id,'student_number',m.student_number,'nickname',m.nickname)
      ORDER BY g.group_name,m.student_number NULLS LAST,m.user_id),'[]'::jsonb)
    FROM physical_internal.classroom_members m
    JOIN public.room_groups g ON g.id=m.group_id
    WHERE m.room_id=room_uuid);
END;
$body$;
CREATE OR REPLACE FUNCTION public.get_classroom_roster(room_uuid uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $body$
  SELECT physical_internal.get_classroom_roster(room_uuid);
$body$;

-- Teacher can release a number when a child lost the original anonymous session.
CREATE OR REPLACE FUNCTION physical_internal.release_classroom_number(room_uuid uuid,number_value integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
BEGIN
  IF NOT physical_internal.owns_classroom(room_uuid) THEN RAISE EXCEPTION 'Room owner required' USING ERRCODE='42501'; END IF;
  IF number_value IS NULL OR number_value NOT BETWEEN 1 AND 99 THEN RETURN false; END IF;
  UPDATE physical_internal.classroom_members
    SET student_number=NULL,nickname=NULL
    WHERE room_id=room_uuid AND student_number=number_value;
  RETURN FOUND;
END;
$body$;
CREATE OR REPLACE FUNCTION public.release_classroom_number(room_uuid uuid,number_value integer)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $body$
  SELECT physical_internal.release_classroom_number(room_uuid,number_value);
$body$;

-- Keep member result access briefly after class end, but erase identifying fields.
CREATE OR REPLACE FUNCTION physical_internal.clear_finished_classroom_roster()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
BEGIN
  IF NEW.status='finished' AND OLD.status IS DISTINCT FROM 'finished' THEN
    UPDATE physical_internal.classroom_members
      SET student_number=NULL,nickname=NULL WHERE room_id=NEW.id;
  END IF;
  RETURN NEW;
END;
$body$;
CREATE TRIGGER classroom_roster_clear_on_finish AFTER UPDATE OF status ON public.game_rooms
FOR EACH ROW EXECUTE FUNCTION physical_internal.clear_finished_classroom_roster();

REVOKE ALL ON FUNCTION
  physical_internal.save_classroom_participant(uuid,uuid,integer,text),
  physical_internal.join_classroom_short_pin_profile(text,integer,text),
  physical_internal.join_classroom_invite_profile(uuid,text,text,integer,text),
  physical_internal.complete_classroom_profile(uuid,uuid,integer,text),
  physical_internal.get_my_classroom_profile(uuid),
  physical_internal.get_classroom_roster(uuid),
  physical_internal.release_classroom_number(uuid,integer),
  physical_internal.clear_finished_classroom_roster(),
  public.join_classroom_short_pin_profile(text,integer,text),
  public.join_classroom_invite_profile(uuid,text,text,integer,text),
  public.complete_classroom_profile(uuid,uuid,integer,text),
  public.get_my_classroom_profile(uuid),
  public.get_classroom_roster(uuid),
  public.release_classroom_number(uuid,integer)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
  physical_internal.join_classroom_short_pin_profile(text,integer,text),
  physical_internal.join_classroom_invite_profile(uuid,text,text,integer,text),
  physical_internal.complete_classroom_profile(uuid,uuid,integer,text),
  physical_internal.get_my_classroom_profile(uuid),
  physical_internal.get_classroom_roster(uuid),
  physical_internal.release_classroom_number(uuid,integer),
  public.join_classroom_short_pin_profile(text,integer,text),
  public.join_classroom_invite_profile(uuid,text,text,integer,text),
  public.complete_classroom_profile(uuid,uuid,integer,text),
  public.get_my_classroom_profile(uuid),
  public.get_classroom_roster(uuid),
  public.release_classroom_number(uuid,integer)
TO authenticated;
NOTIFY pgrst,'reload schema';
