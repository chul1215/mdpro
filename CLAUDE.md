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

### 전체 프로젝트 현황 (최종 갱신 2026-04-20 · Phase 4 완료, Phase 5는 다음 세션 예정)

- **완료 페이즈**: Phase 0 (스캐폴딩) · Phase 1 (레이아웃 · 테마/뷰모드 · 사이드바) · Phase 2 (CodeMirror 에디터 · documentStore · 양방향 바인딩) · Phase 3 (unified 프리뷰 파이프라인 · Mermaid · KaTeX · hljs · XSS 방지) · Phase 4 (서식 툴바 · editorStore view registry · 11개 서식 커맨드 · Mod-b/i 키맵)
- **작업 트리 상태**: Phase 3 / Phase 4 분리 커밋 2개 생성 예정 — (3) PreviewPane/index.css/main.tsx + `src/lib/markdown/` + unified/katex/mermaid/hljs deps; (4) Editor/Layout/TopBar + `src/components/Toolbar/` + `src/lib/editor/` + `src/stores/editorStore` + CLAUDE.md 갱신.
- **현재 소스 상태**: `src/lib/markdown/{pipeline,sanitize-schema,mermaid,index}.ts` + `src/lib/editor/commands.ts`(11개 서식 커맨드) + `src/stores/editorStore.ts`(view 레지스트리) + `src/components/Toolbar/Toolbar.tsx`(4그룹 13버튼, roving tabindex). `PreviewPane`이 파이프라인 동적 import + 150ms debounce. `src/components/Preview/` 미생성(Layout 하위 PreviewPane로 유지).
- **직전 작업**: Phase 4 — `editorStore`(non-persistent zustand)로 `EditorView` 핸들 공유. `src/lib/editor/commands.ts`에 인라인 토글 4종(bold/italic/strikethrough/inlineCode) + 헤딩 3종 + 리스트 3종(bullet/numbered 순차 번호/check) + quote + insertLink(선택 없으면 "링크 텍스트" placeholder 선택 상태) + insertCodeBlock(language 옵션) 구현. 각 커맨드는 멀티 selection range 처리하고 `view.dispatch` 후 `focus()`. `Toolbar`는 `role="toolbar"` + ArrowLeft/Right/Home/End roving tabindex + OS별 Mod 단축키 툴팁. Editor.tsx에 `Mod-b`/`Mod-i` 키맵과 view 레지스트리 등록/해제. TopBar 로고를 `<h1>`로 격상(접근성 + E2E 스모크 수렴). **단위 83/83 통과**(editorStore 2 + commands 36 + Toolbar 6 추가), E2E 1/1 통과, 빌드 성공(메인 238KB gzipped, Phase 3 대비 +3KB).
- **다음 작업 (Phase 5, 새 세션)**: `documentStore`를 IndexedDB(`idb`) 기반 다중 문서 모델로 확장. 문서 목록 · 생성/삭제/전환 · 자동 저장(debounced) · 타이틀 편집 · 사이드바에 문서 목록 렌더. `export-specialist`가 IndexedDB 스키마(문서 id/title/content/updatedAt) 및 낙관적 쓰기 전략 설계. 기존 `title/content` 단일 상태는 "현재 활성 문서 ID" + IndexedDB 쿼리 구조로 전환.
- **페이즈 로드맵**: 0 초기화 → 1 레이아웃 → 2 에디터 → 3 프리뷰 → 4 서식 툴바 → **5 문서 저장소/파일관리(다음)** → 6 내보내기/가져오기 → 7 최종 검증.
- **원격 저장소**: https://github.com/chul1215/mdpro (public, `main` → `origin/main`). 최초 푸시 커밋은 `e2e5dd6` (Phase 0~2 스냅샷).

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

> 직전 작업: Phase 4 완료 시 `npm run check` 전체 통과(83/83), `npm run build` 성공(메인 238KB gzipped, +3KB), `npm run dev`/`npm run preview` HTTP 200, `npm run test:e2e` 1/1 통과(Playwright chromium 최초 설치 후).
> 다음 작업: Phase 5 완료 시 동일 세트 재실행. IndexedDB 영속 로직은 `fake-indexeddb`로 단위 테스트하고, 문서 전환/자동 저장 UX는 E2E 케이스로 커버 권장.

## Architecture

### 전체 데이터 흐름

```
┌─────────────┐   setContent()    ┌──────────────────┐
│  Editor.tsx │ ────────────────▶ │ documentStore    │
│ (CodeMirror)│ ◀──────────────── │ (Zustand)        │
└──────┬──────┘   subscribe()     └────────┬─────────┘
       │ setView(view)                     │ content
       ▼                                   ▼
┌─────────────┐                  ┌──────────────────┐
│ editorStore │                  │   PreviewPane    │
│ (view핸들)  │                  │  unified/rehype  │
└──────┬──────┘                  └──────────────────┘
       │ view
       ▼
┌─────────────┐   dispatch()
│  Toolbar    │───► view (CodeMirror 트랜잭션)
│ (서식버튼)  │
└─────────────┘

┌─────────────┐   toggle/set      ┌──────────────────┐
│  TopBar /   │ ────────────────▶ │ uiStore          │
│  Layout     │ ◀──────────────── │ (Zustand+persist)│
└─────────────┘   subscribe       └──────────────────┘
```

### 상태 관리 패턴 (Zustand)

세 개의 스토어로 책임 분리:

