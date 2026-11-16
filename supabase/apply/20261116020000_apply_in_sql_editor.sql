-- ================================================================
-- Supabase SQL Editor에 이 파일 전체를 붙여 넣고 Run을 한 번 누른다.
-- 하나라도 실패하면 전체가 취소되고 아무것도 바뀌지 않는다.
-- 마지막 결과 표에서 action_ok, settings_ok, route_ok가 모두 true면 성공이다.
-- ================================================================
BEGIN;

-- 0. 사전 확인: 앞선 마이그레이션(2026-11-15 협동 지도)까지 적용된 운영 DB인지 확인한다.
DO $precheck$ BEGIN
 IF to_regprocedure('physical_internal.expedition_action(uuid,text,text,uuid,jsonb)') IS NULL THEN
  RAISE EXCEPTION '원정 함수가 없습니다. 땀방울 원정대 운영 DB가 맞는지 확인하세요.';
 END IF;
 IF (SELECT md5(replace(prosrc,E'\r\n',E'\n')) FROM pg_proc WHERE oid='physical_internal.expedition_action(uuid,text,text,uuid,jsonb)'::regprocedure)
    NOT IN ('8dc92ac12c3a3228a5a55ab57980da8d','4d2df5d937f7c322aa2b49eb1b934d0c') THEN
  RAISE EXCEPTION '원정 함수가 예상과 다릅니다. 2026-11-15 협동 지도 마이그레이션(20261115094331)이 적용됐는지 먼저 확인하세요. 아무것도 바뀌지 않았습니다.';
 END IF;
END $precheck$;

-- 1. 마이그레이션 본문 (supabase/migrations/20261116020000_reusable_map_stations_and_two_gate_boss.sql 과 같다)
-- 2026-11 게임 점검 후속 (교사 승인: 2026-11-16).
-- 1) 움직이는 비밀지도의 지점 QR을 다시 인쇄하지 않아도 되게: 새 원정은 같은 교사 계정의 가장 최근 지점 코드를 다시 쓴다.
--    처음 여는 원정(또는 교사 정보가 없는 옛 수업방)만 새 무작위 코드를 만든다. 코드 확인 방식은 그대로다(현재 원정 설정과 대조).
-- 2) 학급 보스 원정에 '지도 → 리듬' 두 관문 경로(simple)를 더한다. 화면은 새 원정에 이 경로를 기본으로 보낸다.
--    설정 없이 시작하는 호출의 서버 기본값은 그대로 세 관문(balanced)이라, 예전 원정과 화면의 해석이 어긋나지 않는다.
--    관문 수를 3으로 고정하던 두 곳(현재 관문, 완료 판정)을 경로 길이를 따르게 고친다.
-- 새 원정에만 적용된다. 진행 중인 원정의 코드·경로는 바뀌지 않는다. 테이블·ACL·RLS·GRANT·publication 변경 없음.
DO $migration$
DECLARE fn oid; raw_body text; current_body text; new_body text; definition text;
BEGIN
 -- 1. 설정: simple 경로 허용 (기본값은 그대로 balanced)
 fn:=to_regprocedure('physical_internal.expedition_settings(jsonb)');
 IF fn IS NULL THEN RAISE EXCEPTION 'expedition_settings missing; review before applying'; END IF;
 SELECT prosrc INTO raw_body FROM pg_proc WHERE oid=fn;
 current_body:=replace(raw_body,E'\r\n',E'\n');
 IF md5(current_body)<>'3b208561c63fa1190f0999a14ee517ce' THEN
  IF md5(current_body)<>'222b207d9a23ca1bd05193bda4cfa87c' THEN RAISE EXCEPTION 'Expedition settings changed; review before applying'; END IF;
  new_body:=replace(current_body,$before$NOT IN ('balanced','rescue','shadow')$before$,$after$NOT IN ('simple','balanced','rescue','shadow')$after$);
  IF md5(new_body)<>'3b208561c63fa1190f0999a14ee517ce' THEN RAISE EXCEPTION 'Incomplete expedition settings patch'; END IF;
  definition:=pg_get_functiondef(fn);EXECUTE replace(definition,raw_body,new_body);
 END IF;

 -- 2. 원정 진행: 지점 코드 재사용, 관문 수를 경로 길이로
 fn:=to_regprocedure('physical_internal.expedition_action(uuid,text,text,uuid,jsonb)');
 IF fn IS NULL OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=fn AND prosecdef) THEN RAISE EXCEPTION 'expedition_action missing or not security definer; review before applying'; END IF;
 SELECT prosrc INTO raw_body FROM pg_proc WHERE oid=fn;
 current_body:=replace(raw_body,E'\r\n',E'\n');
 IF md5(current_body)<>'4d2df5d937f7c322aa2b49eb1b934d0c' THEN
  IF md5(current_body)<>'8dc92ac12c3a3228a5a55ab57980da8d' THEN RAISE EXCEPTION 'Expedition definition changed; review before applying'; END IF;
  new_body:=replace(current_body,
$before$  codes:=jsonb_build_object('forest',encode(extensions.gen_random_bytes(12),'hex'),'river',encode(extensions.gen_random_bytes(12),'hex'),'tower',encode(extensions.gen_random_bytes(12),'hex'));$before$,
$after$  -- Station QR sheets stay valid: reuse this teacher's latest station codes; a first run gets new random codes.
  codes:=coalesce((SELECT x.config->'codes' FROM physical_internal.expeditions x JOIN public.game_rooms gr ON gr.id=x.room_id
    WHERE r.teacher_id IS NOT NULL AND gr.teacher_id=r.teacher_id AND jsonb_typeof(x.config->'codes')='object'
      AND coalesce(x.config->'codes'->>'forest','')~'^[0-9a-f]{24}$' AND coalesce(x.config->'codes'->>'river','')~'^[0-9a-f]{24}$' AND coalesce(x.config->'codes'->>'tower','')~'^[0-9a-f]{24}$'
    ORDER BY x.started_at DESC LIMIT 1),
   jsonb_build_object('forest',encode(extensions.gen_random_bytes(12),'hex'),'river',encode(extensions.gen_random_bytes(12),'hex'),'tower',encode(extensions.gen_random_bytes(12),'hex')));$after$);
  new_body:=replace(new_body,$before$route[least(3,e.phase+1)]$before$,$after$route[least(cardinality(route),e.phase+1)]$after$);
  new_body:=replace(new_body,$before$   g:=g||jsonb_build_object('done',e.phase=3);
  END IF;$before$,$after$   g:=g||jsonb_build_object('done',e.phase>=cardinality(route));
  END IF;$after$);
  IF md5(new_body)<>'4d2df5d937f7c322aa2b49eb1b934d0c' THEN RAISE EXCEPTION 'Incomplete expedition patch'; END IF;
  definition:=pg_get_functiondef(fn);EXECUTE replace(definition,raw_body,new_body);
 END IF;
