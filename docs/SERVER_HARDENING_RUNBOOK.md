# 서버 보완 적용 절차

기준: `gmlduqzhd-eng/physical`의 `96aa15b058fe8b0e6939ddf7c0cdc29b2ac498fe`.
작업 브랜치: `codex/server-hardening-20261113`.

최초 검토는 코드·SQL·테스트·문서와 격리 검증까지 진행했다. 이후 사용자의 명시 승인으로
2026-11-13 운영 DB에 신규 3개를 적용하고 실제 동작을 확인했다. 상세 결과와 백업 범위는
[운영 적용 기록](SERVER_HARDENING_PRODUCTION_20261113.md)을 따른다. 기존 작업 폴더의
미커밋 변경을 유지했으며 운영 초기화 및 비밀 교체는 수행하지 않았다.

## 1. 변경 범위

| 순서 | 파일 | 목적 |
|---|---|---|
| 1 | `supabase/migrations/20261113091515_repair_boss_retry_reference.sql` | 보스 중복 action 조회 한 줄만 수정. 기존 함수 소유자·OID·권한·부가 속성 보존 |
| 2 | `supabase_schema.sql`, `supabase/bootstrap/`, `supabase/install_empty.psql` | 파괴적 구형 초기화 차단, 빈 DB 전용 설치 |
| 2 | `20261113091733_explicit_core_data_api_grants.sql` | 최신 RLS·인증 helper를 검증한 뒤 핵심 테이블 최소 권한만 명시 |
| 3 | `src/presentation/TeacherStudioEntry.tsx` | 종료된 공유 코드 대신 Google 로그인 안내 |
| 4 | `20261113092338_optimize_classroom_policy_and_fk_indexes.sql` | 6개 정책에서 UID만 문장 단위 캐시, 외래키 인덱스 보완 |
| 5 | 이 문서·권한 매트릭스·검증 보고서 | 최신 작업 기준과 신규/기존 DB 적용 절차 분리 |

기존 30개 migration은 수정하지 않았다. Google 교사 자격, 소유권, 학생/TV 권한,
점수 승인 기본값, 만료·결과 조회·복구·명단 삭제·7일 보관 정책을 바꾸지 않았다.

## 2. 빈 Supabase DB 신규 설치

운영 DB 및 기존 앱이 있는 DB에서는 실행하지 않는다. 다음 조건을 먼저 확인한다.

- 공식 Supabase Auth 스키마·`auth.uid()`·client role이 이미 있어야 한다.
- 애플리케이션 `public` 테이블/함수/타입, `physical_internal`,
  `physical_studio_limits`, 적용된 앱 migration 이력이 없어야 한다.
- `pgcrypto`가 `extensions`에 제공되고 `pg_cron`을 사용할 수 있어야 한다.
  기존 확장 위치를 자동 변경하거나 다른 프로젝트의 설정을 대체하지 않는다.
- 연결 대상과 생성 역할을 확인한다. 테스트 검증은 `postgres`로 실행했다.
  자동 GRANT가 없어도 작동하며 global/schema 기본 권한을 설치 파일이 바꾸지 않는다.

비밀 값은 출력·명령 로그·저장소에 남기지 말고, 대상 DB의 `PGHOST`, `PGPORT`,
`PGDATABASE`, `PGUSER`, `PGPASSFILE`을 별도 안전한 환경에서 지정한다.

```sh
psql -X -v ON_ERROR_STOP=1 -f supabase/install_empty.psql
```

실행 순서는 기본 스키마 → 파일명 오름차순의 기존 30개 migration → 첫 보완 3개 →
후속 Advisor 보완 2개 → finalization이다. 총 35개이며 전체가 한 transaction에서 실행되고
오류 시 전부 rollback된다. 후속 항목은 [Advisor 보완 기록](SECURITY_ADVISOR_REVIEW_20261113.md)을 따른다.
초기 테이블은 RLS가 켜져 있고 client 접근은 닫혀 있다. 기존 migration이 일시적으로
생성하는 과거 ledger 정책 4개도 commit 전에 제거된다. 이전 migration을 편집하거나
중간 상태를 외부에 공개하지 않는다.

