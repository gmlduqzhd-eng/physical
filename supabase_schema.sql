-- RETIRED: this file used to destroy classroom data. Never use it for an upgrade.
-- Empty Supabase database / existing database: see docs/DATA_API_GRANTS_RUNBOOK.md.
DO $blocked$
BEGIN
  RAISE EXCEPTION 'Unsafe legacy installer is disabled. Read docs/DATA_API_GRANTS_RUNBOOK.md; no data has been changed.';
END;
$blocked$;