- **`src/stores/uiStore.ts`** — 테마(`light|dark`), 뷰모드(`edit|split|preview`), 사이드바 상태. `persist` 미들웨어로 `localStorage` 키 `mdpro-ui`에 지속. 시스템 `prefers-color-scheme` 초기값 자동 감지.
- **`src/stores/documentStore.ts`** — 현재 열린 문서의 `title`, `content`. 아직 비영속(메모리만). Phase 5에서 IndexedDB 기반 다중 문서로 확장 예정.
- **`src/stores/editorStore.ts`** — CodeMirror `EditorView` 인스턴스 핸들(`view | null`). Non-persistent. Editor 마운트/언마운트 시 `setView`로 등록/해제. Toolbar 및 외부 컴포넌트가 view에 접근해 `dispatch` 트랜잭션을 보낼 때 사용. non-serializable 값이므로 persist 금지.

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
- 상단: `TopBar` → `Toolbar`(서식 도구, 뷰모드 무관 상시 표시)
- `viewMode !== 'preview'` → `EditorPane` 표시
- `viewMode !== 'edit'` → `PreviewPane` 표시
- 모바일(`<md`)은 세로 분할, 데스크톱(`≥md`)은 가로 분할 (Tailwind `flex-col md:flex-row`)
- 사이드바는 모바일에서 오버레이(`z-40` + 백드롭), 데스크톱에서 고정 컬럼

### 서식 툴바 (`src/components/Toolbar/Toolbar.tsx` + `src/lib/editor/commands.ts`)

- **커맨드 층**: `src/lib/editor/commands.ts`의 순수 함수(`toggleBold/Italic/Strikethrough/InlineCode`, `toggleHeading(level)`, `toggleBulletList/NumberedList/CheckList/Quote`, `insertLink`, `insertCodeBlock`). 각 함수는 `EditorView`를 받아 `view.dispatch({ changes, selection })` 후 `view.focus()`. 멀티 selection range 독립 처리.
- **인라인 토글**: 선택이 이미 마커로 감싸져 있으면 제거, 빈 선택이면 마커 쌍 삽입 후 커서 중앙, 텍스트 선택이면 감싸고 감싼 범위로 선택 복원.
- **블록 토글**: 선택 포함 라인별로 prefix 교체 (`toggleBulletList`는 다른 블록 prefix도 인식해 교체, numbered list는 1부터 순차 번호).
- **좌표 처리 주의**: 여러 라인에 걸친 블록 토글에서 `changes.mapPos`를 쓰면 이미 변경된 좌표로 매핑돼 어긋난다 → **원본 좌표 기준**으로 prefix 계산 후 한 번에 trans 발행.
- **UI 층**: `Toolbar`가 `useEditorStore((s) => s.view)` 구독. view `null`이면 전체 버튼 `disabled`. `role="toolbar"` + roving tabindex(`ArrowLeft/Right/Home/End`) + OS별 Mod 표기 툴팁(⌘ vs Ctrl).
- **키맵**: Editor.tsx의 `keymap.of([...])`에 `Mod-b`/`Mod-i`를 `toggleBold/Italic` 래핑으로 추가.

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

> 직전 작업: Phase 4 — `editorStore`로 view 공유(zustand view registry 채택; ref forwarding보다 슬래시 커맨드/전역 키 핸들러 확장에 유리). `src/lib/editor/commands.ts` 순수 함수 11종 + 36 단위 테스트. `Toolbar`는 `role="toolbar"` roving tabindex, view null 시 전체 disabled. `Editor.tsx`에 `Mod-b/i` 키맵. TopBar 로고를 `<h1>`로 격상하여 접근성 개선 + E2E 스모크 수렴.
> 다음 작업: Phase 5에서 `documentStore`를 IndexedDB(`idb`) 기반 다중 문서 모델로 확장 — 문서 스키마(id/title/content/updatedAt), 현재 활성 문서 ID 상태, 자동 저장 debounce(500~1000ms), 문서 목록/생성/삭제/전환 UI를 사이드바에 통합.

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

> 직전 작업: Phase 4까지 테스트 규칙 준수 — 단위 83/83 통과(commands 36 + Toolbar 6 + editorStore 2 추가). E2E 1/1 통과(Playwright chromium 최초 설치 필요했음). Mod-b/i 키 동작과 툴바 버튼 상태는 ui 단위 테스트 + E2E로 커버.
> 다음 작업: Phase 5에서 IndexedDB 어댑터 순수 테스트는 `fake-indexeddb`로, 문서 전환/자동 저장 타이밍은 vitest `vi.useFakeTimers()`로 검증. 복수 문서 전환 시 Editor의 `doc` 재설정이 undo 히스토리를 오염시키지 않도록 주의.

## 전문 에이전트

`.claude/agents/`에 4개의 서브에이전트가 정의되어 있다. 작업 성격에 맞춰 `Agent` 툴로 호출:

- **markdown-architect** — 전체 아키텍처 및 설계 결정
- **ui-designer** — UI/UX, 레이아웃, 테마, 접근성
- **parser-engineer** — 마크다운 파싱/렌더링, CodeMirror 확장
- **export-specialist** — HTML/MD 내보내기, IndexedDB 저장소

> 직전 작업: Phase 4 — `parser-engineer`가 `src/lib/editor/commands.ts`(11 함수 + 36 테스트), `ui-designer`가 `Toolbar.tsx`(4그룹 13버튼 + roving tabindex + 6 테스트)와 Layout 통합을 병렬로 담당. 시그니처를 사전에 고정해서 병렬 실행 가능했음.
> 다음 작업: Phase 5에서 `export-specialist`가 IndexedDB 스키마/어댑터(`src/lib/storage/` 신설 예정) + documentStore 확장 + 사이드바 문서 목록 UI를 주도. `markdown-architect`가 문서 전환 시 Editor undo 히스토리 처리와 auto-save race 전략을 검토.
