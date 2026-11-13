-- Values stay inside the disposable DB; only equality assertions leave the DB.
CREATE FUNCTION pg_temp.hardening_snapshot(normalize_repairs boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE item record; rows_json jsonb; data jsonb:='{}';
BEGIN
  FOR item IN SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE (n.nspname IN ('public','physical_internal','physical_studio_limits','fixture_other')
      OR (n.nspname='auth' AND c.relname IN ('users','identities')))
      AND c.relkind IN ('r','p') ORDER BY 1,2 LOOP
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),''[]''::jsonb) FROM %I.%I t',item.nspname,item.relname) INTO rows_json;
    data:=data||jsonb_build_object(item.nspname||'.'||item.relname,md5(rows_json::text));
  END LOOP;
  RETURN jsonb_build_object('data',data,
    'functions',(SELECT jsonb_agg((to_jsonb(p)-'prosrc')||jsonb_build_object('prosrc',CASE
      WHEN normalize_repairs AND p.oid=to_regprocedure('physical_internal.secure_apply_classroom_boss_damage(uuid,integer,text)') THEN
        replace(p.prosrc,'SELECT * INTO previous FROM physical_internal.boss_damage_actions WHERE boss_damage_actions.action_id=apply_classroom_boss_damage.action_id;',
          'SELECT ledger.* INTO previous FROM physical_internal.boss_damage_actions AS ledger WHERE ledger.action_id=$3;')
      ELSE p.prosrc END) ORDER BY p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname IN ('public','physical_internal','physical_studio_limits') AND p.prokind='f'),
    'policies',(SELECT jsonb_agg((to_jsonb(p)-'polqual'-'polwithcheck')||jsonb_build_object(
      'using',CASE WHEN normalize_repairs THEN regexp_replace(regexp_replace(pg_get_expr(p.polqual,p.polrelid),'[[:space:]]+',' ','g'),'\( SELECT auth.uid\(\) AS uid\)','auth.uid()','g') ELSE pg_get_expr(p.polqual,p.polrelid) END,
      'check',CASE WHEN normalize_repairs THEN regexp_replace(regexp_replace(pg_get_expr(p.polwithcheck,p.polrelid),'[[:space:]]+',' ','g'),'\( SELECT auth.uid\(\) AS uid\)','auth.uid()','g') ELSE pg_get_expr(p.polwithcheck,p.polrelid) END)
      ORDER BY p.oid) FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public','physical_internal','physical_studio_limits')),
    'relations',(SELECT jsonb_agg(jsonb_build_array(c.oid,c.relowner,c.relacl,c.relrowsecurity,c.relforcerowsecurity,c.relreplident) ORDER BY c.oid)
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','physical_internal','physical_studio_limits') AND c.relkind IN ('r','p','S')),
    'columns',(SELECT jsonb_agg(jsonb_build_array(a.attrelid,a.attnum,a.attname,a.atttypid,a.attnotnull,a.attacl,a.attidentity) ORDER BY a.attrelid,a.attnum)
      FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public','physical_internal','physical_studio_limits') AND c.relkind IN ('r','p','S') AND a.attnum>0 AND NOT a.attisdropped),
    'triggers',(SELECT jsonb_agg(jsonb_build_array(t.oid,pg_get_triggerdef(t.oid),t.tgenabled) ORDER BY t.oid)
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','physical_internal','physical_studio_limits')),
    'constraints',(SELECT jsonb_agg(jsonb_build_array(c.oid,pg_get_constraintdef(c.oid)) ORDER BY c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname IN ('public','physical_internal','physical_studio_limits')),
    'default_acl',(SELECT jsonb_agg(to_jsonb(d) ORDER BY d.oid) FROM pg_default_acl d),
    'role_members',(SELECT jsonb_agg(to_jsonb(m) ORDER BY m.oid) FROM pg_auth_members m),
    'schema_acl',(SELECT jsonb_agg(jsonb_build_array(n.oid,n.nspowner,n.nspacl) ORDER BY n.oid) FROM pg_namespace n WHERE n.nspname IN ('public','physical_internal','physical_studio_limits','auth')),
    'publication',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.oid) FROM pg_publication p),
    'publication_tables',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.pubname,p.schemaname,p.tablename) FROM pg_publication_tables p),
    'cron_jobs',(SELECT jsonb_agg(to_jsonb(j) ORDER BY jobid) FROM cron.job j)
  );
END; $$;
