# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

MDPro는 초보자도 쉽게 쓸 수 있는 브라우저 기반 마크다운 에디터/뷰어다. 실시간 분할 프리뷰, 자동 저장(IndexedDB), HTML/MD 내보내기, 다크/라이트 테마를 지원한다. 설치 없이 브라우저에서 동작하며 순수 웹 표준(HTML/CSS/JS)으로 작성되어 OS 독립적이다.

사용자 대상 문서는 `README.md`(한글+영문), 릴리스 전 수동 검증 체크리스트는 `docs/manual-checklist.md`. 이 파일은 **개발자/Claude 에이전트 전용** 내부 가이드다.

## 작업 진행 현황

**`/init` 명령을 실행할 때마다 이 섹션을 최신 상태로 갱신한다.** 각 주요 섹션(Architecture, Commands, Project Rules 등)에도 해당 섹션 맨 아래에 "직전 작업 / 다음 작업" 메모를 한 줄씩 남겨, 다음 Claude 인스턴스가 어디까지 진행되었는지 즉시 파악할 수 있도록 한다. 형식 예:

```
> 직전 작업: Phase N — <무엇을 했는가>
> 다음 작업: Phase N+1 — <무엇을 할 예정인가>
```

### 전체 프로젝트 현황 (최종 갱신 2026-04-20 · Phase 7 완료 — 전체 로드맵 종료)

- **완료 페이즈**: Phase 0 (스캐폴딩) · Phase 1 (레이아웃) · Phase 2 (CodeMirror 에디터) · Phase 3 (unified 프리뷰 파이프라인) · Phase 4 (서식 툴바) · Phase 5 (IndexedDB 다중 문서) · Phase 6 (.md/.html 내보내기 + .md 가져오기) · Phase 7 (E2E 확대 · 접근성 자동 감사 · README/LICENSE · Cloudflare Pages 배포 설정 · 수동 검증 체크리스트)
- **작업 트리 상태**: Phase 7 단일 커밋 예정. 변경/신규: `@axe-core/playwright` devDep 추가, `e2e/{a11y,roundtrip,mobile}.spec.ts` 신설, `README.md` 신설, `LICENSE` 신설, `docs/manual-checklist.md` 신설, `public/_redirects` 신설(SPA fallback), `package.json`에 `license: MIT`. 접근성 위반 수정: `DropdownMenu` `<ul><li role="none">` → `<div role="menu">` 직자식으로 평탄화, Sidebar timestamp 색상 대비 강화(slate-500 → slate-600), `Sidebar <aside>`에 `role="navigation"` 명시, CodeMirror `cm-content`에 `aria-label="마크다운 편집기"` (EditorView.contentAttributes). 모바일 첫 방문 UX 개선: `uiStore.sidebarOpen` 기본값을 `matchMedia('(max-width: 767px)')` 감지로 분기.
- **현재 소스 상태**: E2E 8 시나리오(smoke/a11y × 2/roundtrip × 3/mobile × 2). axe-core 감사가 두 상태(초기/메뉴 open)에서 WCAG 2.1 AA 위반 0 검증. roundtrip은 새 문서→편집→제목 자동 추출(debounce 대기)→전환→삭제 모달 확정 + md/html 다운로드 이벤트 수신.
- **직전 작업**: Phase 7 — axe 감사 초기 실행에서 3 위반 발견·수정: `aria-input-field-name`(CodeMirror aria-label), `color-contrast`(Sidebar timestamp), `list`(DropdownMenu `<ul>` 구조). Sidebar 역할은 semantic하게 `<aside role="navigation">`로 승격해 E2E selector와 일치. 모바일 375px 뷰포트 테스트는 사이드바 backdrop이 파일 메뉴 클릭을 가로채는 문제를 발견해 `uiStore` 기본값을 모바일 분기로 변경(persist 있어 재방문자 선택은 유지). Cloudflare Pages: `public/_redirects`에 `/* /index.html 200`로 SPA fallback, Vite 프리셋 자동 감지. **단위 175/175 통과**, **E2E 8/8 통과**, 빌드 메인 **245.69KB gzipped** 유지.
- **향후 유지보수**: 수동 검증 체크리스트는 `docs/manual-checklist.md` 참조. 릴리스 후보마다 실기·스크린 리더·대용량 문서 성능 스팟체크를 수행할 것. 신규 페이즈가 필요해지면 이 블록 하단에 추가.
- **페이즈 로드맵**: 0 초기화 → 1 레이아웃 → 2 에디터 → 3 프리뷰 → 4 서식 툴바 → 5 문서 저장소 → 6 내보내기/가져오기 → **7 최종 검증(완료)**.
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

