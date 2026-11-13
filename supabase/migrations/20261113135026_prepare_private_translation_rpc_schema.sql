-- Optional shared feature: prepare a closed, empty schema before any privileged
-- implementation is copied. Verify REST profile exclusion before migration 2.
DO $prepare$
DECLARE target oid:=to_regnamespace('translation_rpc_internal'); item record; n integer; owner_oid oid:='postgres'::regrole;
BEGIN
 SELECT count(*) INTO n FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname IN ('admin_change_translation_password','admin_list_case_reports','admin_list_translation_cases','admin_resolve_case_report','admin_review_translation_case','check_translation_admin_password','get_approved_translation_cases','get_my_translation_cases','remove_my_translation_case','report_translation_case','resubmit_translation_case','submit_translation_case');
 IF n=0 AND target IS NULL THEN RETURN; END IF;
 IF n<>12 THEN RAISE EXCEPTION 'Partial shared translation feature; no private schema prepared'; END IF;
 IF target IS NULL THEN
  CREATE SCHEMA translation_rpc_internal AUTHORIZATION postgres;
  REVOKE ALL ON SCHEMA translation_rpc_internal FROM PUBLIC,anon,authenticated,service_role;
  target:='translation_rpc_internal'::regnamespace;
 END IF;
 IF (SELECT nspowner<>owner_oid FROM pg_namespace WHERE oid=target)
   OR EXISTS(SELECT 1 FROM pg_class WHERE relnamespace=target)
   OR EXISTS(SELECT 1 FROM pg_type WHERE typnamespace=target)
   OR EXISTS(SELECT 1 FROM pg_proc WHERE pronamespace=target AND proname NOT IN ('admin_change_translation_password','admin_list_case_reports','admin_list_translation_cases','admin_resolve_case_report','admin_review_translation_case','check_translation_admin_password','get_approved_translation_cases','get_my_translation_cases','remove_my_translation_case','report_translation_case','resubmit_translation_case','submit_translation_case'))
   OR (SELECT count(*) FROM pg_proc WHERE pronamespace=target) NOT IN (0,12)
   OR EXISTS(SELECT 1 FROM pg_namespace n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.oid=target AND (a.grantee NOT IN (0,owner_oid) OR a.is_grantable OR (a.grantee=0 AND a.privilege_type<>'USAGE')))
   OR (has_schema_privilege('anon',target,'USAGE') AND (SELECT count(*) FROM pg_proc WHERE pronamespace=target)<>12) THEN
  RAISE EXCEPTION 'Private translation schema drift; no schema or access repair performed';
 END IF;
END $prepare$;
NOTIFY pgrst,'reload schema';
