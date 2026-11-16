# 비밀지도 QR 계속 쓰기 · 학급 보스 두 관문 (2026-11-16)

교사 승인: 2026-11-16 ("하지 않은것 승인합니다"). 운영 DB 변경이 들어 있다.

## 바뀌는 것

1. **비밀지도 지점 QR을 다시 인쇄하지 않는다.** 새 원정을 열면 같은 교사 계정(`game_rooms.teacher_id`)의 가장 최근 지점 코드를 다시 쓴다. 다른 수업방에서 열어도 같다. 처음 여는 원정, 또는 교사 정보가 없는 옛 수업방만 새 무작위 코드를 만든다. 스캔하면 지금 원정의 코드와 대조하는 방식은 그대로다. 다른 교사에게는 이 코드가 가지 않는다.
2. **학급 보스 원정에 '지도 → 리듬' 두 관문 경로(`simple`)를 더한다.** 화면은 새 보스 원정에 이 경로를 기본으로 보낸다. 세 관문 경로(`balanced`·`rescue`·`shadow`)는 원정 편집기에서 그대로 고를 수 있다. 설정 없이 시작하는 호출의 서버 기본값은 그대로 `balanced`다.
3. 보스 원정이 관문 수를 3으로 고정하던 두 곳(현재 관문, 완료 판정)이 경로 길이를 따른다.

진행 중인 원정의 코드·경로는 바뀌지 않는다. 테이블·ACL·RLS·GRANT·publication 변경은 없다.

## 파일

- `supabase/migrations/20261116020000_reusable_map_stations_and_two_gate_boss.sql`
  - `physical_internal.expedition_settings`: 허용 경로에 `simple` 추가 (본문 지문 222b207d… → 3b208561…).
  - `physical_internal.expedition_action`: 지점 코드 재사용, 관문 수를 경로 길이로 (지문 8dc92ac1… → 4d2df5d9…).
  - `physical_internal.expedition_route`: `simple` = 지도 → 리듬.
  - 지문이 예상과 다르면 아무것도 바꾸지 않고 멈춘다. 이미 적용된 상태면 건너뛴다(다시 실행해도 안전).
- `supabase/tests/map_stations_and_simple_boss.sql`: 같은 교사·다른 수업방 코드 유지, 다른 교사 분리, 두 관문 진행과 완료, 서버 기본값 유지.
- 화면: 경로 목록·관문 이름·관문 수, 안내판 문구, 서버가 `simple`을 거절하면 같은 설정을 `balanced`로 한 번 더 보내는 안전장치.

## 운영 DB에 적용하는 순서

이 작업 공간에는 운영 DB 연결 정보가 없어 적용하지 못했다. 아래 순서로 적용한다.

1. 백업과 복원 절차를 확인한다.
2. 앞선 마이그레이션 `20261115094331_cooperative_map_and_group_support.sql`이 운영에 적용되어 있는지 확인한다. 아래 결과가 `8dc92ac12c3a3228a5a55ab57980da8d`(적용 전) 또는 `4d2df5d937f7c322aa2b49eb1b934d0c`(이미 적용)이어야 한다.

   ```sql
   SELECT md5(replace(prosrc,E'\r\n',E'\n')) FROM pg_proc WHERE oid='physical_internal.expedition_action(uuid,text,text,uuid,jsonb)'::regprocedure;
   ```
3. 한 transaction으로 적용한다.

   ```sh
   psql -X -v ON_ERROR_STOP=1 --single-transaction -f supabase/migrations/20261116020000_reusable_map_stations_and_two_gate_boss.sql
   ```
4. migration 이력에 이 버전 하나만 등록한다(`supabase migration repair 20261116020000 --status applied`). 과거 이력은 건드리지 않는다.
5. 그 다음에 앱(PR)을 병합해 배포한다. 순서가 바뀌어도 화면의 안전장치가 세 관문으로 시작하므로 원정 시작이 막히지는 않는다.
6. 확인: 비밀지도 원정을 두 번 열어 안내판 QR이 같은지, 학급 보스가 두 관문 뒤에 "기지 복원"으로 끝나는지.

## 검증

로컬 PostgreSQL 16에 저장소의 빈 DB 설치 스크립트로 전체 스키마를 만들고(Supabase 인증·역할·pg_cron은 시험용 대역) 확인했다.

- 오늘 상태 스키마 + 이 마이그레이션 한 transaction 적용 → 두 번째 적용은 건너뜀.
- `flagship_expeditions`, `expedition_workshop`, `expedition_review_guards`, 새 `map_stations_and_simple_boss` 통과.
- 빈 DB 설치(이 마이그레이션 포함)도 통과.
- 앱 `verify:release` 통과.
