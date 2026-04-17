# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

MDPro는 초보자도 쉽게 쓸 수 있는 브라우저 기반 마크다운 에디터/뷰어다. 실시간 분할 프리뷰, 자동 저장(IndexedDB), HTML/MD 내보내기, 다크/라이트 테마를 지원한다. 설치 없이 브라우저에서 동작하며 순수 웹 표준(HTML/CSS/JS)으로 작성되어 OS 독립적이다.

## 작업 진행 현황

**`/init` 명령을 실행할 때마다 이 섹션을 최신 상태로 갱신한다.** 각 주요 섹션(Architecture, Commands, Project Rules 등)에도 해당 섹션 맨 아래에 "직전 작업 / 다음 작업" 메모를 한 줄씩 남겨, 다음 Claude 인스턴스가 어디까지 진행되었는지 즉시 파악할 수 있도록 한다. 형식 예:

```
> 직전 작업: Phase N — <무엇을 했는가>
> 다음 작업: Phase N+1 — <무엇을 할 예정인가>
```

### 전체 프로젝트 현황 (최종 갱신 2026-04-17 · /init 재실행)

- **완료 페이즈**: Phase 0 (스캐폴딩) · Phase 1 (레이아웃 · 테마/뷰모드 · 사이드바) · Phase 2 (CodeMirror 에디터 · documentStore · 양방향 바인딩)
- **현재 소스 상태**: `src/components/{Editor,Layout}/` 구현됨, `src/lib/` 비어있음(Phase 3에서 `markdown/` 추가 예정), `src/components/{Preview,Toolbar}/` 미생성.
- **직전 작업**: Phase 2 — CodeMirror 6 에디터 통합, `documentStore`, 테마 `Compartment` 재설정, 루프 방지 양방향 바인딩. 단위 테스트 **21/21 통과**, `npm run build` 성공(번들 ~235KB gzipped), `npm run dev` HTTP 200 확인.
- **다음 작업**: Phase 3 — `src/lib/markdown/`에 `unified` 파이프라인(remark-parse → remark-gfm → remark-math → remark-rehype → rehype-katex → rehype-highlight → rehype-sanitize → rehype-stringify) 구성. `PreviewPane`이 `documentStore.content`를 150ms debounce로 구독하여 렌더링. Mermaid 통합, XSS 방지 단위 테스트 필수.
- **페이즈 로드맵**: 0 초기화 → 1 레이아웃 → 2 에디터 → **3 프리뷰(다음)** → 4 서식 툴바 → 5 문서 저장소/파일관리 → 6 내보내기/가져오기 → 7 최종 검증.

## Commands

```bash
npm run dev          # Vite 개발 서버 (http://localhost:5173)
npm run build        # tsc -b && vite build → dist/
npm run preview      # 빌드 결과물 로컬 미리보기

npm run typecheck    # tsc --noEmit (타입만 체크)
npm run lint         # eslint .
npm run test         # vitest run (단위/통합 테스트, e2e 제외)
npm run test:watch   # vitest (watch 모드)
npm run test:e2e     # playwright test (개발 서버 자동 기동)

npm run check        # typecheck + lint + test 한번에
```

단일 테스트 파일 실행:
```bash
npx vitest run src/stores/uiStore.test.ts
npx vitest run -t "toggles theme"   # 테스트 이름 필터
```

> 직전 작업: Phase 2 완료 시 `npm run check` 전체 통과, `npm run build` 성공 (번들 ~235KB gzipped, CodeMirror 언어팩 포함), `npm run dev` HTTP 200 확인.
> 다음 작업: Phase 3 완료 시 동일 명령 세트 재실행 + 프리뷰 번들 크기 영향 모니터링.

## Architecture

### 전체 데이터 흐름

```
┌─────────────┐   setContent()    ┌──────────────────┐
│  Editor.tsx │ ────────────────▶ │ documentStore    │
│ (CodeMirror)│ ◀──────────────── │ (Zustand)        │
└─────────────┘   subscribe()     └────────┬─────────┘
                                            │ content
                                            ▼
                                  ┌──────────────────┐
                                  │  Preview (예정)   │
                                  │  unified/rehype  │
                                  └──────────────────┘

┌─────────────┐   toggle/set      ┌──────────────────┐
│  TopBar /   │ ────────────────▶ │ uiStore          │
│  Layout     │ ◀──────────────── │ (Zustand+persist)│
└─────────────┘   subscribe       └──────────────────┘
```

### 상태 관리 패턴 (Zustand)

두 개의 스토어로 책임 분리:

- **`src/stores/uiStore.ts`** — 테마(`light|dark`), 뷰모드(`edit|split|preview`), 사이드바 상태. `persist` 미들웨어로 `localStorage` 키 `mdpro-ui`에 지속. 시스템 `prefers-color-scheme` 초기값 자동 감지.
- **`src/stores/documentStore.ts`** — 현재 열린 문서의 `title`, `content`. 아직 비영속(메모리만). Phase 5에서 IndexedDB 기반 다중 문서로 확장 예정.

테마 적용은 `src/hooks/useTheme.ts`가 `uiStore.theme` 변경을 구독하여 `document.documentElement`에 `.dark` 클래스를 토글한다. Tailwind `darkMode: 'class'` 설정과 연동된다.

### CodeMirror 통합 (`src/components/Editor/Editor.tsx`)

- `EditorView`는 `useRef`로 관리. 마운트 시 1회 생성, 언마운트 시 `destroy()`.
- **테마 재설정**: `Compartment` + `reconfigure`로 `uiStore.theme` 변경 시 CodeMirror 테마만 교체 (에디터 재생성 없이).
- **양방향 바인딩 + 루프 방지**:
  - 에디터 → 스토어: `EditorView.updateListener` 안에서 `doc.toString() !== store.content`일 때만 `setContent` 호출.
  - 스토어 → 에디터: `useDocumentStore.subscribe`로 변경 감지, 현재 `view.state.doc`과 다를 때만 `dispatch({ changes })`.
