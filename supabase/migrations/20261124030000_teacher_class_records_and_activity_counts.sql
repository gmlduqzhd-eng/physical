-- 1) 선생님 계정에 반 기록 보관: 반 이름과 반별 활동 반응·원정 지도 도장(학생 정보 없음)을 계정마다 한 벌 둔다.
--    앱이 만든 보관 파일(kind='physical-class-backup')을 그대로 올리고 내려받는다. 본인 것만 읽고 쓸 수 있다.
CREATE TABLE physical_internal.teacher_class_records (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object' AND pg_column_size(payload)<=1048576),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE physical_internal.teacher_class_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON physical_internal.teacher_class_records FROM PUBLIC,anon,authenticated;

CREATE FUNCTION physical_internal.teacher_class_records(next_payload jsonb DEFAULT NULL, remove boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 -- 사용 가능한(enabled) 교사 계정만. 학생의 익명 세션은 쓸 수 없다.
 IF auth.uid() IS NULL OR NOT EXISTS(
  SELECT 1 FROM physical_internal.teacher_accounts a JOIN auth.users u ON u.id=a.user_id
  WHERE a.user_id=auth.uid() AND a.enabled AND u.is_anonymous IS NOT DISTINCT FROM false
 ) THEN RAISE EXCEPTION 'Teacher account required' USING ERRCODE='42501'; END IF;
 IF remove THEN
  DELETE FROM physical_internal.teacher_class_records WHERE user_id=auth.uid();
 ELSIF next_payload IS NOT NULL THEN
  IF jsonb_typeof(next_payload)<>'object' OR next_payload->>'kind' IS DISTINCT FROM 'physical-class-backup' OR pg_column_size(next_payload)>1048576
  THEN RAISE EXCEPTION 'Invalid class records' USING ERRCODE='22023'; END IF;
  INSERT INTO physical_internal.teacher_class_records(user_id,payload) VALUES(auth.uid(),next_payload)
  ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,updated_at=now();
 END IF;
 RETURN coalesce(
  (SELECT jsonb_build_object('payload',r.payload,'updatedAt',r.updated_at) FROM physical_internal.teacher_class_records r WHERE r.user_id=auth.uid()),
  jsonb_build_object('payload',NULL,'updatedAt',NULL));
END; $$;
CREATE FUNCTION public.teacher_class_records(next_payload jsonb DEFAULT NULL, remove boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.teacher_class_records(next_payload,remove); $$;
REVOKE ALL ON FUNCTION physical_internal.teacher_class_records(jsonb,boolean),public.teacher_class_records(jsonb,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.teacher_class_records(jsonb,boolean),public.teacher_class_records(jsonb,boolean) TO authenticated;

-- 2) 익명 활동 실행 횟수: 날짜·활동 번호·횟수만 센다. 누가 했는지, 어느 기기·학교인지는 저장하지 않는다.
CREATE TABLE physical_internal.activity_play_counts (
 day date NOT NULL,
 activity_id text NOT NULL CHECK(activity_id ~ '^[a-zA-Z0-9_-]{1,80}$'),
 plays integer NOT NULL DEFAULT 0 CHECK(plays>=0),
 PRIMARY KEY(day,activity_id)
);
ALTER TABLE physical_internal.activity_play_counts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON physical_internal.activity_play_counts FROM PUBLIC,anon,authenticated;

CREATE FUNCTION physical_internal.count_activity_play(activity text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
BEGIN
 -- 잘못된 번호는 조용히 버린다(오류로 앱을 멈추지 않는다).
 IF activity IS NULL OR activity !~ '^[a-zA-Z0-9_-]{1,80}$' THEN RETURN; END IF;
 -- 하루에 셀 수 있는 활동 가짓수를 막아 둔다(엉뚱한 번호로 표를 채우지 못하게).
 IF NOT EXISTS(SELECT 1 FROM physical_internal.activity_play_counts c WHERE c.day=today AND c.activity_id=activity)
  AND (SELECT count(*) FROM physical_internal.activity_play_counts c WHERE c.day=today)>=500 THEN RETURN; END IF;
 INSERT INTO physical_internal.activity_play_counts(day,activity_id,plays) VALUES(today,activity,1)
 ON CONFLICT(day,activity_id) DO UPDATE SET plays=LEAST(physical_internal.activity_play_counts.plays+1,100000000);
END; $$;
CREATE FUNCTION public.count_activity_play(activity text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.count_activity_play(activity); $$;
REVOKE ALL ON FUNCTION physical_internal.count_activity_play(text),public.count_activity_play(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.count_activity_play(text),public.count_activity_play(text) TO anon,authenticated;

-- 관리자만 합계를 본다(최근 N일, 활동별).
CREATE FUNCTION physical_internal.activity_play_summary(days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT physical_internal.is_teacher_admin() THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
 RETURN coalesce((
  SELECT jsonb_agg(jsonb_build_object('activityId',t.activity_id,'plays',t.plays) ORDER BY t.plays DESC,t.activity_id)
  FROM (SELECT c.activity_id,sum(c.plays)::bigint AS plays FROM physical_internal.activity_play_counts c
        WHERE c.day>(now() AT TIME ZONE 'Asia/Seoul')::date-LEAST(GREATEST(coalesce(days,30),1),366) GROUP BY c.activity_id) t),'[]'::jsonb);
END; $$;
CREATE FUNCTION public.activity_play_summary(days integer DEFAULT 30)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.activity_play_summary(days); $$;
REVOKE ALL ON FUNCTION physical_internal.activity_play_summary(integer),public.activity_play_summary(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.activity_play_summary(integer),public.activity_play_summary(integer) TO authenticated;
