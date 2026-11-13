# 서버 보완 검증 결과

검증일: 2026-11-13 KST. 기준 HEAD `96aa15b058fe8b0e6939ddf7c0cdc29b2ac498fe`.
브랜치 `codex/server-hardening-20261113`, 기존 작업 폴더와 분리된 worktree에서 작성했다.
아래는 최초 격리 검증 단계의 기록이다. 이후 명시 승인에 따른 운영 적용·실동작 확인은
[별도 운영 기록](SERVER_HARDENING_PRODUCTION_20261113.md)에 구분했다. 운영 초기화와
운영 비밀/토큰/bootstrap 해시 교체는 수행하지 않았다.

## 실제 실행 결과

| 검사 | 결과 |
|---|---|
| 자동 GRANT 없는 빈 DB 설치 → 전체 33개 migration | PASS |
| 최신 30개 스키마 + 합성 데이터 → 보완 3개 → 두 번째 적용 | PASS |
| 데이터·소유권·명단·점수·bootstrap·ACL·제약·trigger·publication·기타 함수 보존 | PASS |
| 보스 중복 피해/보상·payload 충돌·배우별 거절 | PASS |
| 설치 guard, RLS/상속/열 권한/정의/인덱스 충돌 guard | PASS |
| 첫 전체 SQL 실행 | 43개 결과 그룹 PASS |
| Google helper drift guard 추가 및 최종 SQL 재검증 | 26개 결과 그룹 PASS |
| 실제 Auth JWT + REST/RPC + Realtime | **134개 PASS**, 최종 소스 재실행도 PASS |
| 새 DB migration 이력 등록 | 33개 버전과 파일명 일치 PASS |
| native DB Security Advisor (CLI 2.122.0) | ERROR 0 / WARN 0 / INFO 26 |
| native DB Performance Advisor | finding 0 |
| 메인 build, studio build, server TypeScript, ESLint | PASS |
| 기존 runtime/teacher/studio/deployment/operations/regression/UI 단위 검사 | 82개 PASS |
| 신규 테스트 실행기: 잘못된 설정·비 loopback 대상·비밀 반사 차단 | 3개 테스트 PASS (각 3개 입력) |
| Google 안내 화면 PC/태블릿/모바일 × 라이트/다크 | 6개 PASS, 가로 잘림/JS 예외 없음 |
| 기존 30개 migration 파일 | Git 기준 원본 유지 |

표의 SQL 결과 그룹에는 각 SQL 파일 안의 여러 assert가 포함된다. 첫 전체 43개와
최종 재검증 26개는 중복 검사가 있으므로 서로 다른 69개라고 합산하지 않는다.

## 환경과 증거 범위

무료 로컬 QEMU Ubuntu VM에서 공식 Supabase CLI 2.122.0 **native stack**을 실행했다.
PostgreSQL `17.11.0.006-r0`, Auth `v2.197.0-r0`, PostgREST `v16.5-r0`,
Realtime `v2.147.1-r0`이다. DB/API/SSH는 호스트 loopback으로만 전달했다.
기존 VM 디스크를 읽는 별도 overlay와 새 stack을 사용하여 과거 검증 환경도 보존했다.
운영 환경 파일·토큰·bootstrap 값을 복사하지 않았으며 신규 비용은 0원이다.

Auth는 실제 익명 로그인 JWT를 발급했다. 교사 A/B는 JWT 역할 이름만으로 교사가
되지 않고, 빈 테스트 DB에만 임시 생성한 bootstrap을 확인하는 기존 권한 RPC를
통과했다. 학생·미참여자·TV도 서로 다른 실제 JWT다. Google 계정/관리자 정책은
별도 합성 SQL 및 기존 API 단위 검사로 확인했다. 실제 Google OAuth 로그인 성공을
검증했다고 보고하지 않는다.

브라우저 검사는 로컬 정적 production build의 수정된 안내 화면만 확인했다.
REST/RPC/Realtime 검증은 SDK/HTTP로 실제 로컬 서비스에 연결했으며 브라우저 통합
수업방 화면 전체를 다시 플레이한 결과로 확대 해석하지 않는다.

## 핵심 확인

- 수정 전 동일 action 재전송의 SQLSTATE `42P01`을 격리 DB에서 재현했다.
  신규 파일은 해당 한 줄만 바꾼다. HP 100→90 후 재전송에도 90이며 처치 보상도 1회다.