기본 스키마는 점수 RPC가 참조하는 UUID/text overload를 invoker·client 실행 금지로
유지한다. 최신 migration이 참조하는 폐기 테이블 두 개도 빈 상태·RLS·접근 차단으로
만든다. 운영 데이터를 옮기거나 기본 데이터·교사 계정·bootstrap 해시를 생성하지 않는다.

기존 Realtime publication의 옵션·타 기능 등록을 보존하며, 없는 앱 테이블 등록만
추가한다. publication 전체를 삭제하거나 재생성하지 않는다.

### psql 설치 후 이력 등록

이 설치기는 SQL 스키마를 설치하며 Supabase CLI migration 이력을 임의로 조작하지
않는다. 위 설치가 **새 DB에서 전부 성공했음을 확인한 뒤에만** 설치한 35개 버전을
CLI 이력에 등록한다. 그렇지 않으면 이후 `db push`가 기존 파일을 다시 실행할 수 있다.
확인한 CLI 2.102.0의 `migration repair --help`는 여러 version과 `--status applied`,
`--db-url`을 지원한다. 다른 버전은 먼저 `--help`를 확인한다.

```powershell
# 새 DB 설치 성공 후 전용 세션에서만 사용. URL은 private 환경 변수이며 출력하지 않는다.
$versions = Get-ChildItem supabase/migrations -Filter '*.sql' |
  Sort-Object Name | ForEach-Object { $_.BaseName.Split('_')[0] }
supabase migration repair @versions --status applied --db-url $env:PHYSICAL_NEW_DB_URL
supabase migration list --db-url $env:PHYSICAL_NEW_DB_URL
```

최초 격리 단계에서는 33개 이력 등록과 일치 여부를 검증했다. 후속 2개 적용과
현재 운영 이력은 각 운영 기록을 따른다. 기존 운영 DB에 위 전체 등록 명령을 사용하지 않는다.
신규 환경의 서버 비밀·관리자 프로비저닝은 기존 보안 절차로 별도 구성한다. 운영 비밀을
테스트 환경에 복제하거나 재생성하지 않는다.

## 3. 기존 운영 DB의 업그레이드 순서

1. 최신 백업과 복원 절차, 실제 migration 이력·정책·함수·상속·기본 권한을 확인한다.
   특히 초기 migration의 저장된 timestamp와 저장소 파일명이 일부 다르므로
   `db push`나 과거 migration 일괄 재실행으로 맞추지 않는다.
2. 기존 `supabase_schema.sql`, `install_empty.psql`, bootstrap을 실행하지 않는다.
3. 검토한 **신규 3개만**, 아래 순서로 하나의 transaction에서 적용한다.

```sh
psql -X -v ON_ERROR_STOP=1 --single-transaction \
  -f supabase/migrations/20261113091515_repair_boss_retry_reference.sql \
  -f supabase/migrations/20261113091733_explicit_core_data_api_grants.sql \
  -f supabase/migrations/20261113092338_optimize_classroom_policy_and_fk_indexes.sql
```

4. 성공 후 새 3개 버전만 실제 적용 사실에 맞게 migration 이력에 등록하고 조회한다.
   과거 이력을 광범위하게 수정하지 않는다. 앱 배포도 해당 작업의 승인 범위를 확인한다.
5. 실제 교사/학생/TV 흐름과 hosted Advisor를 확인한다. 서버 비밀·bootstrap 해시·
   소유권은 교체하지 않는다. guard가 실패하면 전체 rollback 후 drift를 검토한다.
   guard를 제거하거나 fingerprint를 임의로 바꿔 통과시키지 않는다.

외래키 인덱스 6개는 이 앱 대상이다. 공유 DB의 `translation_case_reports`가 있으면
`case_id → translation_lesson_cases` FK를 확인하고 인덱스 하나만 추가한다. 없으면
건너뛰며 다른 앱 테이블을 만들지 않는다. 해당 FK/인덱스 이름이 다르면 중단한다.
기존 정상 인덱스를 삭제하지 않는다. 인덱스 생성은 일반 transaction 방식이며
lock 획득은 5초로 제한된다. 큰 테이블의 장기 점유 여부는 운영 적용 전에 확인한다.

