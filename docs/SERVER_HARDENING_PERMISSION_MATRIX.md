# 최종 Data API 권한 매트릭스

기준 HEAD: `96aa15b`의 최초 권한 검증에 후속 Advisor 보완을 반영했다. 기존 30개 + 첫 보완 3개 + Advisor 보완 2개 + 공유 RPC 경계 보완 2개, 총 37개 migration이 기준이다. 아래는 땀방울 RPC 54개의 권한이며, 추가 공유 RPC 12개는 [별도 계약 표](TRANSLATION_RPC_ISOLATION_20261113.md)를 따른다. 기존 실행 ACL/테이블 권한은 바꾸지 않는다.

`authenticated`는 학생의 익명 로그인 JWT에도 부여된다. 이 역할만으로 교사를 판별하지 않는다. 아래 허용은 SQL 진입 권한이며, 실제 행/동작은 기존 소유권·교사 자격·멤버십·만료 조건으로 제한된다.

## public 테이블

| 테이블 | 역할 | SELECT | INSERT | UPDATE | DELETE | RLS |
|---|---|---|---|---|---|---|
| bomb_defusal_scores | anon | 없음 | 없음 | 없음 | 없음 | 켜짐 |
| bomb_defusal_scores | authenticated | 없음 | 없음 | 없음 | 없음 | 켜짐 |
| game_controls | anon | 없음 | 없음 | 없음 | 없음 | 켜짐 |
| game_controls | authenticated | 없음 | 없음 | 없음 | 없음 | 켜짐 |
| game_rooms | anon | 없음 | 없음 | 없음 | 없음 | 켜짐 |
| game_rooms | authenticated | 허용 | 허용 | 허용 | 허용 | 켜짐 |
| mission_templates | anon | 없음 | 없음 | 없음 | 없음 | 켜짐 |
| mission_templates | authenticated | 허용 | 허용 | 허용 | 허용 | 켜짐 |
| room_groups | anon | 없음 | 없음 | 없음 | 없음 | 켜짐 |
| room_groups | authenticated | 허용 | 허용 | 없음 | 허용 | 켜짐 |

`game_rooms`와 `mission_templates`의 교사 소유 CRUD는 유지된다. `room_groups`의 UPDATE는 아래 열만 허용된다. 테이블 전체 UPDATE가 없다고 허용 열 UPDATE까지 없는 것은 아니다. 학생과 TV는 학생 명단 내부 테이블을 직접 읽을 수 없다. 학생 번호·별명은 교사 소유권을 확인하는 `get_classroom_roster(uuid)`를 통해서만 교사에게 반환한다.

## room_groups 열 UPDATE

| 열 | authenticated UPDATE | anon 열 접근 |
|---|---|---|
| id | 없음 | 없음 |
| room_id | 없음 | 없음 |
| group_name | 허용 | 없음 |
| score | 없음 | 없음 |
| is_defused | 허용 | 없음 |
| is_hacked | 허용 | 없음 |
| item_buff_until | 허용 | 없음 |
| is_blinded_until | 허용 | 없음 |
| completed_missions | 허용 | 없음 |
| pending_missions | 허용 | 없음 |
| badges | 허용 | 없음 |
| stats | 허용 | 없음 |
| spy_device_id | 허용 | 없음 |
| avatar | 허용 | 없음 |
| updated_at | 허용 | 없음 |
| help_requested_at | 없음 | 없음 |

`id`, `room_id`, `score`, `help_requested_at`의 직접 UPDATE는 금지된다. `score`와 도움 요청은 기존 검증 RPC를 사용한다. core 테이블에 PUBLIC ACL, anon 열 권한, authenticated TRUNCATE/REFERENCES/TRIGGER를 추가하지 않는다.

## public 함수 54개

PUBLIC EXECUTE는 아래 모든 함수에서 없다. `anon`이 실행 가능한 서버용 RPC는 기존 서버 secret을 검증하며, 상태 확인 RPC는 boolean만 반환한다. `activity_review_records`의 조회와 관리자 쓰기도 기존 본문에서 구분한다. 권한 경고를 없애기 위해 이 공개 계약을 임의로 닫지 않았다.