- 테마 정의는 `cmTheme.ts`의 `lightTheme`/`darkTheme` (CodeMirror `EditorView.theme()`).

### 레이아웃 구조

`Layout`이 `uiStore.viewMode`와 `sidebarOpen`을 읽어 조건부 렌더링:
- `viewMode !== 'preview'` → `EditorPane` 표시
- `viewMode !== 'edit'` → `PreviewPane` 표시
- 모바일(`<md`)은 세로 분할, 데스크톱(`≥md`)은 가로 분할 (Tailwind `flex-col md:flex-row`)
- 사이드바는 모바일에서 오버레이(`z-40` + 백드롭), 데스크톱에서 고정 컬럼

### 테스트 구성

- **Vitest** + `jsdom` + `@testing-library/react`. 설정은 `vite.config.ts`의 `test:` 블록. `src/test/setup.ts`에서 `@testing-library/jest-dom` 확장 로드.
- `include: src/**/*.{test,spec}.{ts,tsx}` — Playwright `e2e/` 디렉토리는 제외.
- **Playwright** E2E는 `e2e/*.spec.ts` (`playwright.config.ts`에서 `webServer`로 dev 서버 자동 기동).
- UI 테스트는 역할 기반 쿼리 사용 (`getByRole`, `getByLabelText`). `getByTestId`는 DOM 호스트가 필요한 CodeMirror 같은 경우만 제한적으로 사용.
- 스토어 테스트는 `beforeEach`에서 `localStorage.clear()` + `setState` 또는 `reset()`으로 격리.

### TypeScript 설정

프로젝트 참조 방식:
- `tsconfig.json` → `tsconfig.app.json`(src, DOM) + `tsconfig.node.json`(vite/playwright 설정 파일, `@types/node`).
- `strict: true`, `noUnusedLocals`, `noUnusedParameters` 활성화.

### Vite / Vitest 버전 주의

`vite.config.ts`는 **`vitest/config`에서 `defineConfig`를 import**해야 `test:` 옵션이 타입 인식된다 (`vite`에서 import하면 타입 오류). Vitest 3.x + Vite 6.x 조합을 쓴다 — 버전 불일치 시 `PluginOption` 충돌이 발생한다.

> 직전 작업: Phase 2 — `Editor.tsx`에 `Compartment` 기반 테마 재설정 + 루프 방지용 양방향 바인딩 패턴 정착. `documentStore`는 아직 비영속.
> 다음 작업: Phase 3에서 `src/lib/markdown/`에 `unified` 파이프라인 추가, `PreviewPane`이 `documentStore.content` 구독. Phase 5에서 `documentStore`를 IndexedDB 기반 다중 문서 모델로 확장.

## Project Rules

### 테스트 규칙 (필수)

**모든 작업 단계마다 테스트를 수행하고, 작업 완료 후에도 최종 테스트를 반드시 진행한다.**

1. **구현 중**: `npm run typecheck` + `npm run lint` + 단위 테스트(`*.test.tsx`) 통과
2. **기능 완성 시**: `npm run dev` 브라우저에서 골든 패스 + 엣지 케이스 + 다크/라이트 + 회귀 확인
3. **작업 완료 후**: `npm run check` 전체 통과 + `npm run build` 성공 + `npm run preview` 동작 + `npm run test:e2e` 통과 + 모바일 반응형 확인

타입 체크/테스트는 코드 정확성만 검증한다. **기능 정확성은 브라우저에서 직접 확인**해야 하며, UI 테스트 불가능하면 명시적으로 보고할 것 (허위 성공 보고 금지). 파싱 로직, 저장소 로직 등 순수 함수는 반드시 단위 테스트를 작성한다.

### 내보내기 포맷 제한

내보내기(export)는 **`.md`와 `.html` 두 가지만** 지원한다. PDF/DOCX 관련 라이브러리(jsPDF, html2canvas, docx, html-to-docx) 추가 금지. HTML 내보내기는 완전 독립형 문서(`<meta charset="utf-8">`, 인라인 CSS, base64 이미지) 형태로 작성한다.

### 코드 스타일

- TypeScript strict, `any` 금지
- 컴포넌트는 함수형 + 훅, 파일당 한 컴포넌트
- 주석은 "왜"만 — "무엇"은 코드로 표현
- 이모지 사용 금지 (사용자가 명시적으로 요청하지 않는 한)

> 직전 작업: Phase 2까지 테스트 규칙 준수 — 단위 테스트 21/21 통과, 내보내기 기능은 아직 미구현.
> 다음 작업: Phase 3에서 파싱 순수 함수에 대한 단위 테스트(XSS 방지, GFM/수식 케이스) 필수 추가.

## 전문 에이전트

`.claude/agents/`에 4개의 서브에이전트가 정의되어 있다. 작업 성격에 맞춰 `Agent` 툴로 호출:

- **markdown-architect** — 전체 아키텍처 및 설계 결정
- **ui-designer** — UI/UX, 레이아웃, 테마, 접근성
- **parser-engineer** — 마크다운 파싱/렌더링, CodeMirror 확장
- **export-specialist** — HTML/MD 내보내기, IndexedDB 저장소

> 직전 작업: Phase 2 — `ui-designer` + `parser-engineer`가 레이아웃 및 CodeMirror 작업에 활용됨.
> 다음 작업: Phase 3에서 `parser-engineer`로 `unified` 파이프라인 설계, Phase 5에서 `export-specialist`로 IndexedDB 전환.
