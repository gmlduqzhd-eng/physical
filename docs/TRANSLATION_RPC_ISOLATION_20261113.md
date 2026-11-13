# 공유 번역 RPC의 권한 경계 정리

대상은 `gmlduqzhd-eng/physical`에 연결된 Supabase `tjrrtgdhtjdkofwqnxnz`다.
기준 소스는 `02ae02e3f348e00e7020dbc1f07b468b4401face`이며, 기존 번역 앱의 API와
교사·학생·TV 기능을 유지하면서 공개 SECURITY DEFINER 경고 24건을 줄이는 작업이다.

## 변경 방식과 보존 계약

`public`의 기존 12개 RPC를 SECURITY INVOKER 진입점으로 유지한다. 이름·OID·입력 이름/
타입·기본값·반환 열·실행 ACL·소유자·volatility/strict/cost/rows/parallel 속성은 보존한다.
변경하는 공개 함수 속성은 본문·언어(SQL)·실행 권한 방식·고정 search_path뿐이다.
일반 권한 진입점의 본문은 고정된 비공개 함수에 같은 인자를 전달하기만 한다.

기존 검증/업무 본문은 `translation_rpc_internal`로 복사한다. private 함수는 원래의
본문·소유자·SECURITY DEFINER·인자/반환/기본값·부가 속성·실행 ACL을 그대로 갖는다.
기존 작성자 코드/관리자 코드 검사와 앞서 고친 NULL 해시 거절도 유지한다.
테이블·기존 RLS·만료/복구·소유권·점수·명단·publication·cron·기본 권한은 바꾸지 않는다.

기존 공개 RPC에는 PUBLIC EXECUTE와 anon/authenticated/service_role의 명시 EXECUTE가
있었다. 그 SQL 호출자까지 보존하기 위해 새 스키마에 PUBLIC **USAGE만** 부여하고,
각 private 함수에는 기존 공개 함수와 같은 EXECUTE ACL을 개별 복제한다. CREATE나
테이블/시퀀스 권한은 추가하지 않는다. 표준 세 역할 외에 PUBLIC 권한을 받는 합성 SQL
역할로도 전후 호출을 검사한다. 권한을 일괄 회수해 경고를 숨기는 방식이 아니다.

스키마 USAGE와 Data API 노출은 별개다. private 스키마는 REST 노출 목록에 포함되면
안 된다. 실제 `Content-Profile` 요청이 `PGRST106`으로 거절되는지 아래 두 단계 사이와
완료 후 확인한다. 공개 주소 `/rest/v1/rpc/<기존 이름>`과 클라이언트 코드는 유지한다.

