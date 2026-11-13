-- Exact pre-repair shared endpoint definitions, with synthetic rows only.
-- Loaded solely by the isolated advisor regression runner inside ROLLBACK.
-- One guarded statement also prevents accidental standalone installation.
DO $fixture_install$
BEGIN
 IF current_setting('physical.test_database',true) IS DISTINCT FROM 'on'
   OR NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='physical_api_test_environment'
     AND obj_description(oid,'pg_namespace')='physical-hardening-native-20261113') THEN
   RAISE EXCEPTION 'Dedicated isolated test database required';
 END IF;
 EXECUTE $synthetic$
CREATE TABLE public.translation_lesson_cases (
 id uuid PRIMARY KEY, author_passcode_hash text, status text NOT NULL DEFAULT 'pending', is_sample boolean NOT NULL DEFAULT false,
 title text, used_date date, school_grade text, subject text, target_language text, file_format text,
 lesson_goal text, tool_usage_process text, teacher_review_notes text, observed_results_limits text,
 aggregate_metrics text, improvement_suggestions text, author_display_name text, rejection_reason text,
 updated_at timestamptz, created_at timestamptz DEFAULT now(), reviewed_at timestamptz
);
ALTER TABLE public.translation_lesson_cases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.translation_lesson_cases FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.resubmit_translation_case(p_case_id uuid, p_author_passcode text, p_title text, p_used_date date, p_school_grade text, p_subject text, p_target_language text, p_file_format text, p_lesson_goal text, p_tool_usage_process text, p_teacher_review_notes text, p_observed_results_limits text, p_aggregate_metrics text, p_improvement_suggestions text, p_author_display_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_row public.translation_lesson_cases%rowtype;
begin
  select * into v_row from public.translation_lesson_cases where id = p_case_id and status <> 'removed';
  if not found then
    raise exception '해당 사례 게시글을 찾을 수 없습니다.';
  end if;

  if v_row.author_passcode_hash <> extensions.crypt(trim(coalesce(p_author_passcode, '')), v_row.author_passcode_hash) then
    raise exception '작성자 확인 비밀번호가 일치하지 않습니다.';
  end if;

  update public.translation_lesson_cases
  set
    title = trim(p_title),
    used_date = p_used_date,
    school_grade = trim(p_school_grade),
    subject = trim(p_subject),
    target_language = trim(p_target_language),
    file_format = p_file_format,
    lesson_goal = trim(p_lesson_goal),
    tool_usage_process = trim(p_tool_usage_process),
    teacher_review_notes = trim(p_teacher_review_notes),
    observed_results_limits = trim(p_observed_results_limits),
    aggregate_metrics = trim(coalesce(p_aggregate_metrics, '')),
    improvement_suggestions = trim(coalesce(p_improvement_suggestions, '')),
    author_display_name = coalesce(nullif(trim(p_author_display_name), ''), '익명 교사'),
    status = 'pending',
    rejection_reason = '',
    updated_at = now()
  where id = p_case_id;

  return jsonb_build_object(
    'id', p_case_id,
    'status', 'pending',
    'status_label', '관리자 승인중'
  );
end;
$function$;


CREATE OR REPLACE FUNCTION public.remove_my_translation_case(p_case_id uuid, p_author_passcode text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_row public.translation_lesson_cases%rowtype;
begin
  select * into v_row from public.translation_lesson_cases where id = p_case_id and status <> 'removed';
  if not found then
    raise exception '해당 사례 게시글을 찾을 수 없습니다.';
  end if;

  if v_row.author_passcode_hash <> extensions.crypt(trim(coalesce(p_author_passcode, '')), v_row.author_passcode_hash) then
    raise exception '작성자 확인 비밀번호가 일치하지 않습니다.';
  end if;

  update public.translation_lesson_cases
  set status = 'removed',
      updated_at = now()
  where id = p_case_id;
  return true;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.remove_my_translation_case(uuid,text),public.resubmit_translation_case(uuid,text,text,date,text,text,text,text,text,text,text,text,text,text,text) TO PUBLIC,anon,authenticated,service_role;
INSERT INTO public.translation_lesson_cases(id,title,author_passcode_hash) VALUES
 ('00000000-0000-4000-8000-000000000081','null author A',NULL),
 ('00000000-0000-4000-8000-000000000082','null author B',NULL),
 ('00000000-0000-4000-8000-000000000083','valid author',extensions.crypt('fixture-only-author',extensions.gen_salt('bf')));
CREATE FUNCTION pg_temp.resubmit_case(case_uuid uuid,passcode text,new_title text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER AS $$
 SELECT public.resubmit_translation_case(case_uuid,passcode,new_title,DATE '2026-11-13','3~4학년군','체육','한국어','text','goal','process','notes','limits','','','검증');
$$;
GRANT EXECUTE ON FUNCTION pg_temp.resubmit_case(uuid,text,text) TO anon,authenticated,service_role;
$synthetic$;
END;
$fixture_install$;
