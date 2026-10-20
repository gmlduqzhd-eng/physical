-- Read-only audit. Do not run the destructive supabase_schema.sql against the live project.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('game_rooms','room_groups','mission_templates');

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('game_rooms','room_groups','mission_templates')
order by table_name, grantee, privilege_type;
