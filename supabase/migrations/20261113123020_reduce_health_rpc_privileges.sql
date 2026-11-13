-- This endpoint reports relation existence only; it never needs owner privileges.
-- Catalog lookups also preserve service_role's result without granting private
-- schema/table access. Keep the existing OID, owner, ACL and endpoint signature.
DO $health$
DECLARE target oid:=to_regprocedure('public.classroom_service_health()');
  item record; source_hash text; definition text; repaired text;
  replacement constant text:=$source$
 SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='game_rooms')
   AND EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='physical_internal' AND c.relname='teacher_accounts');
$source$;
BEGIN
  SELECT p.* INTO item FROM pg_proc p WHERE p.oid=target;
  IF NOT FOUND OR item.prorettype<>'boolean'::regtype OR item.pronargs<>0
    OR item.prolang<>(SELECT oid FROM pg_language WHERE lanname='sql')
    OR item.provolatile<>'s' OR item.proconfig IS DISTINCT FROM ARRAY['search_path=""'] THEN
    RAISE EXCEPTION 'Unexpected classroom health contract; no privilege change applied';
  END IF;
  source_hash:=md5(regexp_replace(item.prosrc,'[[:space:]]+',' ','g'));
  IF source_hash='49784f8dc22352f39f3cfef321a127f9' AND NOT item.prosecdef THEN RETURN; END IF;
  IF source_hash<>'e2997b07dfe9637d78b512dadb341bfd' OR NOT item.prosecdef THEN
    RAISE EXCEPTION 'Classroom health definition drift; no privilege change applied';
  END IF;
  definition:=pg_get_functiondef(target);
  repaired:=replace(replace(definition,item.prosrc,replacement),'SECURITY DEFINER','SECURITY INVOKER');
  IF repaired=definition THEN RAISE EXCEPTION 'Expected health definition missing'; END IF;
  EXECUTE repaired;
  IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=target AND NOT p.prosecdef
      AND p.proowner=item.proowner AND p.proacl IS NOT DISTINCT FROM item.proacl
      AND md5(regexp_replace(p.prosrc,'[[:space:]]+',' ','g'))='49784f8dc22352f39f3cfef321a127f9') THEN
    RAISE EXCEPTION 'Health repair preservation check failed; repair rolled back';
  END IF;
END;
$health$;
NOTIFY pgrst,'reload schema';
