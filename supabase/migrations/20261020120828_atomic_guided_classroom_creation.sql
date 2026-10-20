-- Keep the guided template, room, groups and lesson settings in one transaction.
CREATE OR REPLACE FUNCTION physical_internal.secure_create_guided_classroom(
  room_name text, game_type text, group_count integer, lesson_minutes integer, target_percent integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $body$
DECLARE
  template_uuid uuid;
  created jsonb;
  updated public.game_rooms%ROWTYPE;
BEGIN
  IF NOT physical_internal.is_classroom_teacher() THEN
    RAISE EXCEPTION 'Teacher authorization required' USING ERRCODE = '42501';
  END IF;
  IF room_name IS NULL OR pg_catalog.char_length(pg_catalog.btrim(room_name)) NOT BETWEEN 1 AND 80
     OR game_type IS NULL OR game_type !~ '^[a-z0-9_-]{1,80}$'
     OR group_count IS NULL OR group_count NOT BETWEEN 1 AND 8
     OR lesson_minutes IS NULL OR lesson_minutes NOT BETWEEN 5 AND 90
     OR target_percent IS NULL OR target_percent NOT IN (50,75,100) THEN
    RAISE EXCEPTION 'Invalid guided classroom settings' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.mission_templates (name, teacher_id, buttons)
  VALUES (
    pg_catalog.btrim(room_name), auth.uid(),
    pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'id', pg_catalog.gen_random_uuid()::text,
      'title', pg_catalog.btrim(room_name) || ' 활동 완료',
      'desc', '게임을 끝내면 선생님에게 확인 요청이 자동으로 전달돼요.',
      'amount', 10, 'cooldown', 0, 'iconName', 'Flag',
      'color', 'text-cyan-600', 'bg', 'bg-cyan-50',
      'requires_approval', true, 'gameType', game_type
    ))
  ) RETURNING id INTO template_uuid;

  created := physical_internal.create_secure_classroom(
    room_name, template_uuid,
    ARRAY(SELECT n::text || '모둠' FROM pg_catalog.generate_series(1, group_count) AS n)
  );
  UPDATE public.game_rooms
     SET global_time_modifier = lesson_minutes * 60 - 300,
         setup_minutes = lesson_minutes,
         goal_percent = target_percent
   WHERE id = (created ->> 'id')::uuid
   RETURNING * INTO updated;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guided classroom setup was not saved';
  END IF;
  RETURN pg_catalog.to_jsonb(updated);
END;
$body$;

CREATE OR REPLACE FUNCTION public.create_guided_classroom(
  room_name text, game_type text, group_count integer, lesson_minutes integer, target_percent integer
) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $body$
  SELECT physical_internal.secure_create_guided_classroom(room_name, game_type, group_count, lesson_minutes, target_percent);
$body$;

REVOKE ALL ON FUNCTION physical_internal.secure_create_guided_classroom(text,text,integer,integer,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_guided_classroom(text,text,integer,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.secure_create_guided_classroom(text,text,integer,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_guided_classroom(text,text,integer,integer,integer) TO authenticated;
NOTIFY pgrst, 'reload schema';
