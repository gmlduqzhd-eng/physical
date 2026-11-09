-- Seven days is the approved project policy. Existing finished rooms receive a
-- fresh seven-day grace period; an unknown historical finish time is not invented.
ALTER TABLE public.game_rooms ADD COLUMN retention_started_at timestamptz;
UPDATE public.game_rooms SET retention_started_at=clock_timestamp() WHERE teacher_id IS NOT NULL AND status='finished';
INSERT INTO physical_internal.room_retention(room_id,days) SELECT id,7 FROM public.game_rooms WHERE teacher_id IS NOT NULL ON CONFLICT(room_id) DO UPDATE SET days=7;
CREATE OR REPLACE FUNCTION physical_internal.stamp_classroom_finished() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.status='finished' AND OLD.status IS DISTINCT FROM 'finished' THEN NEW.finished_at:=clock_timestamp(); NEW.retention_started_at:=NEW.finished_at; END IF;
 IF OLD.finished_at IS NOT NULL THEN NEW.finished_at:=OLD.finished_at; END IF;
 IF OLD.retention_started_at IS NOT NULL THEN NEW.retention_started_at:=OLD.retention_started_at; END IF;
 RETURN NEW;
END; $$;
CREATE FUNCTION physical_internal.set_default_retention() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN IF NEW.teacher_id IS NOT NULL THEN INSERT INTO physical_internal.room_retention(room_id,days) VALUES(NEW.id,7); END IF; RETURN NEW; END; $$;
CREATE TRIGGER classroom_default_retention AFTER INSERT ON public.game_rooms FOR EACH ROW EXECUTE FUNCTION physical_internal.set_default_retention();

CREATE FUNCTION physical_internal.managed_classrooms() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT physical_internal.is_classroom_teacher() THEN RAISE EXCEPTION 'Teacher required' USING ERRCODE='42501'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'status',r.status,'createdAt',r.created_at,'finishedAt',r.finished_at,'retentionStartedAt',r.retention_started_at,'deleteAfter',coalesce(r.retention_started_at,r.finished_at)+interval '7 days','owned',r.teacher_id=auth.uid(),'legacy',r.teacher_id IS NULL) ORDER BY r.created_at DESC)
  FROM public.game_rooms r WHERE r.teacher_id=auth.uid() OR physical_internal.is_teacher_admin()),'[]'::jsonb);
END; $$;
CREATE FUNCTION public.managed_classrooms() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.managed_classrooms(); $$;
CREATE FUNCTION physical_internal.delete_managed_classroom(room_uuid uuid, confirmation text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE room public.game_rooms%ROWTYPE;
BEGIN
 SELECT * INTO room FROM public.game_rooms WHERE id=room_uuid FOR UPDATE;
 IF NOT FOUND OR NOT physical_internal.is_classroom_teacher() OR NOT coalesce((room.teacher_id=auth.uid() OR physical_internal.is_teacher_admin()),false) THEN RAISE EXCEPTION 'Room owner or administrator required' USING ERRCODE='42501'; END IF;
 IF confirmation IS DISTINCT FROM room.name THEN RAISE EXCEPTION 'Room name confirmation required' USING ERRCODE='22023'; END IF;
 DELETE FROM public.game_rooms WHERE id=room_uuid;
 RETURN true;
END; $$;
CREATE FUNCTION public.delete_managed_classroom(room_uuid uuid, confirmation text) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.delete_managed_classroom(room_uuid,confirmation); $$;

-- No Auth user deletion in this shared project: other applications may use them.
CREATE TABLE physical_internal.maintenance_runs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, ran_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 deleted_rooms integer NOT NULL, expired_members integer NOT NULL, outcome text NOT NULL DEFAULT 'ok'
);
ALTER TABLE physical_internal.maintenance_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON physical_internal.maintenance_runs FROM PUBLIC,anon,authenticated;
CREATE FUNCTION physical_internal.cleanup_classrooms(dry_run boolean DEFAULT true) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rooms integer; members integer;
BEGIN
 PERFORM pg_advisory_xact_lock(110902,1);
 SELECT count(*) INTO rooms FROM public.game_rooms r WHERE r.teacher_id IS NOT NULL AND r.status='finished'
  AND coalesce(r.retention_started_at,r.finished_at)<clock_timestamp()-interval '7 days'
  AND NOT EXISTS(SELECT 1 FROM physical_internal.classroom_members m WHERE m.room_id=r.id AND m.expires_at>now())
  AND NOT EXISTS(SELECT 1 FROM physical_internal.classroom_viewers v WHERE v.room_id=r.id AND v.expires_at>now());
 SELECT count(*) INTO members FROM physical_internal.classroom_members WHERE expires_at<=now();
 IF NOT dry_run THEN
  DELETE FROM public.game_rooms r WHERE r.teacher_id IS NOT NULL AND r.status='finished'
   AND coalesce(r.retention_started_at,r.finished_at)<clock_timestamp()-interval '7 days'
   AND NOT EXISTS(SELECT 1 FROM physical_internal.classroom_members m WHERE m.room_id=r.id AND m.expires_at>now())
   AND NOT EXISTS(SELECT 1 FROM physical_internal.classroom_viewers v WHERE v.room_id=r.id AND v.expires_at>now());
  DELETE FROM physical_internal.classroom_members WHERE expires_at<=now();
  DELETE FROM physical_internal.classroom_viewers WHERE expires_at<=now();
  DELETE FROM physical_internal.teacher_access WHERE expires_at<=now();
  DELETE FROM physical_internal.classroom_join_attempts WHERE until_at<=now();
  DELETE FROM physical_internal.teacher_leases WHERE until_at<=now();
  INSERT INTO physical_internal.maintenance_runs(deleted_rooms,expired_members) VALUES(rooms,members);
  DELETE FROM physical_internal.maintenance_runs WHERE ran_at<now()-interval '30 days';
 END IF;
 RETURN jsonb_build_object('dryRun',dry_run,'rooms',rooms,'expiredMembers',members);
