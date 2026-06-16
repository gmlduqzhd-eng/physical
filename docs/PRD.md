# 📄 제품 요구사항 정의서 (PRD)

## 프로젝트명: 폭탄 해체 작전: 여수 바다를 지켜라

### 1. 프로젝트 개요 (Overview)
- **목적:** 초등학교 체육 공개수업을 위한 4인 1조 협동 미션 웹 애플리케이션
- **대상:** 초등학생 (4인 1조 모둠 단위 플레이), 참관객 약 200명 규모
- **핵심 목표:** 
  1. 방대한 코드를 역할에 따라 철저히 분리하고 모듈화하여 유지보수성 극대화
  2. 모바일 기기에 최적화된 터치/제스처 통제 UI 구축
  3. Supabase를 활용한 지연 없는 실시간 상태 동기화 및 동시성 제어(Race Condition) 방어 로직 구현

---

### 2. 기술 스택 (Tech Stack & Environment)
- **Frontend Framework:** React 18 (Vite 환경)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Routing:** react-router-dom v6
- **Backend & Database:** Supabase (PostgreSQL, supabase-js)
- **Deployment:** Vercel

---

### 3. 프로젝트 설정 및 안정성 정책 (Project Configs)
1. **라우팅 안정성 (Vercel SPA 세팅):** 
   - 루트 디렉토리에 `vercel.json` 생성. (`{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}`)
2. **환경변수 보안:**
   - `.gitignore` 파일에 `.env`, `.env.local` 추가. 클라이언트 환경변수 호출은 `import.meta.env` 사용.
3. **크래시(Crash) 방지:**
   - App의 최상위 루트 레벨에 `<ErrorBoundary>` 래퍼(Wrapper) 컴포넌트 구현하여 흰 화면 방지.

---

### 4. 데이터베이스 스키마 (Database Schema - Supabase)
실시간 양방향 통신을 위해 `DISABLE ROW LEVEL SECURITY` 처리 및 Realtime Publication을 적용합니다.

#### 4.1. `bomb_defusal_scores` 테이블
- `id` (uuid, PK): 레코드 고유 식별자
- `class_name` (text): 학급 정보
- `group_name` (text): 모둠 정보
- `score` (int, default: 0): 모둠이 획득한 미션 달성/해체 점수
- `mission_stats` (jsonb, default: {}): 각 단계별 미션 성공 여부 통계
- `is_defused` (boolean, default: false): 최종 폭탄 해체 성공 여부
- `updated_at` (timestamp): 데이터 최종 업데이트 시간

#### 4.2. `game_controls` 테이블
- `id` (int, PK, 고정값 1): 단일 레코드
- `status` (text): 현재 게임 상태 (`'playing'`, `'paused'`, `'locked'`)
- `global_time_modifier` (int): 전체 남은 시간 또는 시간 조작 보정 값

---

### 5. 글로벌 CSS 및 모바일 UI 최적화 (Global CSS)
모바일 브라우저의 기본 제스처를 차단하여 게임 중 UI 붕괴 원천 차단.

```css
html, body, #root { 
  height: 100dvh; width: 100vw; overflow: hidden; 
  touch-action: none; -webkit-touch-callout: none; user-select: none; 
}
img, svg { -webkit-user-drag: none; pointer-events: none; }
button { pointer-events: auto; }
```

---

### 6. 시스템 안정성 고도화 전략 (Robustness & Error Handling)
200명 이상의 참관객과 다수의 동시 접속자가 존재하는 체육관 환경의 통신 오류를 원천 차단하는 로직을 적용합니다.

1. **원자적 연산(Atomic Operation) 기반 동시성 제어 (Race Condition 통제)**
   - **문제:** 여러 진행요원이 동시에 점수를 올릴 때 클라이언트 단에서 `score = currentScore + x` 연산을 수행하면 데이터 유실 발생 가능성이 매우 높습니다.
   - **해결 로직:** 클라이언트 연산을 배제하고, Supabase의 `RPC (Stored Procedure)`를 작성하여 데이터베이스 엔진 단에서 `increment_score(x)` 함수를 호출하도록 로직을 강제합니다. 이를 통해 동시 요청 시에도 완벽한 순차 연산이 보장됩니다.

2. **네트워크 오프라인 캐싱 및 재연결 큐 (Sync Queue)**
   - **문제:** 체육관 내 와이파이 혼선으로 기기 연결이 일시적으로 끊어질 수 있습니다.
   - **해결 로직:** 
     - 네트워크 상태를 실시간으로 감지(`navigator.onLine` 및 소켓 Heartbeat 체크).
     - 오프라인 상태 돌입 시, 진행요원의 앱은 멈추지 않고 미션 완료 처리를 허용하며 발생한 액션들을 `IndexedDB` 또는 `LocalStorage` 내의 **Sync Queue**에 누적시킵니다.
     - 연결 복구 즉시 Queue에 쌓인 액션들을 서버에 일괄 동기화하여 데이터 유실 없이 실시간 현황판에 반영합니다.