| 함수 signature | anon EXECUTE | authenticated EXECUTE | SECURITY DEFINER |
|---|---|---|---|
| `activity_review_records(text,text,boolean,boolean,boolean)` | 허용 | 허용 | 아니오 |
| `apply_classroom_boss_damage(uuid,integer,text)` | 없음 | 허용 | 아니오 |
| `attack_group(uuid,uuid,integer)` | 없음 | 허용 | 아니오 |
| `authorize_classroom_teacher(text)` | 없음 | 허용 | 아니오 |
| `buy_buff(uuid)` | 없음 | 없음 | 아니오 |
| `buy_buff(text)` | 없음 | 없음 | 아니오 |
| `check_shared_teacher_access(text)` | 허용 | 없음 | 아니오 |
| `check_shared_teacher_login(text)` | 허용 | 없음 | 아니오 |
| `check_teacher_account(text,uuid,integer)` | 허용 | 없음 | 아니오 |
| `claim_classroom_controller(uuid,uuid)` | 없음 | 허용 | 아니오 |
| `classroom_effect(uuid,text,uuid,text)` | 없음 | 허용 | 아니오 |
| `classroom_maintenance_status()` | 없음 | 허용 | 아니오 |
| `classroom_operations(uuid,text,integer,boolean,integer)` | 없음 | 허용 | 아니오 |
| `classroom_service_health()` | 허용 | 없음 | 아니오 |
| `complete_classroom_profile(uuid,uuid,integer,text)` | 없음 | 허용 | 아니오 |
| `create_guided_classroom(text,text,integer,integer,integer)` | 없음 | 허용 | 아니오 |
| `create_secure_classroom(text,uuid,text[])` | 없음 | 허용 | 아니오 |
| `damage_classroom_boss(uuid,integer)` | 없음 | 허용 | 아니오 |
| `delete_managed_classroom(uuid,text)` | 없음 | 허용 | 아니오 |
| `expedition_action(uuid,text,text,uuid,jsonb)` | 없음 | 허용 | 아니오 |
| `get_classroom_device_codes(uuid)` | 없음 | 허용 | 아니오 |
| `get_classroom_invites(uuid)` | 없음 | 허용 | 아니오 |
| `get_classroom_roster(uuid)` | 없음 | 허용 | 아니오 |
| `get_my_classroom_profile(uuid)` | 없음 | 허용 | 아니오 |
| `increment_classroom_score(uuid,integer,text)` | 없음 | 허용 | 아니오 |
| `increment_score(uuid,integer)` | 없음 | 없음 | 아니오 |
| `increment_score(text,integer)` | 없음 | 없음 | 아니오 |
| `join_classroom_board(uuid,text)` | 없음 | 허용 | 아니오 |
| `join_classroom_invite_profile(uuid,text,text,integer,text)` | 없음 | 허용 | 아니오 |
| `join_classroom_short_pin_profile(text,integer,text)` | 없음 | 허용 | 아니오 |
| `join_classroom_with_short_pin(text)` | 없음 | 허용 | 아니오 |
| `join_secure_classroom(uuid,text,text)` | 없음 | 허용 | 아니오 |
| `logout_classroom()` | 없음 | 허용 | 아니오 |
| `lookup_classroom(text)` | 없음 | 허용 | 아니오 |
| `manage_teacher_account(uuid,boolean,text)` | 없음 | 허용 | 아니오 |
| `managed_classrooms()` | 없음 | 허용 | 아니오 |
| `purchase_classroom_buff(uuid)` | 없음 | 허용 | 아니오 |
| `recover_secure_classroom(text,text)` | 없음 | 허용 | 아니오 |
| `release_classroom_number(uuid,integer)` | 없음 | 허용 | 아니오 |
| `reset_group_scores(uuid)` | 없음 | 허용 | 아니오 |
| `review_classroom_mission(uuid,text,boolean)` | 없음 | 허용 | 아니오 |
| `review_classroom_score(uuid,uuid,integer,boolean)` | 없음 | 허용 | 아니오 |
| `revoke_classroom_teacher()` | 없음 | 허용 | 아니오 |
| `save_guided_reflection(uuid,text,text)` | 없음 | 허용 | 아니오 |
| `set_classroom_help(uuid,boolean)` | 없음 | 허용 | 아니오 |
| `studio_limit_request(text,text,text,uuid)` | 허용 | 없음 | 아니오 |
| `studio_usage_status(text)` | 허용 | 없음 | 아니오 |
| `submit_classroom_mission(uuid,text)` | 없음 | 허용 | 아니오 |
| `submit_classroom_score(uuid,integer,text,text)` | 없음 | 허용 | 아니오 |
| `teacher_account()` | 없음 | 허용 | 아니오 |
| `teacher_login_attempt(text,text)` | 허용 | 없음 | 아니오 |
| `teacher_login_policy(boolean)` | 없음 | 허용 | 아니오 |
| `teacher_members(integer,integer,text)` | 없음 | 허용 | 아니오 |
| `teacher_transition_status()` | 없음 | 허용 | 아니오 |

## 내부 객체와 행 범위

- `physical_internal`의 테이블/열/시퀀스는 anon·authenticated에 직접 공개하지 않는다. 필요한 private 함수 EXECUTE는 기존 검증 wrapper 의존성대로 유지한다.
- 교사: 현재 교사 자격 + 유효한 접근 + 소유권. 다른 교사의 방·명단 접근은 거절된다. Google 자격 판정 helper의 정의도 GRANT 전 검증한다.
- 학생: 현재 방의 유효한 멤버십. 다른 방 조회·다른 모둠 쓰기·교사 명단 RPC는 거절된다. 같은 방 점수판 조회와 학생 명단 조회는 별개다.
- TV: 기존 viewer 권한과 만료 범위에서 읽기만 허용한다.
- 종료 후 결과 읽기, 쓰기 차단, 복구 후 기존 권한 무효화, 만료 차단을 그대로 유지한다.
- service_role 및 기존 기본 권한·역할 상속·타 앱 권한은 변경하지 않는다. 예상 밖 상속/권한은 보완 파일이 중단한다.

카탈로그 증거: 상위 작업 폴더 `outputs/server-hardening-20261113/permission-matrix.json`. 실제 JWT/REST/Realtime 결과와 한계는 [검증 보고서](SERVER_HARDENING_VERIFICATION.md)를 따른다.
