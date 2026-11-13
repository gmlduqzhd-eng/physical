-- Optional shared feature: SQL NULL must not bypass the existing author check.
-- No rows/hashes/passwords, grants, RLS, endpoint signatures or owners change.
-- A physical-only installation does not create or grant this other feature.
DO $author_guard$
DECLARE expected record; item record; target oid; definition text; repaired text;
  wrong_line constant text:=$old$if v_row.author_passcode_hash <> extensions.crypt(trim(coalesce(p_author_passcode, '')), v_row.author_passcode_hash) then$old$;
  fixed_line constant text:=$new$if v_row.author_passcode_hash IS NULL OR v_row.author_passcode_hash IS DISTINCT FROM extensions.crypt(trim(coalesce(p_author_passcode, '')), v_row.author_passcode_hash) then$new$;
BEGIN
  IF to_regprocedure('public.remove_my_translation_case(uuid,text)') IS NULL
    AND to_regprocedure('public.resubmit_translation_case(uuid,text,text,date,text,text,text,text,text,text,text,text,text,text,text)') IS NULL THEN RETURN; END IF;
  IF to_regclass('public.translation_lesson_cases') IS NULL THEN
    RAISE EXCEPTION 'Shared author table is missing; no author repair applied';
  END IF;
  FOR expected IN SELECT * FROM (VALUES
    ('public.remove_my_translation_case(uuid,text)','25595e8375cf0e4f0e1cedb0063231b5','7952209a2bd964506f557bfcf49ea2ff'),
    ('public.resubmit_translation_case(uuid,text,text,date,text,text,text,text,text,text,text,text,text,text,text)','20f4c307b5855148b6007b38bcd28823','d3353bbd368131abc026b76432fdc56d')
  ) AS v(signature,before_hash,after_hash) LOOP
    target:=to_regprocedure(expected.signature);
    SELECT p.* INTO item FROM pg_proc p WHERE p.oid=target;
    IF NOT FOUND OR NOT item.prosecdef OR item.proconfig IS DISTINCT FROM ARRAY['search_path=public, extensions'] THEN
      RAISE EXCEPTION 'Shared author function contract drift; no author repair applied';
    END IF;
    IF md5(regexp_replace(item.prosrc,'[[:space:]]+',' ','g'))=expected.after_hash THEN CONTINUE; END IF;
    IF md5(regexp_replace(item.prosrc,'[[:space:]]+',' ','g'))<>expected.before_hash THEN
      RAISE EXCEPTION 'Shared author function definition drift; no author repair applied';
    END IF;
    definition:=pg_get_functiondef(target);repaired:=replace(definition,wrong_line,fixed_line);
    IF repaired=definition THEN RAISE EXCEPTION 'Expected shared author check missing'; END IF;
    EXECUTE repaired;
    IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=target AND p.prosecdef
        AND p.proowner=item.proowner AND p.proacl IS NOT DISTINCT FROM item.proacl
        AND md5(regexp_replace(p.prosrc,'[[:space:]]+',' ','g'))=expected.after_hash) THEN
      RAISE EXCEPTION 'Shared author repair preservation check failed; repair rolled back';
    END IF;
  END LOOP;
END;
$author_guard$;
NOTIFY pgrst,'reload schema';
