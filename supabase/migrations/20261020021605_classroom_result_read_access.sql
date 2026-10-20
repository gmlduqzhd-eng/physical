-- Existing participants retain read-only access to final results until expiry.
-- member_classroom remains the stricter write guard and rejects finished rooms.
CREATE OR REPLACE FUNCTION physical_internal.reads_classroom(room_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM physical_internal.classroom_members m WHERE m.user_id=auth.uid() AND m.room_id=room_uuid AND m.expires_at>now());
$$;
CREATE OR REPLACE FUNCTION physical_internal.views_classroom(room_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM physical_internal.classroom_viewers v WHERE v.room_id=room_uuid AND v.user_id=auth.uid() AND v.expires_at>now());
$$;
REVOKE ALL ON FUNCTION physical_internal.reads_classroom(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION physical_internal.reads_classroom(uuid) TO authenticated;
DROP POLICY classroom_room_select ON public.game_rooms;
CREATE POLICY classroom_room_select ON public.game_rooms FOR SELECT TO authenticated USING(physical_internal.owns_classroom(id) OR physical_internal.reads_classroom(id) OR physical_internal.views_classroom(id));
DROP POLICY classroom_group_select ON public.room_groups;
CREATE POLICY classroom_group_select ON public.room_groups FOR SELECT TO authenticated USING(physical_internal.owns_classroom(room_id) OR physical_internal.reads_classroom(room_id) OR physical_internal.views_classroom(room_id));
NOTIFY pgrst,'reload schema';
