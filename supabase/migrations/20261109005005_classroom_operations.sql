-- Existing rooms retain their scoring behavior; new rooms require teacher review.
ALTER TABLE public.game_rooms ADD COLUMN finished_at timestamptz;
ALTER TABLE public.game_rooms ADD COLUMN score_review_enabled boolean;
UPDATE public.game_rooms SET score_review_enabled=false;
ALTER TABLE public.game_rooms ALTER COLUMN score_review_enabled SET DEFAULT true;
ALTER TABLE public.game_rooms ALTER COLUMN score_review_enabled SET NOT NULL;
ALTER TABLE public.game_rooms ADD COLUMN score_limit integer NOT NULL DEFAULT 10000 CHECK(score_limit BETWEEN 1 AND 1000000);

CREATE TABLE physical_internal.room_retention (
  room_id uuid PRIMARY KEY REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  days integer CHECK(days=7), changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE physical_internal.student_score_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.room_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_id text NOT NULL UNIQUE CHECK(length(action_id) BETWEEN 1 AND 128),
  activity_id text NOT NULL CHECK(length(activity_id) BETWEEN 1 AND 80),
  amount integer NOT NULL CHECK(amount BETWEEN 0 AND 1000000),
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','rejected')),
  approved_amount integer, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), reviewed_at timestamptz
);
CREATE UNIQUE INDEX score_request_pending_idx ON physical_internal.student_score_requests(user_id,group_id,activity_id) WHERE state='pending';
CREATE INDEX score_request_room_idx ON physical_internal.student_score_requests(room_id,created_at);
ALTER TABLE physical_internal.room_retention ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_internal.student_score_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON physical_internal.room_retention,physical_internal.student_score_requests FROM PUBLIC,anon,authenticated;

CREATE FUNCTION physical_internal.stamp_classroom_finished() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.status='finished' AND OLD.status IS DISTINCT FROM 'finished' THEN NEW.finished_at:=clock_timestamp(); END IF;
 IF OLD.finished_at IS NOT NULL THEN NEW.finished_at:=OLD.finished_at; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER stamp_classroom_finished BEFORE UPDATE ON public.game_rooms FOR EACH ROW EXECUTE FUNCTION physical_internal.stamp_classroom_finished();

