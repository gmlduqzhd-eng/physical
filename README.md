# 땀방울 원정대

저장소: `gmlduqzhd-eng/physical`. 앱은 React + TypeScript + Vite이며,
배포 빌드 설정은 `vercel.json`을 기준으로 한다.

## 2026-11-13 서버 보완 작업

기준 HEAD는 `96aa15b058fe8b0e6939ddf7c0cdc29b2ac498fe`이고 작업 브랜치는
`codex/server-hardening-20261113`이다. 기존 미커밋 폴더와 분리해 작성했다.
**운영 DB 적용·초기화·배포·push는 하지 않았다.**

- [신규 설치·기존 DB 업그레이드 절차](docs/SERVER_HARDENING_RUNBOOK.md)
- [권한 매트릭스](docs/SERVER_HARDENING_PERMISSION_MATRIX.md)
- [실제 검증 결과와 미실행 항목](docs/SERVER_HARDENING_VERIFICATION.md)

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
