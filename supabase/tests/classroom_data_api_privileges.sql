\ir assert_isolated.sql
-- Run only in the isolated test database. Catalog assertions include inherited
-- privileges and PUBLIC ACLs, not only direct grants to named client roles.
BEGIN;
DO $$ BEGIN
  IF current_setting('physical.test_database',true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Set physical.test_database=on only on an isolated test connection';
  END IF;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.assert_ok(value boolean,label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'PRIVILEGE TEST FAILED: %',label; END IF; END $$;
GRANT EXECUTE ON FUNCTION pg_temp.assert_ok(boolean,text) TO authenticated,anon;

DO $$ DECLARE object_name text; privilege text; column_name text; object_oid oid; entry record;
allowed_updates constant text[]:=ARRAY['group_name','avatar','is_defused','is_hacked','item_buff_until','is_blinded_until','completed_missions','pending_missions','badges','stats','spy_device_id','updated_at'];
BEGIN
  PERFORM pg_temp.assert_ok((SELECT NOT rolsuper AND NOT rolbypassrls FROM pg_roles WHERE rolname='authenticated'),'authenticated cannot bypass RLS');
  FOREACH object_name IN ARRAY ARRAY['game_rooms','room_groups','mission_templates'] LOOP
    object_oid:=to_regclass('public.'||object_name);
    PERFORM pg_temp.assert_ok(object_oid IS NOT NULL,'core table exists: '||object_name);
    PERFORM pg_temp.assert_ok((SELECT relrowsecurity FROM pg_class WHERE oid=object_oid),'RLS enabled: '||object_name);
    FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','DELETE'] LOOP
      PERFORM pg_temp.assert_ok(has_table_privilege('authenticated',object_oid,privilege),'authenticated effective '||privilege||': '||object_name);
    END LOOP;
    FOREACH privilege IN ARRAY ARRAY['TRUNCATE','REFERENCES','TRIGGER'] LOOP
      PERFORM pg_temp.assert_ok(NOT has_table_privilege('authenticated',object_oid,privilege),'authenticated extra table privilege denied: '||object_name||' '||privilege);
    END LOOP;
    FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
      PERFORM pg_temp.assert_ok(NOT has_table_privilege('anon',object_oid,privilege),'anon effective table denied: '||object_name||' '||privilege);
    END LOOP;
    PERFORM pg_temp.assert_ok(NOT EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid=object_oid AND a.grantee=0),'no PUBLIC table ACL: '||object_name);
    PERFORM pg_temp.assert_ok(NOT EXISTS(SELECT 1 FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) acl WHERE a.attrelid=object_oid AND a.attnum>0 AND NOT a.attisdropped AND acl.grantee=0),'no PUBLIC column ACL: '||object_name);
    FOR column_name IN SELECT attname FROM pg_attribute WHERE attrelid=object_oid AND attnum>0 AND NOT attisdropped LOOP
      FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','REFERENCES'] LOOP
        PERFORM pg_temp.assert_ok(NOT has_column_privilege('anon',object_oid,column_name,privilege),'anon effective column denied: '||object_name||'.'||column_name||' '||privilege);
      END LOOP;
    END LOOP;
  END LOOP;
  PERFORM pg_temp.assert_ok(has_table_privilege('authenticated','public.game_rooms','UPDATE'),'game_rooms UPDATE retained');
  PERFORM pg_temp.assert_ok(has_table_privilege('authenticated','public.mission_templates','UPDATE'),'mission_templates UPDATE retained');
  PERFORM pg_temp.assert_ok(NOT has_table_privilege('authenticated','public.room_groups','UPDATE'),'room_groups full UPDATE denied including inheritance');
  FOR column_name IN SELECT attname FROM pg_attribute WHERE attrelid='public.room_groups'::regclass AND attnum>0 AND NOT attisdropped LOOP
    PERFORM pg_temp.assert_ok(has_column_privilege('authenticated','public.room_groups',column_name,'UPDATE')=(column_name=ANY(allowed_updates)),'exact room_groups update allowlist: '||column_name);
  END LOOP;
  -- Internal rows must stay inaccessible even if another role is inherited.
  FOR entry IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='physical_internal' AND c.relkind IN('r','p') LOOP
    FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
      PERFORM pg_temp.assert_ok(NOT has_table_privilege('anon',entry.oid,privilege) AND NOT has_table_privilege('authenticated',entry.oid,privilege),'private table denied: '||entry.relname||' '||privilege);
    END LOOP;
    FOR column_name IN SELECT attname FROM pg_attribute WHERE attrelid=entry.oid AND attnum>0 AND NOT attisdropped LOOP
      FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','REFERENCES'] LOOP
        PERFORM pg_temp.assert_ok(NOT has_column_privilege('anon',entry.oid,column_name,privilege) AND NOT has_column_privilege('authenticated',entry.oid,column_name,privilege),'private column denied: '||entry.relname||'.'||column_name);
      END LOOP;
    END LOOP;
  END LOOP;
  FOR entry IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='physical_internal' AND c.relkind='S' LOOP
    FOREACH privilege IN ARRAY ARRAY['USAGE','SELECT','UPDATE'] LOOP
      PERFORM pg_temp.assert_ok(NOT has_sequence_privilege('anon',entry.oid,privilege) AND NOT has_sequence_privilege('authenticated',entry.oid,privilege),'private sequence denied: '||entry.relname||' '||privilege);
    END LOOP;
  END LOOP;