## 4. 권한 및 보존 기준

- `authenticated`는 교사라는 뜻이 아니다. 기존 Google/교사 접근·소유권·멤버십·
  만료 확인 함수를 그대로 사용한다. 신규 GRANT는 helper 정의와 12개 RLS 정책을 검사한다.
- core 테이블의 `anon`/`PUBLIC` 직접 접근, `room_groups` 전체 UPDATE,
  `score`·`help_requested_at` 직접 UPDATE를 추가하지 않는다.
- 내부 테이블·시퀀스·전체 함수·`service_role`에 일괄 권한을 주지 않는다.
- 보스 본문은 알려진 수정 전/후 정의만 허용한다. 소유자·ACL·cost·parallel 등의
  기존 속성은 `pg_get_functiondef` + `CREATE OR REPLACE`로 보존한다.
- 성능 변경은 6개 RLS의 `auth.uid()`를 `(select auth.uid())`로 바꾸는 것뿐이다.
  행에 의존하는 소유권·멤버십 함수를 문장 전체 상수로 바꾸지 않는다.
- 수업 종료 시 명단 삭제, 결과 읽기, 수업/TV/교사 만료, 복구, 자동 보관 삭제,
  신규 방의 점수 승인 기본값은 변경하지 않는다.

세부 권한은 [권한 매트릭스](SERVER_HARDENING_PERMISSION_MATRIX.md), 실제 실행 결과는
[검증 보고서](SERVER_HARDENING_VERIFICATION.md)를 따른다.

## 5. 격리 검증 재현

테스트는 무료 로컬 native Supabase의 새 stack만 허용한다. 운영 `.env`, 프로젝트 링크,
토큰을 읽지 않는다. 실제 Auth JWT/REST/Realtime를 사용하는 테스트이며 hosted 증거는 아니다.
빈 native stack은 API `127.0.0.1:54331`, DB `127.0.0.1:54332`를 사용한다.
전용 `physical_api_test_environment` 스키마 comment가
`physical-hardening-native-20261113`인 환경만 허용한다. 일반 DB에 임의로 이 표식을
추가하여 테스트하지 않는다.

private `live-config.local`은 해당 새 stack의 status에서 생성한다. 구조는 다음과 같다.

```json
{
  "apiUrl": "http://127.0.0.1:54331",
  "dbUrl": "<해당 새 stack의 private loopback DB URL>",
  "anonKey": "<해당 새 stack의 client key>",
  "environmentMarker": "physical-hardening-native-20261113",
  "runtime": "native"
}
```

```sh
npm ci --ignore-scripts
npm run test:db:hardening -- /absolute/path/live-config.local
npm run test:db:hardening:live -- /absolute/path/live-config.local
node scripts/inspect-server-hardening.mjs /absolute/path/live-config.local /absolute/path/supabase
```

첫 명령은 새 DB 설치와 업그레이드 비교를 포함한다. 이미 설치한 빈 테스트 DB의 SQL
회귀만 다시 확인하려면 `--verify`를 추가한다. 전체 설치 재검증에는 별도의 새 stack을
사용하며 기존 DB를 reset/drop하지 않는다.

SQL fixture는 전부 rollback한다. 실제 HTTP는 여러 세션이므로 합성 UUID의 사용자·방만
commit하고 finally에서 정리한다. 이 테스트용 bootstrap은 빈 테스트 DB에만 임시로
생성하고 제거하며 운영 bootstrap과 무관하다. 테스트 후 Auth 사용자·방·bootstrap
0행 및 다른 기능의 합성 행/publication 보존을 확인한다.

참고: [RLS의 문장 단위 UID 캐시](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select),
[명시 GRANT와 RLS](https://supabase.com/docs/guides/api/securing-your-api),
[CREATE OR REPLACE FUNCTION의 권한 보존](https://www.postgresql.org/docs/17/sql-createfunction.html).
