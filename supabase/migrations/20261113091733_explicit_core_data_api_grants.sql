-- Explicit minimum table grants after the complete 20261111 security chain.
-- No data, policies, functions, defaults, service_role or publication changes.
DO $acl$
DECLARE expected record; actual record; helper record;
  authenticated_oid oid:='authenticated'::regrole;
  previous_path text:=current_setting('search_path');
  allowed_columns text[]:=ARRAY['group_name','avatar','is_defused','is_hacked','item_buff_until','is_blinded_until','completed_missions','pending_missions','badges','stats','spy_device_id','updated_at'];
BEGIN
  PERFORM set_config('search_path','pg_catalog, public',true);
  FOR helper IN SELECT * FROM (VALUES
    ('physical_internal.is_classroom_teacher()','4d7abee5956079b03ae6c8973aa66814'),
    ('physical_internal.is_google_teacher(uuid)','1039d74f6ed1671d31930c63dcb5dc2c'),
    ('physical_internal.member_classroom(uuid,uuid)','195a0971dc21ceab83bff738e9279cee'),
    ('physical_internal.owns_classroom(uuid)','52934aa122534957fcbc5bbefcf1d135'),
    ('physical_internal.reads_classroom(uuid)','9bcc01ded023e83acdc24352b4f42b34'),
    ('physical_internal.views_classroom(uuid)','65b00c487bc525e412c6954760a22e99')
  ) AS h(signature,source_hash) LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure(helper.signature)
      AND p.prosecdef AND p.proconfig=ARRAY['search_path=""']
      AND md5(regexp_replace(p.prosrc,'[[:space:]]+',' ','g'))=helper.source_hash) THEN
      RAISE EXCEPTION 'Authorization helper drift; no grants applied';
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM pg_policy WHERE polrelid IN ('public.game_rooms'::regclass,'public.room_groups'::regclass,'public.mission_templates'::regclass))<>12 THEN
    RAISE EXCEPTION 'Unexpected core policy set; no grants applied';
  END IF;
  FOR expected IN SELECT * FROM (VALUES
    ('game_rooms','classroom_room_select','r','(physical_internal.owns_classroom(id) OR physical_internal.reads_classroom(id) OR physical_internal.views_classroom(id))',NULL),
    ('game_rooms','classroom_room_insert','a',NULL,'((teacher_id = auth.uid()) AND physical_internal.is_classroom_teacher())'),
    ('game_rooms','classroom_room_update','w','physical_internal.owns_classroom(id)','((teacher_id = auth.uid()) AND physical_internal.is_classroom_teacher())'),
    ('game_rooms','classroom_room_delete','d','physical_internal.owns_classroom(id)',NULL),
    ('room_groups','classroom_group_select','r','(physical_internal.owns_classroom(room_id) OR physical_internal.reads_classroom(room_id) OR physical_internal.views_classroom(room_id))',NULL),
    ('room_groups','classroom_group_insert','a',NULL,'physical_internal.owns_classroom(room_id)'),
    ('room_groups','classroom_group_update','w','(physical_internal.owns_classroom(room_id) OR physical_internal.member_classroom(room_id, id))','(physical_internal.owns_classroom(room_id) OR physical_internal.member_classroom(room_id, id))'),
    ('room_groups','classroom_group_delete','d','physical_internal.owns_classroom(room_id)',NULL),
    ('mission_templates','classroom_template_select','r','((physical_internal.is_classroom_teacher() AND ((teacher_id = auth.uid()) OR (teacher_id IS NULL))) OR (EXISTS ( SELECT 1 FROM game_rooms r WHERE (r.template_id = mission_templates.id))))',NULL),
    ('mission_templates','classroom_template_insert','a',NULL,'((teacher_id = auth.uid()) AND physical_internal.is_classroom_teacher())'),
    ('mission_templates','classroom_template_update','w','((teacher_id = auth.uid()) AND physical_internal.is_classroom_teacher())','((teacher_id = auth.uid()) AND physical_internal.is_classroom_teacher())'),
    ('mission_templates','classroom_template_delete','d','((teacher_id = auth.uid()) AND physical_internal.is_classroom_teacher())',NULL)
  ) AS p(table_name,policy_name,command,using_expr,check_expr) LOOP
    SELECT p.*,regexp_replace(regexp_replace(pg_get_expr(p.polqual,p.polrelid),'[[:space:]]+',' ','g'),'\( SELECT auth.uid\(\) AS uid\)','auth.uid()','g') AS using_expr,
      regexp_replace(regexp_replace(pg_get_expr(p.polwithcheck,p.polrelid),'[[:space:]]+',' ','g'),'\( SELECT auth.uid\(\) AS uid\)','auth.uid()','g') AS check_expr
      INTO actual FROM pg_policy p WHERE p.polrelid=to_regclass('public.'||expected.table_name) AND p.polname=expected.policy_name;
    IF NOT FOUND OR actual.polcmd::text<>expected.command OR actual.polroles<>ARRAY[authenticated_oid]
      OR NOT actual.polpermissive OR actual.using_expr IS DISTINCT FROM expected.using_expr
      OR actual.check_expr IS DISTINCT FROM expected.check_expr THEN
      RAISE EXCEPTION 'Core policy drift: %; no grants applied',expected.policy_name;
    END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_class WHERE oid IN ('public.game_rooms'::regclass,'public.room_groups'::regclass,'public.mission_templates'::regclass) AND NOT relrowsecurity)
    OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member=authenticated_oid)
    OR EXISTS(SELECT 1 FROM pg_roles WHERE oid=authenticated_oid AND (rolsuper OR rolbypassrls)) THEN
    RAISE EXCEPTION 'Unexpected core RLS or client role inheritance';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_class WHERE oid IN ('public.game_rooms'::regclass,'public.room_groups'::regclass,'public.mission_templates'::regclass) AND has_table_privilege('anon',oid,'SELECT,INSERT,UPDATE,DELETE'))
    OR EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid IN ('public.game_rooms'::regclass,'public.room_groups'::regclass,'public.mission_templates'::regclass) AND attnum>0 AND NOT attisdropped AND has_column_privilege('anon',attrelid,attnum,'SELECT,INSERT,UPDATE,REFERENCES'))
    OR EXISTS(SELECT 1 FROM pg_class WHERE oid IN ('public.game_rooms'::regclass,'public.room_groups'::regclass,'public.mission_templates'::regclass) AND has_table_privilege('authenticated',oid,'TRUNCATE,REFERENCES,TRIGGER'))
    OR has_table_privilege('authenticated','public.room_groups','UPDATE')
    OR EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.room_groups'::regclass AND attnum>0 AND NOT attisdropped AND attname<>ALL(allowed_columns) AND has_column_privilege('authenticated',attrelid,attnum,'UPDATE')) THEN
    RAISE EXCEPTION 'Unexpected broad client privileges; review explicitly before repair';
  END IF;
  GRANT SELECT,INSERT,UPDATE,DELETE ON public.game_rooms,public.mission_templates TO authenticated;
  GRANT SELECT,INSERT,DELETE ON public.room_groups TO authenticated;
  GRANT UPDATE(group_name,avatar,is_defused,is_hacked,item_buff_until,is_blinded_until,completed_missions,pending_missions,badges,stats,spy_device_id,updated_at) ON public.room_groups TO authenticated;
  PERFORM set_config('search_path',previous_path,true);
END;
$acl$;
NOTIFY pgrst,'reload schema';
