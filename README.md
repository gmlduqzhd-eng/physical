# 땀방울 원정대

저장소: `gmlduqzhd-eng/physical`. 앱은 React + TypeScript + Vite이며,
배포 빌드 설정은 `vercel.json`을 기준으로 한다.

## 2026-11-15 협동 놀이 개선

대표 경험 3개, 공용 화면 수업, 분산 단서 비밀지도, 역할·도움·끝장면,
공개 수업 구성 공유를 구현했다. 새 지도 규칙은 새 원정에서만 사용하며
기존 수업 기록·교사/학생/TV 권한은 유지한다.
구현 범위, 격리 검증 결과와 아직 수행하지 않은 운영 적용·배포는
[협동 게임 경험 개선 기록](docs/PLAY_REDESIGN_20261115.md)을 참고한다.

## 2026-11-13 서버 보완 작업

기준 HEAD는 `96aa15b058fe8b0e6939ddf7c0cdc29b2ac498fe`이고 작업 브랜치는
`codex/server-hardening-20261113`이다. 기존 미커밋 폴더와 분리해 작성했다.
최초 격리 검증 이후 명시 승인을 받아 2026-11-13 신규 마이그레이션 3개를
운영 DB에 적용하고 실제 교사·학생·TV 동작을 확인한 뒤 배포했다.
운영 초기화와 비밀 교체는 수행하지 않았다.

- [신규 설치·기존 DB 업그레이드 절차](docs/SERVER_HARDENING_RUNBOOK.md)
- [권한 매트릭스](docs/SERVER_HARDENING_PERMISSION_MATRIX.md)
- [실제 검증 결과와 미실행 항목](docs/SERVER_HARDENING_VERIFICATION.md)
- [백업·운영 적용·실동작 확인 기록](docs/SERVER_HARDENING_PRODUCTION_20261113.md)
- [남은 Security Advisor 경고 점검과 후속 보완](docs/SECURITY_ADVISOR_REVIEW_20261113.md)
- [공유 번역 RPC의 비공개 구현 분리와 호환성 검증](docs/TRANSLATION_RPC_ISOLATION_20261113.md)

`supabase_schema.sql`은 파괴적 구형 설치를 차단한다. 빈 Supabase DB에는
`supabase/install_empty.psql`을, 기존 DB에는 검토한 신규 migration만 사용한다.
기존 migration 파일을 다시 실행해 운영을 복구하거나 과거 작업 폴더를 통째로
배포하지 않는다. 자세한 순서와 검증 명령은 위 문서를 따른다.

## 기존 개발 템플릿 안내

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
