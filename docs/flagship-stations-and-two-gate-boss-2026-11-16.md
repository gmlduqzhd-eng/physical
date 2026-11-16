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

## 운영 DB에 적용하는 순서 (Supabase 화면에서)

준비한 파일 두 개:
- 적용: `supabase/apply/20261116020000_apply_in_sql_editor.sql` — 사전 확인 → 마이그레이션 → 이력 등록 → 결과 확인을 한 번에 한다. 하나라도 실패하면 전체가 취소된다. 두 번 실행해도 안전하다.
- 되돌리기: `supabase/rollback/20261116020000_reusable_map_stations_and_two_gate_boss.rollback.sql` — 세 함수를 적용 전 정의로 되돌린다.

1. **수업이 없는 시간에 한다.** 진행 중인 원정에는 영향이 없지만, 확인까지 10분쯤 여유를 둔다.
2. **백업을 확인한다.** Supabase 대시보드 → 프로젝트 → Database → Backups에서 최근 백업 날짜를 본다. 백업이 없는 요금제라도 아래 되돌리기 파일로 세 함수를 원래대로 돌릴 수 있다.
3. **적용 파일을 연다.** GitHub의 PR #39 → Files changed → `supabase/apply/20261116020000_apply_in_sql_editor.sql` → 오른쪽 위 `…` → View file → Raw → 전체 선택해 복사.
4. **SQL Editor에 붙여 넣는다.** 대시보드 왼쪽 SQL Editor → New query → 붙여 넣기 → Run.
   - "destructive operation" 확인 창이 뜨면 내용을 확인하고 실행한다(함수 교체 때문에 뜰 수 있다).
5. **결과를 본다.** 아래 결과 표의 `action_ok`, `settings_ok`, `route_ok`가 모두 `true`면 성공이다.
   - "원정 함수가 예상과 다릅니다"가 나오면 아무것도 바뀌지 않은 것이다. 11월 15일 마이그레이션(`20261115094331_cooperative_map_and_group_support.sql`)이 운영에 먼저 적용돼야 한다. 그 상태를 알려 주면 순서를 다시 정한다.
6. **PR #39를 병합한다.** 병합하면 사이트가 자동으로 배포된다.
7. **수업 화면에서 확인한다.**
   - 교사 화면에서 비밀지도 원정을 열고 탐사 지점 안내판의 QR(아래 코드 글자)을 본 뒤, 원정을 한 번 더 열어 같은 코드인지 본다.
   - 학급 보스 원정을 열어 "1관문 · 비밀길 연결 → 2관문 · 리듬 발전" 두 관문으로 끝나는지 본다.

### 문제가 생기면 (되돌리기)

SQL Editor → New query에 되돌리기 파일 전체를 붙여 넣고 Run. 이력에서도 지우려면 이어서 실행한다:

```sql
DELETE FROM supabase_migrations.schema_migrations WHERE version='20261116020000';
```

되돌린 뒤에도 앱은 세 관문으로 자동 전환해 원정을 시작하므로, PR #39를 이미 병합했어도 원정이 막히지 않는다.

### 명령줄을 쓰는 경우

Database 비밀번호와 연결 주소(대시보드 → Connect → Session pooler)가 있으면:

```sh
psql "postgresql://postgres.<프로젝트ID>:<비밀번호>@<지역>.pooler.supabase.com:5432/postgres" -X -v ON_ERROR_STOP=1 -f supabase/apply/20261116020000_apply_in_sql_editor.sql
```

## 검증

로컬 PostgreSQL 16에 저장소의 빈 DB 설치 스크립트로 전체 스키마를 만들고(Supabase 인증·역할·pg_cron은 시험용 대역) 확인했다.

- 오늘 상태 스키마 + 이 마이그레이션 한 transaction 적용 → 두 번째 적용은 건너뜀.
- `flagship_expeditions`, `expedition_workshop`, `expedition_review_guards`, 새 `map_stations_and_simple_boss` 통과.
- 빈 DB 설치(이 마이그레이션 포함)도 통과.
- 앱 `verify:release` 통과.
- SQL Editor용 적용 파일: 오늘 상태 스키마에서 첫 실행 성공(세 칸 true)·두 번째 실행 무해·이력 한 줄 등록.
- 되돌리기 파일: 적용 → 되돌리기 → 세 함수 지문이 적용 전과 같음, 권한 유지, 다시 적용 가능.
