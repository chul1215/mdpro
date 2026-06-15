# MD Practice

**SMC AI실무도입전환 프로젝트 · 초보자도 쓰기 쉬운 브라우저 기반 마크다운 에디터·뷰어**

설치 없이 브라우저에서 바로 동작합니다. 순수 웹 표준(HTML/CSS/JS)으로 작성되어 OS에 관계없이 같은 경험을 제공하며, 문서는 IndexedDB에 자동 저장되어 서버 없이도 사용할 수 있습니다.

## 주요 기능

- **실시간 분할 프리뷰** — 편집과 렌더 결과를 나란히 확인
- **GitHub Flavored Markdown** — 표, 체크박스, 취소선, 자동링크
- **인라인 각주** — `^[각주 내용]` 문법으로 본문 번호와 하단 각주 목록 자동 생성
- **수학 수식** — KaTeX 기반 `$...$`, `$$...$$`
- **다이어그램** — Mermaid 코드블록 자동 렌더
- **코드 하이라이트** — highlight.js (Mermaid 제외 언어 자동 인식)
- **서식 툴바** — 굵게/기울임/취소선/인라인 코드/헤딩/목록/링크/코드블록/인용
- **다중 문서·폴더 관리** — IndexedDB 기반 자동 저장, 문서 목록/생성/삭제/전환, 폴더별 분류·이동·삭제
- **내보내기·가져오기** — `.md`(Blob 다운로드), `.html`(완전 독립형 문서, Mermaid SVG 인라인), 드래그 앤 드롭 또는 파일 선택
- **Google 계정 문서·폴더 동기화/보내기/받기** — Firebase Auth 로그인 후 내 문서와 폴더/보안 폴더 정보를 Firestore에 동기화해 다른 기기에서도 불러오고, 현재 MD 문서 사본을 다른 Google 이메일로 전송하고, 받은 문서함에서 내 문서로 가져오기
- **주소록** — 자주 보내는 사람의 이름/Google 이메일을 브라우저 localStorage에 저장하고 문서 보내기에서 빠르게 선택
- **보안 폴더** — 특정 폴더에 암호코드를 지정해 해제 전까지 문서 목록을 숨김
- **다크·라이트 테마** — 시스템 설정 자동 감지
- **반응형** — 모바일에서는 사이드바 오버레이, 데스크톱에서는 고정 컬럼
- **접근성** — 키보드 네비게이션, `role`·`aria-label`, 포커스 관리, WCAG 2.1 AA 위반 0 (axe-core 자동 감사)

## 빠른 시작 (사용자)

배포된 웹앱을 브라우저에서 열면 바로 사용할 수 있습니다. 별도 설치·로그인·네트워크 접근이 필요 없습니다.

**기본 사용법**
1. 좌측 에디터 영역에 마크다운을 입력합니다.
2. 우측에서 실시간 렌더 결과를 확인합니다.
3. 상단 툴바로 서식을 토글하거나 `Ctrl/⌘+B`, `Ctrl/⌘+I` 같은 단축키를 사용합니다.
4. 문서 제목은 본문 첫 `#` 헤딩에서 자동 추출되며 상단에서 수동 편집도 가능합니다.
5. 본문 중 `^[각주 내용]`을 입력하면 프리뷰에서 자동으로 번호가 붙고 문서 하단에 각주 목록이 생성됩니다.
6. 사이드바의 **+ 새 문서** 버튼으로 여러 문서를 만들고 전환할 수 있습니다.
7. 사이드바 문서 탭의 **폴더** 버튼으로 분류 폴더를 만들고, 문서 행의 **폴더 이동** 선택창으로 문서를 옮길 수 있습니다. 폴더 옆 휴지통 버튼으로 폴더를 삭제하면 폴더 안 문서는 삭제되지 않고 **전체 문서**로 이동합니다.
8. **보안** 버튼으로 암호코드가 필요한 폴더를 만들 수 있습니다. 잠긴 폴더는 암호코드 입력 후 열거나 삭제할 수 있습니다.
9. 파일 메뉴(상단 우측 아이콘)에서 `.md`/`.html` 내보내기, `.md` 가져오기를 할 수 있습니다.
10. 마크다운 파일을 창에 드래그 앤 드롭하면 새 문서로 가져옵니다.
11. 상단의 Google 로그인 후 내 문서와 폴더/보안 폴더 정보는 자동으로 클라우드에 동기화됩니다. 다른 컴퓨터나 모바일에서도 같은 Google 계정으로 로그인하면 내 문서 목록과 폴더 구조를 불러오며, 로그아웃하면 계정 문서와 폴더는 화면에서 숨겨집니다.
12. 로그인 상태에서 **문서 보내기** 버튼으로 현재 문서 사본을 다른 사용자 이메일에 보낼 수 있습니다.
13. 사이드바 **받은함** 탭에서 받은 문서를 확인하고 **내 문서로 가져오기**를 누르면 내 문서 목록에 복사됩니다.
14. 사이드바 **주소록** 탭에서 자주 보내는 사람을 저장하거나, 문서 보내기 화면에서 **주소록에 저장**을 체크해 자동 추가할 수 있습니다.

