
CREATE TABLE physical_internal.classroom_board_invites(room_id uuid PRIMARY KEY REFERENCES public.game_rooms(id) ON DELETE CASCADE,code text NOT NULL);
CREATE TABLE physical_internal.classroom_viewers(room_id uuid REFERENCES public.game_rooms(id) ON DELETE CASCADE,user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,expires_at timestamptz NOT NULL,PRIMARY KEY(room_id,user_id));
CREATE TABLE physical_internal.classroom_recovery(room_id uuid PRIMARY KEY REFERENCES public.game_rooms(id) ON DELETE CASCADE,code text NOT NULL);
ALTER TABLE physical_internal.classroom_board_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_internal.classroom_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_internal.classroom_recovery ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON physical_internal.classroom_board_invites,physical_internal.classroom_viewers,physical_internal.classroom_recovery FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION physical_internal.views_classroom(room_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM physical_internal.classroom_viewers v JOIN public.game_rooms r ON r.id=v.room_id WHERE v.room_id=room_uuid AND v.user_id=auth.uid() AND v.expires_at>now() AND r.status<>'finished'); $$;
CREATE OR REPLACE FUNCTION physical_internal.get_classroom_device_codes(room_uuid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE board_code text; recovery_code text; BEGIN
 IF auth.uid() IS NULL OR NOT physical_internal.owns_classroom(room_uuid) THEN RAISE EXCEPTION 'Room owner required' USING ERRCODE='42501'; END IF;
 INSERT INTO physical_internal.classroom_board_invites VALUES(room_uuid,encode(extensions.gen_random_bytes(8),'hex')) ON CONFLICT DO NOTHING;
 INSERT INTO physical_internal.classroom_recovery VALUES(room_uuid,encode(extensions.gen_random_bytes(16),'hex')) ON CONFLICT DO NOTHING;
 SELECT code INTO board_code FROM physical_internal.classroom_board_invites WHERE room_id=room_uuid;
 SELECT code INTO recovery_code FROM physical_internal.classroom_recovery WHERE room_id=room_uuid;
 RETURN jsonb_build_object('board_code',board_code,'recovery_code',recovery_code);
END; $$;
CREATE OR REPLACE FUNCTION public.get_classroom_device_codes(room_uuid uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.get_classroom_device_codes(room_uuid); $$;
CREATE OR REPLACE FUNCTION physical_internal.join_classroom_board(room_uuid uuid,board_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE n integer; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 INSERT INTO physical_internal.classroom_join_attempts(user_id,attempts,until_at) VALUES(auth.uid(),1,now()+interval '15 minutes') ON CONFLICT(user_id) DO UPDATE SET attempts=CASE WHEN classroom_join_attempts.until_at<now() THEN 1 ELSE classroom_join_attempts.attempts+1 END,until_at=CASE WHEN classroom_join_attempts.until_at<now() THEN now()+interval '15 minutes' ELSE classroom_join_attempts.until_at END RETURNING attempts INTO n;
 IF n>12 OR NOT EXISTS(SELECT 1 FROM physical_internal.classroom_board_invites i JOIN public.game_rooms r ON r.id=i.room_id WHERE i.room_id=room_uuid AND i.code=lower(board_code) AND r.status<>'finished') THEN RETURN false; END IF;
 INSERT INTO physical_internal.classroom_viewers VALUES(room_uuid,auth.uid(),now()+interval '4 hours') ON CONFLICT(room_id,user_id) DO UPDATE SET expires_at=EXCLUDED.expires_at;
 RETURN true;
END; $$;
CREATE OR REPLACE FUNCTION public.join_classroom_board(room_uuid uuid,board_code text) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.join_classroom_board(room_uuid,board_code); $$;
CREATE OR REPLACE FUNCTION physical_internal.recover_secure_classroom(pin text,recovery_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE room public.game_rooms%ROWTYPE; copied_template uuid; BEGIN
 IF auth.uid() IS NULL OR NOT physical_internal.is_classroom_teacher() THEN RAISE EXCEPTION 'Teacher authorization required' USING ERRCODE='42501'; END IF;
 SELECT r.* INTO room FROM public.game_rooms r JOIN physical_internal.classroom_recovery k ON k.room_id=r.id WHERE r.pin_code=pin AND k.code=lower(recovery_code) FOR UPDATE OF r;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM public.mission_templates WHERE id=room.template_id AND teacher_id IS NOT NULL AND teacher_id<>auth.uid()) THEN
 INSERT INTO public.mission_templates(name,buttons,teacher_id) SELECT name,buttons,auth.uid() FROM public.mission_templates WHERE id=room.template_id RETURNING id INTO copied_template; room.template_id:=copied_template;
 END IF;
 UPDATE public.game_rooms SET teacher_id=auth.uid(),template_id=room.template_id WHERE id=room.id RETURNING * INTO room;
 UPDATE physical_internal.classroom_recovery SET code=encode(extensions.gen_random_bytes(16),'hex') WHERE room_id=room.id;
 UPDATE physical_internal.classroom_board_invites SET code=encode(extensions.gen_random_bytes(8),'hex') WHERE room_id=room.id;
 UPDATE physical_internal.classroom_invites SET code=encode(extensions.gen_random_bytes(6),'hex') WHERE group_id IN(SELECT id FROM public.room_groups WHERE room_id=room.id);
 DELETE FROM physical_internal.classroom_members WHERE room_id=room.id;
 DELETE FROM physical_internal.classroom_viewers WHERE room_id=room.id;
 DELETE FROM physical_internal.teacher_leases WHERE room_id=room.id;
 RETURN to_jsonb(room);
END; $$;
CREATE OR REPLACE FUNCTION public.recover_secure_classroom(pin text,recovery_code text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT physical_internal.recover_secure_classroom(pin,recovery_code); $$;
CREATE OR REPLACE FUNCTION physical_internal.logout_classroom()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF; DELETE FROM physical_internal.teacher_access WHERE user_id=auth.uid(); DELETE FROM physical_internal.classroom_members WHERE user_id=auth.uid(); DELETE FROM physical_internal.classroom_viewers WHERE user_id=auth.uid(); END; $$;
DROP POLICY classroom_room_select ON public.game_rooms;
CREATE POLICY classroom_room_select ON public.game_rooms FOR SELECT TO authenticated USING(physical_internal.owns_classroom(id) OR physical_internal.member_classroom(id) OR physical_internal.views_classroom(id));
DROP POLICY classroom_group_select ON public.room_groups;
CREATE POLICY classroom_group_select ON public.room_groups FOR SELECT TO authenticated USING(physical_internal.owns_classroom(room_id) OR physical_internal.member_classroom(room_id) OR physical_internal.views_classroom(room_id));
REVOKE ALL ON FUNCTION physical_internal.views_classroom(uuid),physical_internal.get_classroom_device_codes(uuid),physical_internal.join_classroom_board(uuid,text),physical_internal.recover_secure_classroom(text,text),public.get_classroom_device_codes(uuid),public.join_classroom_board(uuid,text),public.recover_secure_classroom(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.views_classroom(uuid),physical_internal.get_classroom_device_codes(uuid),physical_internal.join_classroom_board(uuid,text),physical_internal.recover_secure_classroom(text,text),public.get_classroom_device_codes(uuid),public.join_classroom_board(uuid,text),public.recover_secure_classroom(text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