- 같은 action의 다른 payload, 다른 방, 다른 교사, 미참여자, TV, 만료 사용자의
  쓰기를 거절했다. 직접 `score`·`help_requested_at` UPDATE도 계속 거절된다.
- PIN/QR 번호·별명 입장, 번호 중복, 동일 JWT 재접속의 중복 제거, 교사 전용 명단,
  종료 시 개인정보 삭제, 결과 읽기, 만료, 복구 후 이전 주체 접근 차단을 확인했다.
- Realtime는 필터 없는 실제 구독에서 허용된 행 수신과 다른 방/미참여자 비수신을
  비교했다. 만료·복구 후 기존 구독의 전달 차단과 양성 대조도 확인했다.
- 보존 snapshot은 합성 데이터, 모든 table/column/function ACL, 소유자, 기본 ACL,
  역할 상속, 제약, trigger, publication 및 cron 설정을 비교한다. 보스 본문 한 줄과
  6개 정책의 UID subquery 표현만 정규화해 비교한다. 정책 OID·역할·명령·나머지
  행 조건과 모든 다른 함수 정의는 같았다. 비기본 cost/parallel 속성도 유지했다.
- 기존 객체가 있으면 설치 전 차단하며, 타 기능의 합성 행과 publication 등록을
  보존했다. 공유 번역 테이블의 조건부 인덱스도 합성 기존 FK에서 검증했다.
- SQL fixture는 rollback했다. HTTP fixture는 finally에서 해당 합성 UUID만 정리했다.
  최종 환경의 Auth 사용자·수업방·임시 bootstrap은 0행, 타 기능 보존 행은 1행이다.

## 검증 중 수정한 테스트 문제

기존 `reviewed_access.sql`은 transaction을 가정하지만 자체 BEGIN/ROLLBACK이 없어
직접 실행 시 합성 사용자 행이 남았다. 격리 guard와 명시 transaction을 추가했다.
초기 테스트 전용 환경에 남은 합성 사용자 1명도 UUID와 `example.invalid` 이름을
확인한 뒤 정리했다. 최종·초기 테스트 stack 모두 사용자와 방 0행이며 운영 데이터와 무관하다.
보스 drift 부정 검사도 기존 named parameter를 유지하도록 fixture를 고쳤다.
최종 전체 SQL 실행과 후속 검증은 이 수정 뒤 새 테스트 stack에서 통과했다.

global/schema PUBLIC 함수 EXECUTE가 없는 환경을 재현하므로 임시 assertion 함수에만
필요한 실행 권한을 명시했다. 전역 행 수 가정과 열 목록 없는 INSERT를 줄이고,
최신 점수 승인 기본값은 유지하면서 legacy scoring fixture에서만 명시적으로 끈다.
정책을 완화하여 테스트를 통과시키지 않았다.

## Advisor 해석과 미실행 사항

Security INFO 26개는 직접 접근을 닫은 내부/폐기 테이블의 `rls_enabled_no_policy`다.
이를 없애려고 allow-all 정책을 추가하지 않았다. 이 결과는 CLI의 **격리 DB 검사**이며,
hosted Advisor의 Auth 설정·공개 health RPC·다른 번역 앱 RPC 경고가 모두 해결됐다는
뜻이 아니다. 운영 Advisor와 실제 운영 데이터의 전후 비교는 수행하지 않았다.

운영 적용 전에는 실제 백업/복원, migration timestamp 차이, hosted 설정·역할 상속·
drift, 인덱스 생성 시간과 lock을 확인해야 한다. Vercel 관리 메타데이터의 Next.js
표시도 운영 설정이므로 변경하지 않았다. 최신 소스의 실제 설정은 Vite이며 양쪽
build가 통과했다. 실제 AI 공급자 생성, 물리 기기, Google OAuth, 수업 현장 부하,
운영 사용자 JWT로 쓰는 테스트와 배포는 실행하지 않았다.

## 증거 위치

상위 작업 폴더 `outputs/server-hardening-20261113/`:

- `hardening-sql-results.json`, `hardening-reverify-results.json`
- `supabase-live-result.json`, `migration-history-results.json`
- `permission-matrix.json`, `source-api-references.json`
- `advisor-security.json`, `advisor-performance.json`
- `ui-results.json`, `login-393-light.png`, `login-1440-dark.png`

private `.local` 파일과 VM 디스크/키는 저장소에 포함하지 않는다. 재현 순서는
[runbook](SERVER_HARDENING_RUNBOOK.md), 권한 목록은 [매트릭스](SERVER_HARDENING_PERMISSION_MATRIX.md)를 따른다.
