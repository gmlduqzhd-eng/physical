-- Caller first loads hardening_snapshot.sql. Only the three reviewed repairs
-- normalize; any other function/security attribute and all rows remain exact.
CREATE FUNCTION pg_temp.advisor_snapshot() RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE state jsonb; functions jsonb;
BEGIN
 state:=pg_temp.hardening_snapshot(false);
 SELECT jsonb_agg(CASE
   WHEN (f->>'oid')::oid=to_regprocedure('public.classroom_service_health()') AND (
     (md5(regexp_replace(f->>'prosrc','[[:space:]]+',' ','g'))='e2997b07dfe9637d78b512dadb341bfd' AND (f->>'prosecdef')::boolean)
     OR (md5(regexp_replace(f->>'prosrc','[[:space:]]+',' ','g'))='49784f8dc22352f39f3cfef321a127f9' AND NOT (f->>'prosecdef')::boolean))
     THEN f||jsonb_build_object('prosrc','reviewed catalog-only health','prosecdef',false)
   WHEN ((f->>'oid')::oid=to_regprocedure('public.remove_my_translation_case(uuid,text)') AND md5(regexp_replace(f->>'prosrc','[[:space:]]+',' ','g'))='25595e8375cf0e4f0e1cedb0063231b5')
     OR ((f->>'oid')::oid=to_regprocedure('public.resubmit_translation_case(uuid,text,text,date,text,text,text,text,text,text,text,text,text,text,text)') AND md5(regexp_replace(f->>'prosrc','[[:space:]]+',' ','g'))='20f4c307b5855148b6007b38bcd28823')
     THEN f||jsonb_build_object('prosrc',replace(f->>'prosrc',
       $old$if v_row.author_passcode_hash <> extensions.crypt(trim(coalesce(p_author_passcode, '')), v_row.author_passcode_hash) then$old$,
       $new$if v_row.author_passcode_hash IS NULL OR v_row.author_passcode_hash IS DISTINCT FROM extensions.crypt(trim(coalesce(p_author_passcode, '')), v_row.author_passcode_hash) then$new$))
   ELSE f END ORDER BY (f->>'oid')::oid) INTO functions FROM jsonb_array_elements(state->'functions') f;
 RETURN state||jsonb_build_object('functions',functions);
END; $$;