END;
$migration$;

-- 3. 경로: simple = 지도 → 리듬. 소유자·권한은 CREATE OR REPLACE가 그대로 유지한다.
CREATE OR REPLACE FUNCTION physical_internal.expedition_route(config jsonb)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 SELECT CASE config->'settings'->>'route' WHEN 'simple' THEN ARRAY['expedition-map','expedition-loop']
 WHEN 'rescue' THEN ARRAY['expedition-map','expedition-rescue','expedition-loop']
 WHEN 'shadow' THEN ARRAY['expedition-map','expedition-ship','expedition-shadow'] ELSE ARRAY['expedition-map','expedition-ship','expedition-loop'] END;
$function$;

-- 2. 마이그레이션 이력 등록 (이미 있으면 건너뛴다)
DO $history$ BEGIN
 IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
  INSERT INTO supabase_migrations.schema_migrations(version,name)
  VALUES('20261116020000','reusable_map_stations_and_two_gate_boss') ON CONFLICT (version) DO NOTHING;
 END IF;
END $history$;

COMMIT;

-- 3. 결과 확인: 세 칸이 모두 true면 성공
SELECT
 (SELECT md5(replace(prosrc,E'\r\n',E'\n'))='4d2df5d937f7c322aa2b49eb1b934d0c' FROM pg_proc WHERE oid='physical_internal.expedition_action(uuid,text,text,uuid,jsonb)'::regprocedure) AS action_ok,
 (SELECT md5(replace(prosrc,E'\r\n',E'\n'))='3b208561c63fa1190f0999a14ee517ce' FROM pg_proc WHERE oid='physical_internal.expedition_settings(jsonb)'::regprocedure) AS settings_ok,
 physical_internal.expedition_route('{"settings":{"route":"simple"}}'::jsonb)=ARRAY['expedition-map','expedition-loop'] AS route_ok;