**데이터 보관**
- 로그아웃 상태의 문서와 폴더 정보는 브라우저의 IndexedDB/localStorage에 저장되며, 같은 기기·브라우저에서만 접근할 수 있습니다. Google 로그인 시 기존 로컬 문서와 폴더/보안 폴더 메타데이터는 내 계정의 Firestore 문서로 업로드되고, 이후 로그인 상태의 편집 내용과 폴더 변경은 클라우드에 자동 저장됩니다.
- 보안 폴더 암호코드 해시는 Firestore에 동기화됩니다. 보안 폴더는 UI 잠금 기능이며, 기기 자체 보안과 내보내기 백업 관리를 함께 사용하세요.
- 다른 사용자에게 보낸 문서는 Firebase Firestore에 문서 사본으로 저장됩니다. 민감한 정보는 공유 전에 반드시 확인하세요.
- 주소록은 현재 브라우저의 localStorage에만 저장됩니다.
- 중요한 문서는 `.md`/`.html`로 내보내 백업하세요.

## 개발 환경

**요구 사항**
- Node.js 20 이상 권장
- npm 10 이상

**설치 및 실행**
```bash
git clone https://github.com/chul1215/mdpro.git
cd mdpro
npm install
npm run dev          # Vite 개발 서버 (http://localhost:5173)
```

**검증**
```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test         # vitest (단위·통합, e2e 제외)
npm run check        # typecheck + lint + test 한번에
npm run build        # tsc -b && vite build → dist/
npm run preview      # 빌드 결과물 로컬 미리보기
npm run test:e2e     # playwright (접근성 감사 + 왕복 시나리오 + 모바일/태블릿)
```

E2E는 최초 실행 시 `npx playwright install chromium`으로 브라우저 설치가 필요합니다.

**Google 로그인/문서 공유 설정**

로컬 개발에서는 `.env.local`에 Firebase Web App 값을 추가합니다. 이 파일은 커밋하지 않습니다.

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
```

Firebase 콘솔/배포 환경에서 다음을 설정합니다.

1. Authentication → Sign-in method → Google Provider 활성화
2. Authentication → Settings → Authorized domains에 배포 도메인 추가
3. Firestore Database 생성
4. `firebase/firestore.rules` 내용을 Firestore Rules에 배포
5. GitHub Actions secrets에 같은 `VITE_FIREBASE_*` 값을 등록
   - `.github/workflows/deploy.yml`의 Build 단계에서 secrets를 Vite 빌드 환경변수로 주입합니다.

Firebase 환경 변수가 없으면 앱의 기존 로컬 편집/저장 기능은 계속 동작하고, 로그인/공유 버튼에는 설정 누락 오류가 표시됩니다.

## 아키텍처 요약

**스택**
- Vite 6 + React 18 + TypeScript (strict)
- CodeMirror 6 (에디터)
- unified(remark/rehype) — 마크다운 파이프라인
- KaTeX, highlight.js, Mermaid — 확장 렌더
- Zustand — 상태 관리
- `idb` + IndexedDB — 문서 영속
- Firebase Auth + Firestore — Google 로그인 및 문서 사본 공유
- TailwindCSS — 스타일
- Vitest + Testing Library + Playwright — 테스트

**주요 디렉터리**
```
src/
├─ components/       # UI 컴포넌트 (Editor, Layout, Toolbar, Menu, Modal)
├─ stores/           # Zustand 스토어 (ui / document / editor)
├─ lib/
│  ├─ markdown/      # unified 파이프라인, Mermaid 후처리, 제목 추출
│  ├─ editor/        # CodeMirror 서식 커맨드
│  ├─ storage/       # IndexedDB 어댑터
│  ├─ export/        # .md/.html 내보내기, .md 가져오기
│  ├─ auth/          # Firebase Google 로그인 어댑터
│  ├─ firebase/      # Firebase 초기화/config
│  └─ sharing/       # Firestore 문서 공유 서비스
└─ hooks/            # 테마, 기타 커스텀 훅
e2e/                 # Playwright 시나리오 (smoke, a11y, roundtrip, mobile)
firebase/            # Firestore 보안 규칙
```

상세 내부 구조·개발 관례는 [`CLAUDE.md`](./CLAUDE.md)를 참고하세요.

**번들 전략**
- 메인 엔트리 약 246KB gzipped
- 마크다운 파이프라인(186KB gzipped)은 프리뷰 첫 렌더 시 동적 import
- Mermaid 코어(147KB+)는 다이어그램 포함 문서에서만 지연 로드
- 내보내기 모듈은 파일 메뉴 클릭 시 동적 import

## 배포 (Cloudflare Pages)

이 저장소는 Cloudflare Pages의 기본 Vite 프리셋과 호환됩니다.

1. Cloudflare Pages 대시보드에서 **"Connect to Git"** → 이 저장소 선택
2. 빌드 설정
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node version**: `20` (환경 변수 `NODE_VERSION=20` 또는 프로젝트 설정)
3. SPA 라우팅은 `public/_redirects`(빌드 시 `dist/`로 복사됨)로 처리됩니다.

다른 정적 호스팅(Netlify, Vercel, GitHub Pages 등)에서도 동일한 빌드 산출물(`dist/`)을 그대로 배포할 수 있습니다.

## 라이선스

[MIT](./LICENSE)

---

## English Summary

MD Practice (SMC AI실무도입전환 프로젝트) is a browser-based markdown editor and viewer for beginners. It runs entirely in the browser with no installation, saving documents to IndexedDB via `idb`. Features include real-time split preview, GitHub Flavored Markdown, KaTeX math, Mermaid diagrams, syntax highlighting, formatting toolbar, multi-document management, `.md`/`.html` export (standalone HTML with inlined Mermaid SVG), `.md` import via file picker or drag-and-drop, dark/light theme, responsive layout, and WCAG 2.1 AA-clean accessibility (verified by axe-core).

Built with Vite 6, React 18, TypeScript strict, CodeMirror 6, unified (remark/rehype), Zustand, TailwindCSS. Licensed under [MIT](./LICENSE). See the Korean section above for setup and usage details.
