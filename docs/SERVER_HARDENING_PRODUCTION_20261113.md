# 서버 보완 운영 적용 기록

대상은 `gmlduqzhd-eng/physical`, Supabase `tjrrtgdhtjdkofwqnxnz`,
공개 앱 `https://physical-pi.vercel.app`이다. 2026-11-13 사용자가 백업·보존을 전제로
검증한 신규 3개 운영 적용과 서버 배포를 명시 승인했다. 최초 격리 검증과 구분한다.

## 백업과 복원 검증

- 운영 MVCC snapshot 한 번으로 70개 테이블의 모든 행과 관계·함수·정책·권한·역할
  상속·기본 ACL·제약·trigger·인덱스·시퀀스·publication·cron catalog를 수집했다.
- 범위: `public`, `physical_internal`, `physical_studio_limits`, `auth`, `storage`,
  `supabase_migrations`. 서버에서 공개키 암호화한 뒤 로컬로 받아 원문 행을 로그에 출력하지 않았다.
- RSA3072 PGP + AES256 암호화, 개인키 passphrase는 Windows CurrentUser DPAPI로 보호했다.
  private backup 폴더는 현재 Windows 사용자만 접근하도록 제한했다. 저장소와 배포에서 제외했다.
- 암호문 181,438 bytes. 복호화·SHA256·테이블별 행 수/MD5를 확인하고, 70개 모두를
  격리 PostgreSQL의 타입 있는 임시 테이블로 복원하여 비교한 뒤 ROLLBACK했다.
  마이그레이션 text/text[] 행의 OS collation 정렬 차이는 정확한 값의 multiset 비교로 확인했다.
- 이는 논리 행/catalog 백업이며 managed-project/PITR 전체 복원 시험은 아니다.
  Storage 파일 본체, role password, 공급자 설정은 포함하지 않았다.

## 적용한 신규 파일

1. `20261113091515_repair_boss_retry_reference.sql`
2. `20261113091733_explicit_core_data_api_grants.sql`
3. `20261113092338_optimize_classroom_policy_and_fk_indexes.sql`

격리 검증 당시 SHA256과 세 파일의 일치를 확인했다. 운영 DB의 기존 설치/초기화 파일과
과거 migration은 재실행하지 않았다. 세 파일을 원문 순서대로 한 DO transaction 안에서
실행했다. 적용 직전 관련 테이블에 제한된 SHARE lock을 획득하고, 전후 snapshot의 행·함수·
정책·ACL·역할 상속·trigger·제약·기본 권한·publication·cron을 비교했다. lock 대기는 5초다.

보스 조회 한 줄과 UID scalar subquery 표현만 정규화하여 비교했으며, 나머지 정의·OID·
소유자·부가 함수 속성 및 모든 데이터는 일치했다. 예상하지 않은 차이는 전체 ROLLBACK하도록
구성했고 검사에 통과했다. 신규 인덱스 7개는 의도한 추가 변경이다.

연결 도구의 apply_migration은 현재 시각의 이력 행을 자동 추가하므로, 원문 3개 버전·이름·
statements를 같은 transaction 안에 등록했다. 적용 후 이번 실행용 wrapper 이력 1개만
정확한 version/name으로 제거했다. 기존 37개 이력은 백업 당시 행 수와 전체 행 MD5가
일치했다. 최종 신규 이력은 위 3개뿐이다. 미래 `db push`로 과거 timestamp 차이를
자동 복구하지 않는다.

## 운영 데이터와 권한 보존

- 적용 직전/직후 기존 방 39개, 모둠 220개, 합계 점수 58,940점으로 같았다.
  snapshot은 숫자 합계뿐 아니라 모든 적용 대상 행 내용을 비교했다.
- Google 교사 판별·소유권·학생/TV 멤버십·종료 결과·만료·복구·7일 보관 규칙을 유지했다.
- `room_groups` 전체 UPDATE, `score` 및 `help_requested_at` 직접 UPDATE는 계속 거절된다.
  `anon`/`PUBLIC` 핵심 테이블 접근을 추가하지 않았다.
- 운영 비밀과 bootstrap 해시는 재생성/교체하지 않았다. publication 등록을 보존했다.
- 실제 시험용 방 1개/모둠 1개는 새로 만들었다. 종료한 시험 방의 2,000점은 기존 데이터와
  분리한다. 기존 39개 방/220개 모둠/58,940점은 실동작 확인 후에도 같았다.

