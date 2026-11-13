-- Repair only the duplicate-action lookup in the guarded private boss RPC.
-- No data, policies, grants, ownership, wrappers, triggers or publications change.
-- Read the existing DDL so every auxiliary function property is retained too.
DO $repair$
DECLARE target oid := to_regprocedure('physical_internal.secure_apply_classroom_boss_damage(uuid,integer,text)');
  source_hash text; definition text; repaired text;
  wrong_line constant text := 'SELECT * INTO previous FROM physical_internal.boss_damage_actions WHERE boss_damage_actions.action_id=apply_classroom_boss_damage.action_id;';
  fixed_line constant text := 'SELECT ledger.* INTO previous FROM physical_internal.boss_damage_actions AS ledger WHERE ledger.action_id=$3;';
BEGIN
  IF target IS NULL THEN RAISE EXCEPTION 'Guarded boss RPC is missing; apply earlier migrations in order'; END IF;
  SELECT md5(regexp_replace(p.prosrc,'[[:space:]]+',' ','g')) INTO source_hash
    FROM pg_proc p WHERE p.oid=target AND p.prosecdef AND p.proconfig=ARRAY['search_path=""'];
  IF source_hash IS NULL THEN RAISE EXCEPTION 'Boss RPC security attributes differ; review drift before applying this repair'; END IF;
  -- Reapplying this migration is a no-op; definition drift still fails closed.
  IF source_hash='8cfec429229bdd2a8053fce479df33ca' THEN RETURN; END IF;
  IF source_hash<>'a4236f4c5b2db7f1e2405152213a34f6' THEN
    RAISE EXCEPTION 'Unexpected boss RPC definition; no function or data has been changed';
  END IF;
  definition:=pg_get_functiondef(target);
  repaired:=replace(definition,wrong_line,fixed_line);
  IF repaired=definition THEN RAISE EXCEPTION 'Expected boss retry lookup is missing; no repair applied'; END IF;
  EXECUTE repaired;
  IF (SELECT md5(regexp_replace(p.prosrc,'[[:space:]]+',' ','g')) FROM pg_proc p WHERE p.oid=target)<>'8cfec429229bdd2a8053fce479df33ca' THEN
    RAISE EXCEPTION 'Unexpected repaired boss RPC definition; repair rolled back';
  END IF;
END;
$repair$;
NOTIFY pgrst,'reload schema';
