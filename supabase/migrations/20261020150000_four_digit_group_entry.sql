-- A short, group-specific PIN is the only manual student credential.
-- Existing room PINs remain for teacher recovery; QR invites remain valid.
CREATE TABLE physical_internal.classroom_short_pins (
  group_id uuid PRIMARY KEY REFERENCES public.room_groups(id) ON DELETE CASCADE,
  pin text NOT NULL UNIQUE CHECK (pin ~ '^[0-9]{4}$')
);
ALTER TABLE physical_internal.classroom_short_pins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON physical_internal.classroom_short_pins FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION physical_internal.assign_classroom_short_pin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $body$
DECLARE candidate text; i integer;
BEGIN
  -- Retire codes from finished rooms, then serialize allocation across classrooms.
  PERFORM pg_catalog.pg_advisory_xact_lock(82171021);
  DELETE FROM physical_internal.classroom_short_pins p
  USING public.room_groups g, public.game_rooms r
  WHERE p.group_id = g.id AND g.room_id = r.id AND r.status = 'finished';
  FOR i IN 1..100 LOOP
    candidate := pg_catalog.lpad((pg_catalog.floor(pg_catalog.random() * 10000))::integer::text, 4, '0');
    IF NOT EXISTS (SELECT 1 FROM physical_internal.classroom_short_pins WHERE pin = candidate) THEN
      INSERT INTO physical_internal.classroom_short_pins(group_id,pin) VALUES (NEW.id,candidate);
      RETURN NEW;
    END IF;
  END LOOP;
  RAISE EXCEPTION 'No four-digit classroom PIN available' USING ERRCODE = '54000';
END;
$body$;
CREATE TRIGGER classroom_short_pin_on_group_insert AFTER INSERT ON public.room_groups
FOR EACH ROW EXECUTE FUNCTION physical_internal.assign_classroom_short_pin();

-- Supply codes to rooms already running when this migration is applied.
DO $body$ DECLARE g record; BEGIN
  FOR g IN SELECT groups.id FROM public.room_groups groups
    JOIN public.game_rooms rooms ON rooms.id=groups.room_id
    WHERE rooms.teacher_id IS NOT NULL AND rooms.status <> 'finished'
      AND NOT EXISTS (SELECT 1 FROM physical_internal.classroom_short_pins p WHERE p.group_id=groups.id)
    ORDER BY groups.id LOOP
    INSERT INTO physical_internal.classroom_short_pins(group_id,pin)
    SELECT g.id, pg_catalog.lpad(n::text,4,'0')
    FROM pg_catalog.generate_series(0,9999) n
    WHERE NOT EXISTS (SELECT 1 FROM physical_internal.classroom_short_pins p WHERE p.pin=pg_catalog.lpad(n::text,4,'0'))
    ORDER BY pg_catalog.random() LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'No four-digit classroom PIN available' USING ERRCODE='54000'; END IF;
  END LOOP;
END $body$;

CREATE OR REPLACE FUNCTION physical_internal.join_classroom_with_short_pin(entry_pin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $body$
DECLARE target record; attempts integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF entry_pin !~ '^[0-9]{4}$' THEN RETURN NULL; END IF;
  INSERT INTO physical_internal.classroom_join_attempts(user_id,attempts,until_at)
  VALUES(auth.uid(),1,now()+interval '15 minutes')
  ON CONFLICT(user_id) DO UPDATE SET
    attempts=CASE WHEN classroom_join_attempts.until_at<now() THEN 1 ELSE classroom_join_attempts.attempts+1 END,
    until_at=CASE WHEN classroom_join_attempts.until_at<now() THEN now()+interval '15 minutes' ELSE classroom_join_attempts.until_at END
  RETURNING classroom_join_attempts.attempts INTO attempts;
  IF attempts > 12 THEN RETURN pg_catalog.jsonb_build_object('error','요청이 많습니다. 15분 후 다시 시도하세요.'); END IF;
  SELECT r.id AS room_id, r.name AS room_name, g.id AS group_id, g.group_name
    INTO target
    FROM physical_internal.classroom_short_pins p
    JOIN public.room_groups g ON g.id=p.group_id
    JOIN public.game_rooms r ON r.id=g.room_id
    WHERE p.pin=entry_pin AND r.teacher_id IS NOT NULL AND r.status<>'finished';
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM physical_internal.classroom_members m
    WHERE m.room_id=target.room_id AND m.user_id=auth.uid()
      AND m.group_id<>target.group_id AND m.expires_at>now()) THEN
    RETURN pg_catalog.jsonb_build_object('error','이미 다른 모둠에 참여 중입니다. 선생님에게 문의하세요.');
  END IF;
  INSERT INTO physical_internal.classroom_members(room_id,user_id,group_id,expires_at)
  VALUES(target.room_id,auth.uid(),target.group_id,now()+interval '4 hours')
  ON CONFLICT(room_id,user_id) DO UPDATE SET group_id=EXCLUDED.group_id,expires_at=EXCLUDED.expires_at;
  RETURN pg_catalog.jsonb_build_object('room_id',target.room_id,'room_name',target.room_name,'group_id',target.group_id,'group_name',target.group_name);
END;
$body$;
CREATE OR REPLACE FUNCTION public.join_classroom_with_short_pin(entry_pin text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $body$
  SELECT physical_internal.join_classroom_with_short_pin(entry_pin);
$body$;

CREATE OR REPLACE FUNCTION physical_internal.get_classroom_invites(room_uuid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
BEGIN
  IF NOT physical_internal.owns_classroom(room_uuid) THEN RAISE EXCEPTION 'Room owner required' USING ERRCODE='42501'; END IF;
  RETURN (SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'group_name',g.group_name,'code',i.code,'short_pin',p.pin) ORDER BY g.group_name),'[]'::jsonb)
    FROM public.room_groups g
    JOIN physical_internal.classroom_invites i ON i.group_id=g.id
    LEFT JOIN physical_internal.classroom_short_pins p ON p.group_id=g.id
    WHERE g.room_id=room_uuid);
END;
$body$;

REVOKE ALL ON FUNCTION physical_internal.assign_classroom_short_pin(),
  physical_internal.join_classroom_with_short_pin(text),public.join_classroom_with_short_pin(text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.join_classroom_with_short_pin(text),
  public.join_classroom_with_short_pin(text) TO authenticated;
NOTIFY pgrst,'reload schema';