END; $$;
CREATE FUNCTION physical_internal.classroom_maintenance_status() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT physical_internal.is_teacher_admin() THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('preview',physical_internal.cleanup_classrooms(true),'recentRuns',coalesce((SELECT jsonb_agg(t) FROM (SELECT ran_at,deleted_rooms,expired_members,outcome FROM physical_internal.maintenance_runs ORDER BY ran_at DESC LIMIT 10)t),'[]'::jsonb));
END; $$;
CREATE FUNCTION public.classroom_maintenance_status() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.classroom_maintenance_status(); $$;

CREATE FUNCTION physical_studio_limits.usage_status(server_secret text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE moment timestamptz:=clock_timestamp(); setting physical_studio_limits.config%ROWTYPE; wait_until timestamptz;
BEGIN
 SELECT * INTO setting FROM physical_studio_limits.config WHERE id;
 IF server_secret IS NULL OR length(server_secret) NOT BETWEEN 32 AND 256 OR setting.id IS NULL OR setting.secret_hash<>encode(extensions.digest(server_secret,'sha256'),'hex') THEN RAISE EXCEPTION 'Server authorization required' USING ERRCODE='42501'; END IF;
 SELECT expires_at INTO wait_until FROM physical_studio_limits.leases WHERE id AND expires_at>moment;
 RETURN jsonb_build_object('used',CASE WHEN setting.budget_day=(moment AT TIME ZONE 'Asia/Seoul')::date THEN setting.used ELSE 0 END,'dailyLimit',setting.daily_limit,'busySeconds',CASE WHEN wait_until IS NULL THEN 0 ELSE greatest(1,ceil(extract(epoch FROM wait_until-moment))::integer) END,'resetAt',(((moment AT TIME ZONE 'Asia/Seoul')::date+1)::timestamp AT TIME ZONE 'Asia/Seoul'));
END; $$;
CREATE FUNCTION public.studio_usage_status(server_secret text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_studio_limits.usage_status(server_secret); $$;
REVOKE ALL ON FUNCTION physical_internal.set_default_retention(),physical_internal.cleanup_classrooms(boolean),physical_internal.managed_classrooms(),public.managed_classrooms(),physical_internal.delete_managed_classroom(uuid,text),public.delete_managed_classroom(uuid,text),physical_internal.classroom_maintenance_status(),public.classroom_maintenance_status(),physical_studio_limits.usage_status(text),public.studio_usage_status(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.managed_classrooms(),public.managed_classrooms(),physical_internal.delete_managed_classroom(uuid,text),public.delete_managed_classroom(uuid,text),physical_internal.classroom_maintenance_status(),public.classroom_maintenance_status() TO authenticated;
GRANT EXECUTE ON FUNCTION physical_studio_limits.usage_status(text),public.studio_usage_status(text) TO anon;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
-- Hourly: actual deletion can occur up to one hour after the seven-day threshold.
SELECT cron.schedule('physical-classroom-retention','17 * * * *','SELECT physical_internal.cleanup_classrooms(false);');

CREATE FUNCTION public.classroom_service_health() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT to_regclass('public.game_rooms') IS NOT NULL AND to_regclass('physical_internal.teacher_accounts') IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.classroom_service_health() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.classroom_service_health() TO anon;
