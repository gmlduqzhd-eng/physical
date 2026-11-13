-- Isolated synthetic shared translation feature; never production data.
DO $install_fixture$ BEGIN
 IF current_setting('physical.test_database',true) IS DISTINCT FROM 'on' OR NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='physical_api_test_environment' AND obj_description(oid,'pg_namespace')='physical-hardening-native-20261113') THEN RAISE EXCEPTION 'Dedicated isolated test database required'; END IF;
 EXECUTE $fixture$
CREATE TABLE public.translation_admin_config("id" integer NOT NULL DEFAULT 1,
"password_hash" text NOT NULL,
"updated_at" timestamp with time zone NOT NULL DEFAULT now(),
CHECK ((id = 1)),
PRIMARY KEY (id));
ALTER TABLE public.translation_admin_config ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.translation_admin_config TO anon,authenticated,service_role;
CREATE TABLE public.translation_lesson_cases("id" uuid NOT NULL DEFAULT gen_random_uuid(),
"title" text NOT NULL,
"used_date" date NOT NULL,
"school_grade" text NOT NULL,
"subject" text NOT NULL,
"target_language" text NOT NULL,
"file_format" text NOT NULL,
"lesson_goal" text NOT NULL,
"tool_usage_process" text NOT NULL,
"teacher_review_notes" text NOT NULL,
"observed_results_limits" text NOT NULL,
"aggregate_metrics" text NOT NULL DEFAULT ''::text,
"improvement_suggestions" text NOT NULL DEFAULT ''::text,
"author_display_name" text NOT NULL DEFAULT '익명 교사'::text,
"confirmed_factual" boolean NOT NULL DEFAULT false,
"confirmed_no_pii" boolean NOT NULL DEFAULT false,
"confirmed_public_rights" boolean NOT NULL DEFAULT false,
"status" text NOT NULL DEFAULT 'pending'::text,
"rejection_reason" text NOT NULL DEFAULT ''::text,
"is_sample" boolean NOT NULL DEFAULT false,
"author_passcode_hash" text NOT NULL,
"created_at" timestamp with time zone NOT NULL DEFAULT now(),
"updated_at" timestamp with time zone NOT NULL DEFAULT now(),
"reviewed_at" timestamp with time zone,
CHECK ((file_format = ANY (ARRAY['pptx'::text, 'hwpx'::text, 'both'::text]))),
PRIMARY KEY (id),
CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'hidden'::text, 'removed'::text]))),
CHECK ((char_length(TRIM(BOTH FROM title)) >= 2)));
ALTER TABLE public.translation_lesson_cases ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.translation_lesson_cases TO anon,authenticated,service_role;
CREATE TABLE public.translation_case_reports("id" uuid NOT NULL DEFAULT gen_random_uuid(),
"case_id" uuid NOT NULL,
"request_type" text NOT NULL,
"reason" text NOT NULL,
"requester_contact" text NOT NULL DEFAULT ''::text,
"status" text NOT NULL DEFAULT 'open'::text,
"created_at" timestamp with time zone NOT NULL DEFAULT now(),
FOREIGN KEY (case_id) REFERENCES public.translation_lesson_cases(id),
PRIMARY KEY (id),
CHECK ((char_length(TRIM(BOTH FROM reason)) >= 2)),
CHECK ((request_type = ANY (ARRAY['report'::text, 'edit_request'::text, 'remove_request'::text]))),
CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text]))));
ALTER TABLE public.translation_case_reports ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.translation_case_reports TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_change_translation_password(p_current_password text, p_new_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if not public.check_translation_admin_password(p_current_password) then
    raise exception '현재 관리자 비밀번호가 일치하지 않습니다.';
  end if;
  if char_length(trim(coalesce(p_new_password, ''))) < 4 then
    raise exception '새 비밀번호는 4자 이상이어야 합니다.';
  end if;
  update public.translation_admin_config
  set password_hash = extensions.crypt(trim(p_new_password), extensions.gen_salt('bf')),
      updated_at = now()
  where id = 1;
  return true;
end;
$function$;
CREATE OR REPLACE FUNCTION public.admin_list_case_reports(p_admin_password text)
 RETURNS TABLE(id uuid, case_id uuid, case_title text, request_type text, reason text, requester_contact text, status text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if not public.check_translation_admin_password(p_admin_password) then
    raise exception 'Unauthorized: 관리자 권한이 없습니다.';
  end if;

  return query
  select
    r.id,
    r.case_id,
    coalesce(c.title, '(삭제된 게시글)') as case_title,
    r.request_type,
    r.reason,
    r.requester_contact,
    r.status,
    r.created_at
  from public.translation_case_reports r
  left join public.translation_lesson_cases c on c.id = r.case_id
  order by
    case r.status when 'open' then 1 else 2 end,
    r.created_at desc;
end;
$function$;
CREATE OR REPLACE FUNCTION public.admin_list_translation_cases(p_admin_password text)
 RETURNS TABLE(id uuid, title text, used_date date, school_grade text, subject text, target_language text, file_format text, lesson_goal text, tool_usage_process text, teacher_review_notes text, observed_results_limits text, aggregate_metrics text, improvement_suggestions text, author_display_name text, confirmed_factual boolean, confirmed_no_pii boolean, confirmed_public_rights boolean, status text, rejection_reason text, is_sample boolean, created_at timestamp with time zone, updated_at timestamp with time zone, reviewed_at timestamp with time zone, open_report_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if not public.check_translation_admin_password(p_admin_password) then
    raise exception 'Unauthorized: 관리자 비밀번호가 올바르지 않거나 권한이 없습니다.';
  end if;

  return query
  select
    c.id,
    c.title,
    c.used_date,
    c.school_grade,
    c.subject,
    c.target_language,
    c.file_format,
    c.lesson_goal,
    c.tool_usage_process,
    c.teacher_review_notes,
    c.observed_results_limits,
    c.aggregate_metrics,
    c.improvement_suggestions,
    c.author_display_name,
    c.confirmed_factual,
    c.confirmed_no_pii,
    c.confirmed_public_rights,
    c.status,
    c.rejection_reason,
    c.is_sample,
    c.created_at,
    c.updated_at,
    c.reviewed_at,
    (select count(*) from public.translation_case_reports r where r.case_id = c.id and r.status = 'open') as open_report_count
  from public.translation_lesson_cases c
  where c.status <> 'removed'
  order by
    case c.status
      when 'pending' then 1
      when 'rejected' then 2
      when 'approved' then 3
      else 4
    end,
    c.created_at desc;
end;
$function$;
CREATE OR REPLACE FUNCTION public.admin_resolve_case_report(p_admin_password text, p_report_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if not public.check_translation_admin_password(p_admin_password) then
    raise exception 'Unauthorized: 관리자 권한이 없습니다.';
  end if;

  update public.translation_case_reports
  set status = 'resolved'
  where id = p_report_id;

  return true;
end;
$function$;
CREATE OR REPLACE FUNCTION public.admin_review_translation_case(p_admin_password text, p_case_id uuid, p_action text, p_rejection_reason text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if not public.check_translation_admin_password(p_admin_password) then
    raise exception 'Unauthorized: 관리자 권한이 확인되지 않아 승인·반려·삭제를 수행할 수 없습니다.';
  end if;

  if p_action = 'approve' then
    update public.translation_lesson_cases
    set status = 'approved',
        rejection_reason = '',
        reviewed_at = now(),
        updated_at = now()
    where id = p_case_id;
    return jsonb_build_object('id', p_case_id, 'status', 'approved');

  elsif p_action = 'reject' then
    if char_length(trim(coalesce(p_rejection_reason, ''))) < 2 then
      raise exception '반려 시에는 작성자가 확인하고 수정할 수 있도록 반려 사유를 필수로 입력해야 합니다.';
    end if;
    update public.translation_lesson_cases
    set status = 'rejected',
        rejection_reason = trim(p_rejection_reason),
        reviewed_at = now(),
        updated_at = now()
    where id = p_case_id;
    return jsonb_build_object('id', p_case_id, 'status', 'rejected', 'rejection_reason', trim(p_rejection_reason));

  elsif p_action = 'hide' then
    update public.translation_lesson_cases
    set status = 'hidden',
        reviewed_at = now(),
        updated_at = now()
    where id = p_case_id;
    return jsonb_build_object('id', p_case_id, 'status', 'hidden');

  elsif p_action = 'delete' or p_action = 'remove' then
    update public.translation_lesson_cases
    set status = 'removed',
        reviewed_at = now(),
        updated_at = now()
    where id = p_case_id;
    return jsonb_build_object('id', p_case_id, 'status', 'removed');

  else
    raise exception '지원하지 않는 관리자 작업입니다: %', p_action;
  end if;
end;
$function$;
CREATE OR REPLACE FUNCTION public.check_translation_admin_password(p_admin_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_hash text;
begin
  if p_admin_password is null or char_length(p_admin_password) = 0 then
    return false;
  end if;
  select password_hash into v_hash from public.translation_admin_config where id = 1;
  if v_hash is null then
    return false;
  end if;
  return v_hash = extensions.crypt(p_admin_password, v_hash);
end;
$function$;
CREATE OR REPLACE FUNCTION public.get_approved_translation_cases()
 RETURNS TABLE(id uuid, title text, used_date date, school_grade text, subject text, target_language text, file_format text, lesson_goal text, tool_usage_process text, teacher_review_notes text, observed_results_limits text, aggregate_metrics text, improvement_suggestions text, author_display_name text, status text, is_sample boolean, created_at timestamp with time zone, reviewed_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select
    c.id,
    c.title,
    c.used_date,
    c.school_grade,
    c.subject,
    c.target_language,
    c.file_format,
    c.lesson_goal,
    c.tool_usage_process,
    c.teacher_review_notes,
    c.observed_results_limits,
    c.aggregate_metrics,
    c.improvement_suggestions,
    c.author_display_name,
    c.status,
    c.is_sample,
    c.created_at,
    c.reviewed_at
  from public.translation_lesson_cases c
  where c.status = 'approved'
  order by c.is_sample asc, c.used_date desc, c.created_at desc;
$function$;
CREATE OR REPLACE FUNCTION public.get_my_translation_cases(p_case_ids uuid[] DEFAULT NULL::uuid[], p_author_passcode text DEFAULT ''::text)
 RETURNS TABLE(id uuid, title text, used_date date, school_grade text, subject text, target_language text, file_format text, lesson_goal text, tool_usage_process text, teacher_review_notes text, observed_results_limits text, aggregate_metrics text, improvement_suggestions text, author_display_name text, status text, rejection_reason text, created_at timestamp with time zone, updated_at timestamp with time zone, reviewed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF length(trim(coalesce(p_author_passcode, ''))) < 4 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.used_date,
    c.school_grade,
    c.subject,
    c.target_language,
    c.file_format,
    c.lesson_goal,
    c.tool_usage_process,
    c.teacher_review_notes,
    c.observed_results_limits,
    c.aggregate_metrics,
    c.improvement_suggestions,
    c.author_display_name,
    c.status,
    c.rejection_reason,
    c.created_at,
    c.updated_at,
    c.reviewed_at
  FROM public.translation_lesson_cases c
  WHERE c.is_sample = false
    AND c.author_passcode_hash IS NOT NULL
    AND c.author_passcode_hash = extensions.crypt(trim(p_author_passcode), c.author_passcode_hash)
    AND (p_case_ids IS NULL OR array_length(p_case_ids, 1) IS NULL OR c.id = ANY(p_case_ids))
  ORDER BY c.created_at DESC
  LIMIT 50;
END;
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

  if v_row.author_passcode_hash IS NULL OR v_row.author_passcode_hash IS DISTINCT FROM extensions.crypt(trim(coalesce(p_author_passcode, '')), v_row.author_passcode_hash) then
    raise exception '작성자 확인 비밀번호가 일치하지 않습니다.';
  end if;

  update public.translation_lesson_cases
  set status = 'removed',
      updated_at = now()
  where id = p_case_id;
  return true;
end;
$function$;
CREATE OR REPLACE FUNCTION public.report_translation_case(p_case_id uuid, p_request_type text, p_reason text, p_requester_contact text DEFAULT ''::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if char_length(trim(coalesce(p_reason, ''))) < 2 then
    raise exception '신고 또는 요청 사유를 입력해 주세요.';
  end if;

  insert into public.translation_case_reports (
    case_id,
    request_type,
    reason,
    requester_contact
  ) values (
    p_case_id,
    p_request_type,
    trim(p_reason),
    trim(coalesce(p_requester_contact, ''))
  );
  return true;
end;
$function$;
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

  if v_row.author_passcode_hash IS NULL OR v_row.author_passcode_hash IS DISTINCT FROM extensions.crypt(trim(coalesce(p_author_passcode, '')), v_row.author_passcode_hash) then
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
CREATE OR REPLACE FUNCTION public.submit_translation_case(p_title text, p_used_date date, p_school_grade text, p_subject text, p_target_language text, p_file_format text, p_lesson_goal text, p_tool_usage_process text, p_teacher_review_notes text, p_observed_results_limits text, p_aggregate_metrics text, p_improvement_suggestions text, p_author_display_name text, p_confirmed_factual boolean, p_confirmed_no_pii boolean, p_confirmed_public_rights boolean, p_author_passcode text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_id uuid;
begin
  if not ( coalesce(p_confirmed_factual, false) and coalesce(p_confirmed_no_pii, false) and coalesce(p_confirmed_public_rights, false) ) then
    raise exception '필수 확인 항목(실제 수업 활용 사실, 학생 개인정보 미포함, 공개 권한 확인)에 모두 동의해야 제출할 수 있습니다.';
  end if;

  if char_length(trim(coalesce(p_title, ''))) < 2
     or char_length(trim(coalesce(p_lesson_goal, ''))) < 2
     or char_length(trim(coalesce(p_tool_usage_process, ''))) < 2
     or char_length(trim(coalesce(p_teacher_review_notes, ''))) < 2
     or char_length(trim(coalesce(p_observed_results_limits, ''))) < 2 then
    raise exception '필수 입력 항목을 모두 작성해 주세요.';
  end if;

  if char_length(trim(coalesce(p_author_passcode, ''))) < 4 then
    raise exception '내 작성 글 상태 확인 및 수정용 비밀번호를 4자 이상 입력해 주세요.';
  end if;

  insert into public.translation_lesson_cases (
    title,
    used_date,
    school_grade,
    subject,
    target_language,
    file_format,
    lesson_goal,
    tool_usage_process,
    teacher_review_notes,
    observed_results_limits,
    aggregate_metrics,
    improvement_suggestions,
    author_display_name,
    confirmed_factual,
    confirmed_no_pii,
    confirmed_public_rights,
    status,
    rejection_reason,
    is_sample,
    author_passcode_hash
  ) values (
    trim(p_title),
    p_used_date,
    trim(p_school_grade),
    trim(p_subject),
    trim(p_target_language),
    p_file_format,
    trim(p_lesson_goal),
    trim(p_tool_usage_process),
    trim(p_teacher_review_notes),
    trim(p_observed_results_limits),
    trim(coalesce(p_aggregate_metrics, '')),
    trim(coalesce(p_improvement_suggestions, '')),
    coalesce(nullif(trim(p_author_display_name), ''), '익명 교사'),
    true,
    true,
    true,
    'pending',
    '',
    false,
    extensions.crypt(trim(p_author_passcode), extensions.gen_salt('bf'))
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'status', 'pending',
    'status_label', '관리자 승인중'
  );
end;
$function$;
GRANT EXECUTE ON FUNCTION public.admin_change_translation_password(text,text) TO PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_case_reports(text) TO PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_translation_cases(text) TO PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_resolve_case_report(text,uuid) TO PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_review_translation_case(text,uuid,text,text) TO PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.check_translation_admin_password(text) TO PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_approved_translation_cases() TO PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_translation_cases(uuid[],text) TO PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.remove_my_translation_case(uuid,text) TO PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.report_translation_case(uuid,text,text,text) TO PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.resubmit_translation_case(uuid,text,text,date,text,text,text,text,text,text,text,text,text,text,text) TO PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.submit_translation_case(text,date,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,text) TO PUBLIC,anon,authenticated,service_role;
INSERT INTO public.translation_admin_config(id,password_hash) VALUES(1,extensions.crypt('fixture-admin-old',extensions.gen_salt('bf')));
$fixture$;
END $install_fixture$;
