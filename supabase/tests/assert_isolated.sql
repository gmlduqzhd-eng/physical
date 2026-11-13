-- Test runners verify loopback before setting this session flag. No app URLs.
DO $$ BEGIN
  IF current_setting('physical.test_database',true) IS DISTINCT FROM 'on'
    OR NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='physical_api_test_environment'
      AND obj_description(oid,'pg_namespace')='physical-hardening-native-20261113') THEN
    RAISE EXCEPTION 'Dedicated isolated test database required';
  END IF;
END $$;