## 실제 동작 확인

실제 교사 Google 로그인 UI로 방 생성, 명단 1명 갱신, 점수 2,000점 표시,
상세 제어 전환·수업방 재접속·보스 시작·수업 종료를 확인했다.
학생과 TV는 별도의 실제 Supabase Auth 익명 로그인으로 발급한 JWT를 사용했으며,
교사 JWT나 브라우저 인증 저장소를 추출하지 않았다.

- PIN 입장 → QR로 동일 학생 재입장 → 토큰 갱신 후 같은 번호·별명 유지.
- 같은 학생 번호의 별도 사용자 입장 거절. 교사 명단은 91번 합성 학생 한 명만 표시.
- anon 직접 REST 거절, 미참여자의 방/명단 접근 차단, 학생 역할의 교사 방 생성 차단.
- 학생/TV 명단 RPC 거절, 점수와 RPC 전용 열 직접 REST UPDATE 거절.
- 보스 첫 피해, 동일 action 재시도, payload 변경 충돌 거절, TV 피해 요청 거절.
- 보스 처치와 처치 action 재시도 후 보상 2,000점 한 번만 반영.
- 인증 Realtime 구독에서 방 UPDATE 4회와 모둠 UPDATE 1회 수신.
- 종료 후 PIN 재입장 거절, 학생 명단 접근 차단, TV의 종료 결과 읽기 유지.
- 종료 trigger가 번호·별명을 NULL로 비웠다. 결과 권한용 membership 자체는 기존 정책대로
  유지된다. 테스트 JWT는 로그아웃했고 이번에 생성한 합성 Auth 사용자만 정확히 식별해 제거했다.

## 배포와 최종 공개 확인

배포 패키지에서 MediaPipe 라이선스가 제외되는 문제로 첫 staged build가 차단됐다.
공개 도메인에는 전환하지 않았으며 `.vercelignore`의 디렉터리/파일 예외를 명시해 고쳤다.
dry-run에서 해당 파일 포함과 private 파일 미포함을 확인했다. 변경은 `gmlduqzhd-eng`
계정의 `main`에 push했고 기존 Vercel 프로젝트의 Git 배포가 READY로 완료됐다.
원격 배포 gate의 회귀 검사·서버 타입 검사·메인/교사 UI 빌드도 통과했다.

공개 메인·classroom API·교사 studio·교사 API 모두 HTTP 200/health OK였다.
실제 브라우저에서도 수정한 Google 로그인 안내와 종료한 시험 방의 TV 결과 2,000점이
표시됐다. 교사 studio의 소스 변경/별도 신규 배포나 실제 AI 생성 검사는 포함하지 않았다.
테스트 VM과 로컬 PostgreSQL은 종료했다.

## Advisor 및 검증 한계

운영 Advisor에서 RLS initplan 경고 6건과 FK 인덱스 누락 7건이 사라졌다. 새 인덱스는
생성 직후 사용 이력이 없어 unused-index INFO가 1→8건으로 늘었으며 삭제하지 않았다.
Security Advisor 결과는 적용 전후 같다. 공유 번역 앱/공개 health SD 함수, 익명 Auth
정책 및 유출 비밀번호 보호 설정 경고를 일괄 권한 회수로 바꾸지 않았다.
관련 [Advisor 안내](https://supabase.com/docs/guides/database/database-linter)를 참고한다.

기존 격리 결과(신규 설치/업그레이드/중복 적용/134 JWT·REST·Realtime 검사)와 별도로
운영 smoke 33개 검사를 통과했다. 운영에서 과거 fixture 전체를 실행하거나 만료 시각·다른 교사
데이터를 임의 변경하지 않았다. 실제 물리 기기, 장시간 수업 부하, AI 공급자 생성,
운영 전체 PITR 복원은 이번 검증에 포함하지 않았다.

로컬 증거는 상위 폴더 `outputs/production-hardening-20261113/`의
`backup-verification.json`, `production-smoke-results.json` 및 배포 결과 기록이다.
private `.local`, 암호문/키, VM 디스크와 실제 운영 행은 커밋하지 않는다.
