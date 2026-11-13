# 남은 Security Advisor 점검과 안전 보완

대상: `gmlduqzhd-eng/physical`, Supabase `tjrrtgdhtjdkofwqnxnz`.
기준 HEAD `0792fec817896c98eaa7ebcd222e8368063f0c64`. 운영 기존 40개 방·221개 모둠·
60,940점에는 이전 단계에서 종료한 합성 시험 방 1개/2,000점이 포함된다.
초기화·운영 비밀/확인 코드/해시 교체·사용자 데이터 정리는 이 작업의 범위가 아니다.

## 경고 분류

| 항목 | 점검 전 | 처리와 근거 |
|---|---:|---|
| public 상태 확인 SECURITY DEFINER | WARN 1 | 관계 존재 여부만 반환하므로 catalog 조회 + SECURITY INVOKER로 축소 |
| 공유 번역 RPC의 anon/authenticated SECURITY DEFINER | WARN 24 | 12개 RPC × 2역할. 공개 조회/제출과 확인 코드로 보호된 관리자·작성자 API다. 실행 권한을 일괄 회수하면 다른 앱이 중단된다. 아래 NULL 우회만 기존 계약 안에서 보완 |
| 익명 로그인 관련 앱 RLS | WARN 3 | 학생·TV가 실제 Auth 익명 JWT를 사용한다. 소유권/교사 자격/멤버십/만료 조건을 유지하고 역할 이름만으로 교사로 취급하지 않음 |
| cron RLS | WARN 2 | anon/authenticated에 cron 스키마 USAGE가 없어 직접 쿼리가 거절됨. 관리형 확장 정책을 재작성하지 않음 |
| 유출 비밀번호 보호 | WARN 1 | Pro 이상 기능. 비용 없이 제공할 수 없어 켜지 않음. 점검 시 운영 Auth 비밀번호 계정은 0개 |
| RLS 켜짐·정책 없음 | INFO 27 | 내부 RPC 전용/폐기/공유 기능 테이블. 허용 정책을 추가하지 않음 |

운영에서 두 클라이언트 역할로 위 무정책 테이블과 cron을 58개 조합으로 검사했다.
권한 거절 또는 RLS로 비공개 행이 보이지 않음을 확인했고 모두 ROLLBACK했다.
테이블 ACL의 PUBLIC SELECT가 있어도 스키마 USAGE가 없으면 cron에 접근할 수 없다.
경고 개수를 줄이려고 익명 로그인을 끄거나 내부 테이블에 allow-all 정책을 추가하지 않는다.