npx playwright test e2e/a11y.spec.ts           # 단일 E2E 스펙
npx playwright test --reporter=list            # 축약 리포터
npx playwright install chromium                # 최초 실행 시 브라우저 설치
```

E2E 스펙(`e2e/*.spec.ts`):
- `smoke.spec.ts` — 앱 최초 로드 (MDPro heading 가시 확인)
- `a11y.spec.ts` — axe-core로 초기/파일메뉴 오픈 상태 WCAG 2.1 AA 위반 0
- `roundtrip.spec.ts` — 새 문서→편집→제목 자동 추출(debounce)→전환→삭제 모달, `.md`/`.html` 다운로드 이벤트. 각 테스트 시작 시 `indexedDB.deleteDatabase('mdpro')`로 격리.
- `mobile.spec.ts` — 375×812 모바일 + 768×1024 태블릿 뷰포트 스모크

> 직전 작업: Phase 7 완료 — `npm run check` 175/175, `npm run build` 성공(메인 245.69KB gzipped), `npm run test:e2e` 8/8(smoke/a11y/roundtrip/mobile). axe-core로 WCAG 2.1 AA 위반 0 검증.
> 다음 작업: 신규 기능 추가 시 E2E 시나리오와 axe 감사 범위를 확장. 수동 항목은 `docs/manual-checklist.md`.

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
- **`src/stores/documentStore.ts`** — IndexedDB(`mdpro` DB, `documents` 스토어)를 소스로 하는 다중 문서 상태. `{ activeId, documents: Summary[], title, content, titleManual, loading }`. `persist` 미들웨어는 `activeId`만 localStorage 키 `mdpro-doc`에 저장(partialize). `hydrate()`는 앱 마운트 시 App.tsx가 호출. `setContent`는 800ms debounce로 IDB 쓰기(저장 시점에 activeId 클로저 캡처로 전환 race 방지) + titleManual=false면 첫 H1로 title 자동 갱신. `switchTo`는 진행 중 save flush 후 `getDocument`로 로드. `removeDocument`는 활성 문서 삭제 시 첫 잔존 문서로 전환, 전부 사라지면 `createDocument()` 자동 호출.
- **`src/stores/editorStore.ts`** — CodeMirror `EditorView` 인스턴스 핸들(`view | null`). Non-persistent. Editor 마운트/언마운트 시 `setView`로 등록/해제. Toolbar 및 외부 컴포넌트가 view에 접근해 `dispatch` 트랜잭션을 보낼 때 사용. non-serializable 값이므로 persist 금지.

### 영속 저장소 (`src/lib/storage/documents.ts`)

`idb` 기반 IndexedDB 어댑터. DB `mdpro` 버전 1, object store `documents`(keyPath `id`, 인덱스 `updatedAt`). 싱글톤 `dbPromise`로 중복 open 방지. `__resetForTests()`로 테스트 격리. 스키마:

```ts
type DocumentRecord = { id: string; title: string; content: string; createdAt: number; updatedAt: number };
```

API: `listDocuments()`(updatedAt desc), `getDocument(id)`, `createDocument(init?)`, `updateDocument(id, patch)`(updatedAt 자동 갱신), `deleteDocument(id)`. 테스트는 `fake-indexeddb/auto`를 `src/test/setup.ts`에서 전역 로드.

### Editor 문서 전환 분기 (`src/components/Editor/Editor.tsx`)

- `useDocumentStore.subscribe((state, prev) => ...)` 내부에서:
  - `activeId` 변경 → `view.setState(EditorState.create({ doc: content, extensions: buildExtensions(...) }))` — **undo 히스토리 격리**(다른 문서로 redo 불가).
  - 동일 `activeId`에서 `content` 변경 → `view.dispatch({ changes })` — 히스토리 유지.
- setState 시 `themeCompartmentRef.current = new Compartment()`로 교체해 테마 변경 useEffect와 충돌 방지. 확장 조립은 `buildExtensions(themeCompartment, theme)` 팩토리로 추출.

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

### 내보내기/가져오기 (`src/lib/export/*` + `src/components/Layout/{FileMenu,DropOverlay}.tsx`)

- **내보내기 포맷은 `.md`/`.html` 두 가지만** — PDF/DOCX 라이브러리 추가 금지(CLAUDE.md 규칙).
- `downloadMarkdown`: Blob(`text/markdown;charset=utf-8`) + 숨은 `<a>` click → revokeObjectURL. 파일명은 `sanitizeFilename(title || '제목 없음') + '.md'`.
- `downloadHtml`: (1) `renderMarkdown(content)`으로 파이프라인 실행 → (2) 오프스크린 `<div>`에 주입 후 `renderMermaidBlocks`로 SVG 치환(Mermaid 동적 import) → (3) `<img>` 순회 fetch→base64 시도(실패 시 원본 유지) → (4) `<!doctype html><html><head>...<style>${exportStyles}</style>...<body>${rendered}</body></html>` 조립. `exportStyles`는 `katex/dist/katex.min.css?raw` + `highlight.js/styles/github.css?raw` + 자체 타이포그래피를 연결. KaTeX 폰트는 woff2 경로 미해결이라 브라우저 기본 fallback.
- `readMarkdownFiles(files)`: 확장자(`.md`/`.markdown`) + 크기(`MAX_FILE_SIZE = 5MB`) 검증 → `file.text()` → `extractTitleFromMarkdown` 제목 추출, 빈 결과면 파일명(확장자 제외)을 fallback 제목. `ImportResult = { imported[], errors[] }` 형태로 부분 성공 허용.
- **Lazy import 필수**: `FileMenu`에서 `downloadMarkdown/downloadHtml/readMarkdownFiles`를 `await import(...)`로 동적 로드. 정적 import 시 unified 파이프라인 + CSS `?raw` 문자열이 메인 번들에 포함되어 ~200KB 증가.
- `DropOverlay`: `window`에 `dragenter/dragleave/dragover/drop` 리스너 + dragCounter로 child 전환 노이즈 흡수. `DataTransfer.types`는 TS DOM lib에서 `readonly string[]`이므로 `Array.from(dt.types).includes('Files')`로 판정(DOMStringList 캐스팅 금지).
- `DropdownMenu`: `role="menu"` + roving focus(ArrowUp/Down/Home/End) + 외부 클릭/ESC 닫기 + 닫힌 뒤 트리거 포커스 복원. `FileMenu`가 이를 사용해 TopBar에 배치.

### 서식 툴바 (`src/components/Toolbar/Toolbar.tsx` + `src/lib/editor/commands.ts`)

- **커맨드 층**: `src/lib/editor/commands.ts`의 순수 함수(`toggleBold/Italic/Strikethrough/InlineCode`, `toggleHeading(level)`, `toggleBulletList/NumberedList/CheckList/Quote`, `insertLink`, `insertCodeBlock`). 각 함수는 `EditorView`를 받아 `view.dispatch({ changes, selection })` 후 `view.focus()`. 멀티 selection range 독립 처리.
- **인라인 토글**: 선택이 이미 마커로 감싸져 있으면 제거, 빈 선택이면 마커 쌍 삽입 후 커서 중앙, 텍스트 선택이면 감싸고 감싼 범위로 선택 복원.
- **블록 토글**: 선택 포함 라인별로 prefix 교체 (`toggleBulletList`는 다른 블록 prefix도 인식해 교체, numbered list는 1부터 순차 번호).
- **좌표 처리 주의**: 여러 라인에 걸친 블록 토글에서 `changes.mapPos`를 쓰면 이미 변경된 좌표로 매핑돼 어긋난다 → **원본 좌표 기준**으로 prefix 계산 후 한 번에 trans 발행.
- **UI 층**: `Toolbar`가 `useEditorStore((s) => s.view)` 구독. view `null`이면 전체 버튼 `disabled`. `role="toolbar"` + roving tabindex(`ArrowLeft/Right/Home/End`) + OS별 Mod 표기 툴팁(⌘ vs Ctrl).
- **키맵**: Editor.tsx의 `keymap.of([...])`에 `Mod-b`/`Mod-i`를 `toggleBold/Italic` 래핑으로 추가.

### 테스트 구성

- **Vitest** + `jsdom` + `@testing-library/react`. 설정은 `vite.config.ts`의 `test:` 블록. `src/test/setup.ts`에서 `@testing-library/jest-dom` + `fake-indexeddb/auto` 전역 로드.
- `include: src/**/*.{test,spec}.{ts,tsx}` — Playwright `e2e/` 디렉토리는 제외.
- **Playwright** E2E는 `e2e/*.spec.ts` (`playwright.config.ts`에서 `webServer`로 dev 서버 자동 기동). `@axe-core/playwright`로 접근성 자동 감사.
- UI 테스트는 역할 기반 쿼리 사용 (`getByRole`, `getByLabelText`). `getByTestId`는 DOM 호스트가 필요한 CodeMirror 같은 경우만 제한적으로 사용.
- 스토어 테스트는 `beforeEach`에서 `localStorage.clear()` + `setState` 또는 `reset()`으로 격리. IDB 어댑터 테스트는 `indexedDB.deleteDatabase('mdpro')` + `__resetForTests()`.
- E2E 격리: roundtrip 테스트는 `page.evaluate(() => indexedDB.deleteDatabase('mdpro'))` + `localStorage.clear()`를 `beforeEach`에 둔다. Playwright 기본 context 격리로 충분하지 않은 경우(동일 origin 공유) 대비.

### TypeScript 설정

프로젝트 참조 방식:
- `tsconfig.json` → `tsconfig.app.json`(src, DOM) + `tsconfig.node.json`(vite/playwright 설정 파일, `@types/node`).
- `strict: true`, `noUnusedLocals`, `noUnusedParameters` 활성화.

### Vite / Vitest 버전 주의

`vite.config.ts`는 **`vitest/config`에서 `defineConfig`를 import**해야 `test:` 옵션이 타입 인식된다 (`vite`에서 import하면 타입 오류). Vitest 3.x + Vite 6.x 조합을 쓴다 — 버전 불일치 시 `PluginOption` 충돌이 발생한다.

### 번들 다이어트 전략

메인 엔트리를 ~246KB gzipped로 유지하기 위해 용량이 큰 모듈은 전부 **동적 import**로 분리한다:
- `src/lib/markdown/pipeline.ts`(unified + remark + rehype + KaTeX/hljs) — `PreviewPane`에서 첫 렌더 시 로드
- `mermaid` — `src/lib/markdown/mermaid.ts`의 `loadMermaid()`에서 필요 시 로드
- `src/lib/export/{markdown,html,import}` — `FileMenu`가 클릭 시점에 `await import()`

정적 import로 바뀌는 회귀가 생기면 메인이 즉시 400KB+로 튀므로, 빌드 로그에서 메인 엔트리 gzip 크기를 항상 확인할 것(현재 기준 245.69KB).

### 배포 (Cloudflare Pages)

- `public/_redirects`에 `/*  /index.html  200` — SPA fallback. 빌드 시 `dist/`로 자동 복사된다.
- Cloudflare Pages 대시보드 설정: Framework preset `Vite`, Build command `npm run build`, Output `dist`. Node 20+ 필요.
- IndexedDB(`mdpro`)는 origin 격리 — 동일 도메인에서만 데이터 공유.

> 직전 작업: Phase 7 — axe-core 감사 통합 후 3가지 위반(CodeMirror aria-label / Sidebar timestamp 색상 대비 / DropdownMenu `<ul>` 구조) 수정. Sidebar `<aside>`에 `role="navigation"` 승격. 모바일 첫 방문 UX: `uiStore.sidebarOpen` 기본값을 `matchMedia('(max-width: 767px)')`로 분기. Cloudflare Pages `_redirects` 추가.
> 다음 작업: 신규 기능 확장 시 기존 데이터 흐름 다이어그램과 `buildExtensions` 패턴을 먼저 확인. UI 컴포넌트는 TopBar/Toolbar/Sidebar의 포커스 링/aria 패턴을 재사용.

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

> 직전 작업: Phase 7 완료 — 단위 175/175 + E2E 8/8(smoke/a11y × 2/roundtrip × 3/mobile × 2). 자동 접근성 감사(axe WCAG 2.1 AA)는 초기/메뉴 오픈 두 상태에서 통과. HTML export 실물 렌더, 스크린 리더, 대용량 문서 성능은 `docs/manual-checklist.md`의 수동 영역.
> 다음 작업: 릴리스 후보마다 `docs/manual-checklist.md` 10개 영역 수행 후 통과 여부를 커밋 메시지 또는 릴리스 노트에 기록.

## 전문 에이전트

`.claude/agents/`에 4개의 서브에이전트가 정의되어 있다. 작업 성격에 맞춰 `Agent` 툴로 호출:

- **markdown-architect** — 전체 아키텍처 및 설계 결정
- **ui-designer** — UI/UX, 레이아웃, 테마, 접근성
- **parser-engineer** — 마크다운 파싱/렌더링, CodeMirror 확장
- **export-specialist** — HTML/MD 내보내기, IndexedDB 저장소

> 직전 작업: Phase 7 — axe 감사, E2E 확대, README/LICENSE, Cloudflare Pages `_redirects`는 메인 에이전트 단독으로 처리. 접근성 위반 수정 범위가 여러 컴포넌트에 걸쳐 작았기 때문에 서브에이전트 분산 없이 집중 수정이 더 효율적이었음.
> 다음 작업: 새 페이즈/기능이 필요할 때는 시그니처(타입/함수명)를 사전에 고정해 3~4개 서브에이전트를 병렬 실행. Phase 3~6 패턴이 성공적이었으므로 그대로 재사용.
