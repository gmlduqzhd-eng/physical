CREATE TABLE physical_internal.activity_reviews (
 activity_id text PRIMARY KEY CHECK(activity_id ~ '^[a-zA-Z0-9_-]{1,80}$'),
 source_hash text NOT NULL CHECK(source_hash ~ '^[a-f0-9]{64}$'),
 safety_checked boolean NOT NULL, grade_checked boolean NOT NULL, curriculum_checked boolean NOT NULL,
 reviewed_by uuid NOT NULL REFERENCES auth.users(id), reviewed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE physical_internal.activity_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON physical_internal.activity_reviews FROM PUBLIC,anon,authenticated;
CREATE FUNCTION physical_internal.activity_review_records(activity text DEFAULT NULL, fingerprint text DEFAULT NULL, safety boolean DEFAULT NULL, grade boolean DEFAULT NULL, curriculum boolean DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF activity IS NOT NULL THEN
  IF NOT physical_internal.is_teacher_admin() THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
  IF fingerprint IS NULL OR safety IS NULL OR grade IS NULL OR curriculum IS NULL THEN RAISE EXCEPTION 'Invalid review' USING ERRCODE='22023'; END IF;
  INSERT INTO physical_internal.activity_reviews(activity_id,source_hash,safety_checked,grade_checked,curriculum_checked,reviewed_by) VALUES(activity,fingerprint,safety,grade,curriculum,auth.uid()) ON CONFLICT(activity_id) DO UPDATE SET source_hash=excluded.source_hash,safety_checked=excluded.safety_checked,grade_checked=excluded.grade_checked,curriculum_checked=excluded.curriculum_checked,reviewed_by=auth.uid(),reviewed_at=now();
 END IF;
 -- No teacher identities or student data are disclosed in this public catalogue.
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('activityId',activity_id,'sourceHash',source_hash,'safety',safety_checked,'grade',grade_checked,'curriculum',curriculum_checked,'reviewedAt',reviewed_at)) FROM physical_internal.activity_reviews),'[]'::jsonb);
END; $$;
CREATE FUNCTION public.activity_review_records(activity text DEFAULT NULL, fingerprint text DEFAULT NULL, safety boolean DEFAULT NULL, grade boolean DEFAULT NULL, curriculum boolean DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.activity_review_records(activity,fingerprint,safety,grade,curriculum); $$;
REVOKE ALL ON FUNCTION physical_internal.activity_review_records(text,text,boolean,boolean,boolean),public.activity_review_records(text,text,boolean,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.activity_review_records(text,text,boolean,boolean,boolean),public.activity_review_records(text,text,boolean,boolean,boolean) TO anon,authenticated;