관련 공식 안내:
[익명 로그인과 authenticated 역할](https://supabase.com/docs/guides/auth/auth-anonymous),
[Security Advisor](https://supabase.com/docs/guides/observability/advisors),
[유출 비밀번호 보호 요금제](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## 신규 마이그레이션과 변경 이유

1. `20261113123020_reduce_health_rpc_privileges.sql`
   - `classroom_service_health()`를 SECURITY INVOKER로 변경한다.
   - private schema USAGE가 없어도 기존 bool 결과를 유지하도록 pg_catalog에서 존재 여부만 확인한다.
   - 인자/반환형/STABLE/고정 search_path/OID/소유자/실행 ACL을 보존한다.
     anon·service_role의 기존 실행 권한과 authenticated 실행 거절도 그대로다.
2. `20261113123026_reject_missing_translation_author_hash.sql`
   - `remove_my_translation_case`·`resubmit_translation_case`에서 NULL 해시의 `<>` 비교가
     UNKNOWN이 되어 인증 실패 분기를 건너뛰는 문제를 거절 조건으로 고친다.
   - 기존 해시가 있는 정상 코드의 동작은 유지한다. 어떤 행/해시도 갱신하거나 생성하지 않는다.
   - 공유 함수가 모두 없는 physical 전용 DB는 아무것도 생성하지 않는다.
     부분 설치·예상하지 않은 정의/search_path는 중단한다.

두 파일은 CLI `migration new`로 생성했다. 기존 적용 migration은 변경하지 않았다.
변경 전/후 본문 fingerprint를 제한하고 pg_get_functiondef를 재사용해 함수 부가 속성을 유지한다.
서버 구조를 교체하거나 새로운 권한·테이블·시퀀스·확장·publication을 만들지 않는다.

## 백업·보존·적용 방법

운영 적용 전 70개 테이블과 catalog를 서버에서 공개키 암호화해 추가 백업했다.
암호문 187,413 bytes. 개인키는 기존 DPAPI 보호 키를 재사용했고 저장소에 넣지 않았다.
이번 snapshot의 복호화·SHA256 및 70개 테이블 행 수/MD5를 확인했다.
managed/PITR 전체 복원 시험은 수행하지 않았다.

운영 보완은 **기존 3개 보완이 적용된 환경에서 아래 2개만** 순서대로 한 transaction에서 실행한다.

```sh
psql -X -v ON_ERROR_STOP=1 --single-transaction \
  -f supabase/migrations/20261113123020_reduce_health_rpc_privileges.sql \
  -f supabase/migrations/20261113123026_reject_missing_translation_author_hash.sql
```

기존 초기화/설치 파일과 과거 migration은 운영에서 재실행하지 않는다.
연결 도구로 적용할 때도 동일 원문을 묶고, 정확한 2개 버전/이름/statements를 기록한다.
도구가 자동 등록한 이번 실행용 wrapper 이력만 확인 후 정리하며 기존 40개 이력은 보존한다.
`db push`로 과거 timestamp 차이를 자동 수정하지 않는다.

적용 묶음은 제한된 SHARE lock/5초 lock 대기 아래 전후 snapshot을 비교한다.
정확한 3개 함수의 검토한 변경만 정규화하고, 모든 행과 나머지 함수·ACL·역할 상속·
RLS·만료/복구·기본 권한·trigger·제약·publication·cron은 같아야 한다. 다르면 전체 rollback한다.

## 검증 및 재현

운영 2개 보완 적용과 전후 보존 검사를 통과했다. 40개 방·221개 모둠·60,940점과
기존 40개 migration 이력의 전체 행 MD5가 그대로다. 새 canonical 이력 2개만 추가했다.
운영 REST 읽기/거절 검사 15개는 사용자/행을 만들거나 실제 관리자 코드를 사용하지 않고
통과했다. 이 검사는 공유 번역 앱의 모든 정상 승인·편집 흐름을 검증했다는 뜻은 아니다.

| 실제 검사 | 결과 |
|---|---|
| 자동 GRANT 없는 새 native DB → 기본 스키마/전체 35개 migration → SQL/권한/RLS | 44개 결과 그룹 PASS |
| 기존 설치 SQL 회귀 / JWT·REST·Realtime 회귀 | PASS / 134개 PASS |
| 새 보완·NULL 우회 재현/거절·정상 코드·중복 적용·정의 drift·보존 비교 | 37개 PASS |
| 실제 Auth JWT·REST·Realtime (새 설치 환경) | 134개 PASS |
| 두 migration의 원자적 실행 + 공유 합성 행 전후 비교 | PASS, ROLLBACK |
| 운영 anon/authenticated 무정책 테이블·cron 접근 | 58개 조합 PASS, ROLLBACK |
| 운영 REST health·공유 RPC의 빈/잘못된 입력 거절·0행 공개 조회 | 15개 PASS, 운영 행 쓰기 0 |
| 로컬 ESLint / 운영 타깃 거절·비밀값 비노출 guard | PASS / 4개 PASS |

운영 Security Advisor의 WARN 대상은 **31→30**이며 새 ERROR는 없다. 남은 24개 공유 RPC
실행 경고, 필수 익명 RLS 3개, 접근 차단된 cron 2개, 유료 비밀번호 보호 1개는 위 분류대로
유지했다. 무정책 INFO 27개와 unused-index INFO 5개도 정책 완화나 인덱스 삭제로 숨기지 않았다.
격리 native Advisor의 ERROR/WARN 없음은 공유 번역 앱과 hosted Auth 설정을 포함하지 않는 결과다.

`npm run test:db:advisor -- /private/path/live-config.local`은 표식 있는 native loopback
Supabase만 허용한다. 운영 설정을 로드하지 않는다.

- NULL 해시 우회를 합성 행에서 재현 → 두 보완 적용 → NULL/빈 값/잘못된 코드 거절,
  정상 코드의 수정·삭제 허용, 재적용 동일성, 드리프트 거절.
- SQL fixture는 한 guarded DO 안에서만 설치해 단독 실행 실수도 차단한다. 모두 ROLLBACK한다.
- 실제 Auth JWT와 REST로 invoker health의 anon 허용/authenticated 거절도 확인한다.
- 기존 classroom_access/display/results/student_roster·보스 테스트 및 JWT/REST/Realtime
  회귀를 재사용한다. 빈 DB 설치기는 기본 스키마 → 기존 30개 → 첫 보완 3개 → 이번 2개,
  **총 35개**를 오름차순 실행한다.
- native CLI를 먼저 빈 인프라로 시작한 뒤 설치 SQL을 전달한다. 기본 테이블 없이 CLI가
  migration 폴더를 자동 재생하는 경로는 사용하지 않는다.

생성 역할의 자동 GRANT가 없는 신규 설치/합성 업그레이드와 실제 운영 검사를 구분한다.
공유 번역 앱의 실제 관리자 코드나 운영 사례를 사용해 승인/수정/삭제하지 않는다.
물리 기기·AI 생성·장시간 부하 및 운영 전체 복원 검사는 포함하지 않는다.

상위 작업 폴더 `outputs/security-advisor-20261113/`에 백업 검증, SQL/HTTP/Realtime 결과,
보존 비교, Advisor 전후 및 최종 배포 기록을 둔다. 운영 적용·배포 상태는 그 기록으로 확인한다.
공유 번역 RPC의 전체 인증/남용 방지 구조 변경은 해당 앱 회귀 범위를 포함해 별도로 검토해야 한다.
