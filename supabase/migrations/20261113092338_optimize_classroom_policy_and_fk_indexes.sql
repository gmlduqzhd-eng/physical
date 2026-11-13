-- Keep ownership/membership/expiry/result rules; cache only row-independent UID.
-- ALTER POLICY preserves policy identity, command, roles and permissiveness.
-- Bounded lock acquisition: a busy database aborts instead of waiting indefinitely.
DO $performance$
DECLARE expected record; actual record; item record; table_oid oid; column_number smallint;
  old_using text; old_check text; statement text;
  previous_path text:=current_setting('search_path');
  previous_lock_timeout text:=current_setting('lock_timeout');
BEGIN
  PERFORM set_config('search_path','pg_catalog, public',true);
  PERFORM set_config('lock_timeout','5s',true);
  FOR expected IN SELECT * FROM (VALUES
    ('game_rooms','classroom_room_insert','a',NULL,'((teacher_id = auth.uid()) AND physical_internal.is_classroom_teacher())'),
    ('game_rooms','classroom_room_update','w','physical_internal.owns_classroom(id)','((teacher_id = auth.uid()) AND physical_internal.is_classroom_teacher())'),
    ('mission_templates','classroom_template_select','r','((physical_internal.is_classroom_teacher() AND ((teacher_id = auth.uid()) OR (teacher_id IS NULL))) OR (EXISTS ( SELECT 1 FROM game_rooms r WHERE (r.template_id = mission_templates.id))))',NULL),
    ('mission_templates','classroom_template_insert','a',NULL,'((teacher_id = auth.uid()) AND physical_internal.is_classroom_teacher())'),
    ('mission_templates','classroom_template_update','w','((teacher_id = auth.uid()) AND physical_internal.is_classroom_teacher())','((teacher_id = auth.uid()) AND physical_internal.is_classroom_teacher())'),
    ('mission_templates','classroom_template_delete','d','((teacher_id = auth.uid()) AND physical_internal.is_classroom_teacher())',NULL)
  ) AS p(table_name,policy_name,command,using_expr,check_expr) LOOP
    SELECT p.*,regexp_replace(regexp_replace(pg_get_expr(p.polqual,p.polrelid),'[[:space:]]+',' ','g'),'\( SELECT auth.uid\(\) AS uid\)','auth.uid()','g') AS using_expr,
      regexp_replace(regexp_replace(pg_get_expr(p.polwithcheck,p.polrelid),'[[:space:]]+',' ','g'),'\( SELECT auth.uid\(\) AS uid\)','auth.uid()','g') AS check_expr
      INTO actual FROM pg_policy p WHERE p.polrelid=to_regclass('public.'||expected.table_name) AND p.polname=expected.policy_name;
    IF NOT FOUND OR actual.polcmd::text<>expected.command OR actual.polroles<>ARRAY['authenticated'::regrole::oid]
      OR NOT actual.polpermissive OR actual.using_expr IS DISTINCT FROM expected.using_expr
      OR actual.check_expr IS DISTINCT FROM expected.check_expr THEN
      RAISE EXCEPTION 'Policy drift: %; performance repair rolled back',expected.policy_name;
    END IF;
    statement:=format('ALTER POLICY %I ON public.%I',expected.policy_name,expected.table_name);
    IF expected.using_expr IS NOT NULL THEN statement:=statement||' USING ('||replace(expected.using_expr,'auth.uid()','(select auth.uid())')||')'; END IF;
    IF expected.check_expr IS NOT NULL THEN statement:=statement||' WITH CHECK ('||replace(expected.check_expr,'auth.uid()','(select auth.uid())')||')'; END IF;
    EXECUTE statement;
  END LOOP;
  FOR item IN SELECT * FROM (VALUES
    ('physical_internal','activity_reviews','reviewed_by','activity_reviews_reviewed_by_idx',false),
    ('physical_internal','classroom_members','user_id','classroom_members_user_id_idx',false),
    ('physical_internal','classroom_viewers','user_id','classroom_viewers_user_id_idx',false),
    ('physical_internal','student_score_requests','group_id','student_score_requests_group_id_idx',false),
    ('physical_internal','teacher_admin_invitation','claimed_by','teacher_admin_invitation_claimed_by_idx',false),
    ('public','game_rooms','template_id','game_rooms_template_id_idx',false),
    -- Shared feature: additive index only when its exact existing FK is present.
    -- An empty physical installation does not create the other application's tables.
    ('public','translation_case_reports','case_id','translation_case_reports_case_id_idx',true)
  ) AS i(schema_name,table_name,column_name,index_name,optional) LOOP
    table_oid:=to_regclass(format('%I.%I',item.schema_name,item.table_name));
    IF table_oid IS NULL AND item.optional THEN CONTINUE; END IF;
    SELECT attnum INTO column_number FROM pg_attribute WHERE attrelid=table_oid AND attname=item.column_name AND NOT attisdropped;
    IF column_number IS NULL OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=table_oid AND contype='f' AND conkey=ARRAY[column_number])
      OR (item.optional AND NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=table_oid AND contype='f' AND conkey=ARRAY[column_number] AND confrelid=to_regclass('public.translation_lesson_cases'))) THEN
      RAISE EXCEPTION 'Foreign key drift: %.%; performance repair rolled back',item.schema_name,item.table_name;
    END IF;
    IF to_regclass(format('%I.%I',item.schema_name,item.index_name)) IS NOT NULL
      AND NOT EXISTS(SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_am a ON a.oid=c.relam WHERE i.indexrelid=to_regclass(format('%I.%I',item.schema_name,item.index_name)) AND i.indrelid=table_oid AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indkey[0]=column_number AND a.amname='btree') THEN
      RAISE EXCEPTION 'Index name collision: %; performance repair rolled back',item.index_name;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_am a ON a.oid=c.relam WHERE i.indrelid=table_oid AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indkey[0]=column_number AND a.amname='btree') THEN
      EXECUTE format('CREATE INDEX %I ON %I.%I (%I)',item.index_name,item.schema_name,item.table_name,item.column_name);
    END IF;
  END LOOP;
  PERFORM set_config('lock_timeout',previous_lock_timeout,true);
  PERFORM set_config('search_path',previous_path,true);
END;
$performance$;
NOTIFY pgrst,'reload schema';