관련 공식 자료: [함수 권한과 안전한 실행](https://supabase.com/docs/guides/database/functions),
[Data API 보안](https://supabase.com/docs/guides/api/securing-your-api),
[CREATE OR REPLACE의 소유권/권한 보존](https://www.postgresql.org/docs/17/sql-createfunction.html).

## 대상 12개

| 공개 RPC | 반환 | 유지한 기본 인자 |
|---|---|---|
| admin_change_translation_password | boolean | 없음 |
| admin_list_case_reports | TABLE | 없음 |
| admin_list_translation_cases | TABLE | 없음 |
| admin_resolve_case_report | boolean | 없음 |
| admin_review_translation_case | jsonb | p_rejection_reason='' |
| check_translation_admin_password | boolean | 없음 |
| get_approved_translation_cases | TABLE | 없음 |
| get_my_translation_cases | TABLE | p_case_ids=NULL, p_author_passcode='' |
| remove_my_translation_case | boolean | 없음 |
| report_translation_case | boolean | p_requester_contact='' |
| resubmit_translation_case | jsonb | 없음 |
| submit_translation_case | jsonb | 없음 |

private 구현은 같은 이름/인자/반환을 가진다. 공개 함수는 모두 invoker, private 구현만
definer이며, 두 함수의 기존 호출자 실행 권한은 같다. private 함수의 REST 직접 호출은
노출 목록 단계에서 거절된다. 원래의 관리자/작성자 확인 없이 데이터 처리를 허용하지 않는다.

## 신규 마이그레이션과 적용 순서

두 파일은 CLI `migration new`로 생성했다. 기존 적용 마이그레이션은 편집/재실행하지 않는다.

1. `20261113135026_prepare_private_translation_rpc_schema.sql`
   - 12개 공유 RPC가 있는 경우에만 소유자 전용의 **빈 스키마**를 준비한다.
   - 처음에는 클라이언트 USAGE도 없다. 함수 본문을 복사하기 전에 노출 여부를 확인할 수 있다.
   - 예상하지 않은 객체/소유자/권한, 부분 설치는 중단한다.
2. 실제 REST profile 요청이 `PGRST106`인지 확인한다. 노출되어 있으면 다음 단계를 실행하지 않는다.
3. `20261113135028_isolate_shared_translation_rpc_implementations.sql`
   - 확인 후에만 해당 transaction에 `physical.translation_rpc_private_checked=on`을 설정한다.
   - 정확한 12개 본문 fingerprint, 전체 계약, ACL, 소유자, 안전한 search_path 조건을 검사한다.
   - 한 transaction에서 private 구현 복사 → 기존 public OID에 invoker 본문 반영 → 메타데이터
     비교 → 필요한 스키마 USAGE 부여를 완료한다. 실패하면 전체 rollback한다.
4. 기존 42개 이력을 보존하고 새 2개 canonical 버전만 실제 적용 사실에 맞게 기록한다.
   연결 도구가 자동 추가한 이번 실행용 wrapper 이력만 정확한 version/name으로 정리한다.
5. REST profile 거절·기존 공개 RPC·데이터/권한 보존·Advisor를 재확인하고 배포한다.

수동 SQL 작업의 두 번째 단계 예시이며, **profile 검증 후에만** 실행한다.

```sql
BEGIN;
SET LOCAL physical.translation_rpc_private_checked='on';
-- 이 transaction 안에서 20261113135028_isolate_shared_translation_rpc_implementations.sql 실행
COMMIT;
```

설정 플래그는 인증 수단이 아니라 운영자의 선행 노출 검사를 빠뜨리지 않게 하는 guard다.
실제 접근 경계는 API 노출 목록, 스키마/함수 ACL과 기존 본문 검증이다.
기존 정의나 STRICT 등의 부가 속성이 달라져도 승인 없이 덮어쓰지 않는다.

공유 기능이 전혀 없는 빈 physical 전용 DB는 두 파일 모두 다른 앱을 만들지 않고 건너뛴다.
빈 DB 설치기는 기본 스키마 이후 전체 **37개** migration을 오름차순으로 실행한다.
추후 다른 번역 앱 버전을 설치할 때는 이 fingerprint를 강제로 변경하지 말고 새 검토가 필요하다.

## 백업과 보존 검사

변경 전 70개 테이블/관련 catalog를 서버에서 공개키 암호화했다. 암호문 188,881 bytes이며
복호화·SHA256·테이블별 행 수/MD5를 확인했다. 개인키는 기존 DPAPI 보호 키를 재사용했다.
비밀·관리자 코드·실제 행·비밀 해시는 출력/커밋하지 않았다. managed/PITR 전체 복원은 미실행이다.

각 운영 단계는 제한된 SHARE lock/5초 lock 대기 아래 기존 행과 메타데이터를 전후 비교한다.
12개 공개 함수의 검토한 4개 속성만 정규화하며 나머지 OID·ACL·기본값·소유자·RLS·
다른 함수·역할 상속·trigger·제약·default ACL·publication·cron은 같아야 한다.
새 private 구현은 migration 안에서 원본 전체 메타데이터 및 ACL과 별도로 비교한다.
새 스키마에는 테이블/타입/예상 외 함수가 없어야 한다. 데이터/코드를 재생성하지 않는다.

## 검증 재현과 범위

운영 2단계 적용과 보존 비교를 통과했다. 기존 40개 수업방·221개 모둠·60,940점과
기존 migration 42개 행의 전체 MD5가 그대로다. 새 canonical 버전 2개만 추가했고,
단계별 연결 도구의 임시 wrapper 이력은 정확한 version/name으로 정리했다.
운영 테이블 행·관리자 코드/해시·확인 코드는 수정하지 않았다.

| 실제 검사 | 결과 |
|---|---|
| 자동 GRANT 없는 빈 DB → 기본 스키마/전체 37개 migration → SQL·RLS·권한 | 44개 결과 그룹 PASS |
| 앞선 health/NULL 해시 보완 회귀 | 37개 PASS |
| 공유 12개 RPC의 SQL/실제 Auth JWT·REST 전후 흐름, 반환 열·기본값·ACL/드리프트·노출 | 631개 PASS |
| 구현 분리 후 기존 교사·학생·TV JWT·REST/RPC·Realtime | 134개 PASS |
| 원래 public definer 상태를 복원한 합성 환경에서 운영용 두 단계 원자적 SQL | PASS, 모두 ROLLBACK |
| 운영 REST/거절/0행 공개 조회 | 적용 전 16개, 빈 스키마 단계 17개, 적용 후 17개 PASS |
| 로컬 ESLint / 운영 타깃 거절 및 private 설정 비노출 guard | PASS / 5개 PASS |

운영 public SECURITY DEFINER는 0개이며 새 비공개 구현은 정확히 12개다.
해당 공유 RPC의 두 역할 경고는 **24→0**, 전체 WARN은 **30→6**이다.
남은 경고는 필수 익명 RLS 3개·접근 차단된 cron 2개·유료 비밀번호 보호 1개로
이번에 변경하지 않았다. 기존 무정책 INFO 27개와 unused-index INFO 5개도 그대로다.
격리 native의 Security ERROR/WARN은 0이다. native에 합성 공유 테이블을 생성했으므로
그 fixture FK의 인덱스 누락 INFO 1개는 운영 결과와 구분한다. 운영의 기존 FK 인덱스는 유지된다.

`npm run test:db:translation -- /private/path/live-config.local`은 표식 있는 native
loopback Supabase만 허용한다. 운영 URL/.env를 읽거나 실제 관리자 코드로 검증하지 않는다.

- 실제 테이블 구조/제약과 기존 12개 정의를 합성 fixture로 설치한다. fixture는 한 guarded DO여서
  독립 실행 실수도 차단된다. SQL 역할 검사/드리프트 검사는 모두 rollback한다.
- 공개 조회·제출, 작성자 조회/재제출/삭제, 관리자 확인·목록·승인·반려·숨김·신고 처리·
  비밀번호 변경, 기본 인자, 반환 열, 잘못된 코드와 NULL 입력을 전후 실행한다.
- anon/authenticated/service_role/PUBLIC 상속 SQL 역할을 비교하고, 별도의 실제 Auth JWT와
  REST로 익명/로그인 호출을 전후 비교한다. REST는 빈 private 스키마 단계와 구현 설치 후
  모두 직접 profile 접근이 거절되어야 한다.
- public/extension CREATE 권한 확대, private STRICT 변경, 예상 외 테이블을 거절하고,
  재실행 시 OID/ACL을 포함한 결과가 같음을 검사한다.
- HTTP fixture는 격리 DB에만 commit한다. finally에서 합성 사례/신고/관리자 행·Auth 사용자만
  정리한다. 운영 데이터로 승인/편집/삭제/비밀번호 변경을 하지 않는다.
- 기존 SQL/교사·학생·TV JWT/REST/Realtime 회귀와 자동 GRANT 없는 신규 설치를 재사용한다.

소스/격리 DB/운영 읽기 검사/배포는 구분해 기록한다. 운영 관리자 정상 변경을 직접 시험하거나
물리 기기·AI 생성·장기 부하·운영 전체 복원을 검증한 결과는 아니다. 확인 코드 강도/남용 방지,
기존 다른 경고를 모두 해결했다는 뜻도 아니다.

실제 결과는 상위 폴더 `outputs/translation-rpc-isolation-20261113/`의 SQL/HTTP/보존·
Advisor·배포 기록을 따른다. private `.local`과 암호화 백업/키는 저장소·배포에서 제외한다.