CREATE FUNCTION physical_internal.classroom_operations(room_uuid uuid, operation text, retention_days integer DEFAULT NULL, review_scores boolean DEFAULT NULL, max_points integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE room public.game_rooms%ROWTYPE; keep_days integer; due boolean;
BEGIN
 SELECT * INTO room FROM public.game_rooms WHERE id=room_uuid FOR UPDATE;
 IF NOT FOUND OR NOT physical_internal.owns_classroom(room_uuid) THEN RAISE EXCEPTION 'Room owner required' USING ERRCODE='42501'; END IF;
 IF operation='retention' THEN
  IF retention_days IS DISTINCT FROM 7 THEN RAISE EXCEPTION 'Invalid retention' USING ERRCODE='22023'; END IF;
  INSERT INTO physical_internal.room_retention(room_id,days) VALUES(room_uuid,retention_days) ON CONFLICT(room_id) DO UPDATE SET days=excluded.days,changed_at=now();
 ELSIF operation='score-policy' THEN
  IF review_scores IS NULL OR max_points IS NULL OR max_points NOT BETWEEN 1 AND 1000000 THEN RAISE EXCEPTION 'Invalid score policy' USING ERRCODE='22023'; END IF;
  UPDATE public.game_rooms SET score_review_enabled=review_scores,score_limit=max_points WHERE id=room_uuid;
  room.score_review_enabled:=review_scores; room.score_limit:=max_points;
 ELSIF operation NOT IN ('status','delete-due') THEN RAISE EXCEPTION 'Invalid operation' USING ERRCODE='22023'; END IF;
 SELECT days INTO keep_days FROM physical_internal.room_retention WHERE room_id=room_uuid;
 due:=keep_days IS NOT NULL AND room.status='finished' AND room.finished_at IS NOT NULL AND room.finished_at < now()-make_interval(days=>keep_days)
  AND NOT EXISTS(SELECT 1 FROM physical_internal.classroom_members WHERE room_id=room_uuid AND expires_at>now())
  AND NOT EXISTS(SELECT 1 FROM physical_internal.classroom_viewers WHERE room_id=room_uuid AND expires_at>now());
 IF operation='delete-due' THEN
  IF NOT coalesce(due,false) THEN RAISE EXCEPTION 'Retention has not elapsed' USING ERRCODE='22023'; END IF;
  DELETE FROM public.game_rooms WHERE id=room_uuid;
  RETURN jsonb_build_object('deleted',true);
 END IF;
 RETURN jsonb_build_object('retentionDays',keep_days,'finishedAt',room.finished_at,'deletionDue',coalesce(due,false),'reviewScores',room.score_review_enabled,'maxPoints',room.score_limit);
END; $$;

CREATE FUNCTION public.classroom_operations(room_uuid uuid, operation text, retention_days integer DEFAULT NULL, review_scores boolean DEFAULT NULL, max_points integer DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.classroom_operations(room_uuid,operation,retention_days,review_scores,max_points); $$;

-- Keep the established trusted path for legacy rooms and owner adjustments.
ALTER FUNCTION physical_internal.secure_increment_classroom_score(uuid,integer,text) RENAME TO trusted_increment_classroom_score;
REVOKE ALL ON FUNCTION physical_internal.trusted_increment_classroom_score(uuid,integer,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION physical_internal.secure_increment_classroom_score(row_id uuid, amount integer, requested_action text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE room_uuid uuid;
BEGIN
 SELECT room_id INTO room_uuid FROM public.room_groups WHERE id=row_id;
 IF EXISTS(SELECT 1 FROM public.game_rooms WHERE id=room_uuid AND score_review_enabled) AND NOT physical_internal.owns_classroom(room_uuid) THEN
  RAISE EXCEPTION 'Teacher review required' USING ERRCODE='42501';
 END IF;
 RETURN physical_internal.trusted_increment_classroom_score(row_id,amount,requested_action);
END; $$;
-- SQL wrappers are rebound explicitly after the private function rename.
CREATE OR REPLACE FUNCTION public.increment_classroom_score(row_id uuid, amount integer, action_id text DEFAULT NULL)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.secure_increment_classroom_score(row_id,amount,action_id); $$;

CREATE FUNCTION physical_internal.submit_classroom_score(row_id uuid, amount integer, action_id text, activity_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE room public.game_rooms%ROWTYPE; previous physical_internal.student_score_requests%ROWTYPE; request_uuid uuid;
BEGIN
 SELECT r.* INTO room FROM public.game_rooms r JOIN public.room_groups g ON g.room_id=r.id WHERE g.id=row_id FOR UPDATE OF r;
 IF NOT FOUND OR NOT physical_internal.can_write_group(row_id) OR room.status IN ('finished','waiting','paused','locked') THEN RAISE EXCEPTION 'Classroom access denied' USING ERRCODE='42501'; END IF;
 IF action_id IS NULL OR length(action_id) NOT BETWEEN 1 AND 128 THEN RAISE EXCEPTION 'Invalid action' USING ERRCODE='22023'; END IF;
 IF NOT room.score_review_enabled OR physical_internal.owns_classroom(room.id) THEN
  PERFORM physical_internal.trusted_increment_classroom_score(row_id,amount,action_id);
  RETURN jsonb_build_object('state','saved');
 END IF;
 IF amount IS NULL OR amount NOT BETWEEN 0 AND room.score_limit OR activity_id IS NULL OR activity_id !~ '^[a-zA-Z0-9_-]{1,80}$' THEN RAISE EXCEPTION 'Score outside teacher limit' USING ERRCODE='22023'; END IF;
 SELECT * INTO previous FROM physical_internal.student_score_requests s WHERE s.action_id=submit_classroom_score.action_id;
 IF FOUND THEN
  IF previous.user_id<>auth.uid() OR previous.group_id<>row_id OR previous.amount<>amount OR previous.activity_id<>submit_classroom_score.activity_id THEN RAISE EXCEPTION 'Score action conflict' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('state',previous.state,'id',previous.id);
 END IF;
 SELECT * INTO previous FROM physical_internal.student_score_requests s WHERE s.user_id=auth.uid() AND s.group_id=row_id AND s.activity_id=submit_classroom_score.activity_id AND s.state='pending';
 IF FOUND THEN RETURN jsonb_build_object('state','pending','id',previous.id); END IF;
 IF (SELECT count(*) FROM physical_internal.student_score_requests s WHERE s.user_id=auth.uid() AND s.created_at>clock_timestamp()-interval '1 minute')>=3 THEN RAISE EXCEPTION 'Submission limit' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM physical_internal.student_score_requests s WHERE s.group_id=row_id AND s.state='pending')>=30 THEN RAISE EXCEPTION 'Pending submissions full' USING ERRCODE='22023'; END IF;
 INSERT INTO physical_internal.student_score_requests(room_id,group_id,user_id,action_id,activity_id,amount) VALUES(room.id,row_id,auth.uid(),action_id,activity_id,amount) RETURNING id INTO request_uuid;
 RETURN jsonb_build_object('state','pending','id',request_uuid);
END; $$;
CREATE FUNCTION public.submit_classroom_score(row_id uuid, amount integer, action_id text, activity_id text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.submit_classroom_score(row_id,amount,action_id,activity_id); $$;

CREATE FUNCTION physical_internal.review_classroom_score(room_uuid uuid, request_uuid uuid DEFAULT NULL, approved_points integer DEFAULT NULL, accept boolean DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE room public.game_rooms%ROWTYPE; entry physical_internal.student_score_requests%ROWTYPE;
BEGIN
 SELECT * INTO room FROM public.game_rooms WHERE id=room_uuid FOR UPDATE;
 IF NOT FOUND OR NOT physical_internal.owns_classroom(room_uuid) THEN RAISE EXCEPTION 'Room owner required' USING ERRCODE='42501'; END IF;
 IF request_uuid IS NULL THEN
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'groupId',s.group_id,'groupName',g.group_name,'activityId',s.activity_id,'amount',s.amount,'createdAt',s.created_at) ORDER BY s.created_at) FROM physical_internal.student_score_requests s JOIN public.room_groups g ON g.id=s.group_id WHERE s.room_id=room_uuid AND s.state='pending'),'[]'::jsonb);
 END IF;
 SELECT * INTO entry FROM physical_internal.student_score_requests WHERE id=request_uuid AND room_id=room_uuid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown score request' USING ERRCODE='22023'; END IF;
 IF entry.state<>'pending' THEN RETURN jsonb_build_object('state',entry.state); END IF;
 IF room.status='finished' OR accept IS NULL OR (accept AND (approved_points IS NULL OR approved_points NOT BETWEEN 0 AND room.score_limit)) THEN RAISE EXCEPTION 'Invalid score review' USING ERRCODE='22023'; END IF;
 IF accept THEN PERFORM physical_internal.trusted_increment_classroom_score(entry.group_id,approved_points,'review:'||entry.id); END IF;
 UPDATE physical_internal.student_score_requests SET state=CASE WHEN accept THEN 'approved' ELSE 'rejected' END,approved_amount=CASE WHEN accept THEN approved_points ELSE NULL END,reviewed_at=clock_timestamp() WHERE id=request_uuid;
 RETURN jsonb_build_object('state',CASE WHEN accept THEN 'approved' ELSE 'rejected' END);
END; $$;
CREATE FUNCTION public.review_classroom_score(room_uuid uuid, request_uuid uuid DEFAULT NULL, approved_points integer DEFAULT NULL, accept boolean DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.review_classroom_score(room_uuid,request_uuid,approved_points,accept); $$;

REVOKE ALL ON FUNCTION physical_internal.stamp_classroom_finished() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION physical_internal.classroom_operations(uuid,text,integer,boolean,integer),public.classroom_operations(uuid,text,integer,boolean,integer),physical_internal.secure_increment_classroom_score(uuid,integer,text),physical_internal.submit_classroom_score(uuid,integer,text,text),public.submit_classroom_score(uuid,integer,text,text),physical_internal.review_classroom_score(uuid,uuid,integer,boolean),public.review_classroom_score(uuid,uuid,integer,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.classroom_operations(uuid,text,integer,boolean,integer),public.classroom_operations(uuid,text,integer,boolean,integer),physical_internal.secure_increment_classroom_score(uuid,integer,text),physical_internal.submit_classroom_score(uuid,integer,text,text),public.submit_classroom_score(uuid,integer,text,text),physical_internal.review_classroom_score(uuid,uuid,integer,boolean),public.review_classroom_score(uuid,uuid,integer,boolean) TO authenticated;