END $$;

DO $$ DECLARE signature text; function_oid oid;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'authorize_classroom_teacher(text)','revoke_classroom_teacher()',
    'lookup_classroom(text)','join_secure_classroom(uuid,text,text)',
    'create_secure_classroom(text,uuid,text[])','get_classroom_invites(uuid)',
    'increment_classroom_score(uuid,integer,text)','purchase_classroom_buff(uuid)',
    'damage_classroom_boss(uuid,integer)','submit_classroom_mission(uuid,text)',
    'review_classroom_mission(uuid,text,boolean)','reset_group_scores(uuid)',
    'attack_group(uuid,uuid,integer)','apply_classroom_boss_damage(uuid,integer,text)',
    'logout_classroom()','claim_classroom_controller(uuid,uuid)',
    'classroom_effect(uuid,text,uuid,text)','get_classroom_device_codes(uuid)',
    'join_classroom_board(uuid,text)','recover_secure_classroom(text,text)',
    'save_guided_reflection(uuid,text,text)','set_classroom_help(uuid,boolean)',
    'create_guided_classroom(text,text,integer,integer,integer)',
    'join_classroom_with_short_pin(text)','join_classroom_short_pin_profile(text,integer,text)',
    'join_classroom_invite_profile(uuid,text,text,integer,text)',
    'complete_classroom_profile(uuid,uuid,integer,text)','get_my_classroom_profile(uuid)',
    'get_classroom_roster(uuid)','release_classroom_number(uuid,integer)'
  ] LOOP
    function_oid:=to_regprocedure('public.'||signature);
    PERFORM pg_temp.assert_ok(function_oid IS NOT NULL,'RPC exists: '||signature);
    PERFORM pg_temp.assert_ok(has_function_privilege('authenticated',function_oid,'EXECUTE'),'authenticated RPC execute: '||signature);
    PERFORM pg_temp.assert_ok(NOT has_function_privilege('anon',function_oid,'EXECUTE'),'anon RPC denied: '||signature);
    PERFORM pg_temp.assert_ok(NOT EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=function_oid AND a.grantee=0),'PUBLIC RPC denied: '||signature);
    PERFORM pg_temp.assert_ok((SELECT NOT prosecdef FROM pg_proc WHERE oid=function_oid),'public RPC remains invoker: '||signature);
  END LOOP;
  FOREACH signature IN ARRAY ARRAY['public.increment_score(uuid,integer)','public.buy_buff(uuid)','physical_internal.save_classroom_participant(uuid,uuid,integer,text)','physical_internal.check_group_identity()','physical_internal.assign_classroom_short_pin()','physical_internal.clear_finished_classroom_roster()'] LOOP
    function_oid:=to_regprocedure(signature);
    PERFORM pg_temp.assert_ok(function_oid IS NOT NULL,'internal dependency retained: '||signature);
    PERFORM pg_temp.assert_ok(NOT has_function_privilege('authenticated',function_oid,'EXECUTE') AND NOT has_function_privilege('anon',function_oid,'EXECUTE'),'raw helper execution denied: '||signature);
  END LOOP;
  -- Historical installations can contain text overloads as well as UUID ones.
  -- Test every retained overload without relying on search_path formatting.
  FOR function_oid IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN('increment_score','buy_buff') LOOP
    PERFORM pg_temp.assert_ok(NOT has_function_privilege('authenticated',function_oid,'EXECUTE') AND NOT has_function_privilege('anon',function_oid,'EXECUTE'),'all raw score/buff overloads denied');
  END LOOP;
END $$;
SELECT 'effective table/column/RPC privileges and RLS assertions passed' AS result;
ROLLBACK;
