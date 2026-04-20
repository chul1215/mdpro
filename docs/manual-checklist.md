# 수동 검증 체크리스트

자동화된 테스트(`npm run check`, `npm run test:e2e`)가 모두 통과한 뒤에도, 다음 항목은 실제 브라우저·디바이스에서 사람이 직접 확인해야 한다. 배포 직전 또는 릴리스 후보 단계에서 전수 점검할 것.

## 1. 모바일 / 태블릿 실기 확인

- [ ] iOS Safari (iPhone) — 최신 + 1세대 이전
- [ ] Android Chrome — 최신
- [ ] iPad Safari (가로/세로)
- [ ] 뷰포트 320px 폭(가장 좁은 경우)에서 TopBar 요소 overflow 없음
- [ ] 사이드바 오버레이 열기/닫기 시 백드롭 클릭으로 닫힘
- [ ] 소프트 키보드가 올라올 때 에디터가 가려지지 않는지
- [ ] 드래그 앤 드롭이 모바일 파일 매니저에서 지원되는지(제한적) — 파일 선택 대체 경로 확인

## 2. 스크린 리더 검증

- [ ] macOS VoiceOver — `Cmd+F5`
- [ ] Windows NVDA — 무료
- [ ] 다음 랜드마크가 순회되는지: banner (TopBar) → navigation (Sidebar) → main/region (Editor/Preview)
- [ ] 파일 메뉴 드롭다운이 "메뉴, 3개 항목" 식으로 안내되는지
- [ ] 삭제 모달이 열릴 때 포커스가 이동하고 역할이 "dialog"로 안내되는지
- [ ] ESC로 모달·메뉴가 닫히고 트리거에 포커스가 복원되는지

## 3. 키보드 전용 시나리오

- [ ] 마우스 없이 Tab/Shift+Tab/화살표로 모든 기능 접근 가능
- [ ] 툴바 내에서 ←→ 이동, Home/End 양 끝
- [ ] 메뉴 내에서 ↑↓ 이동, Enter 선택, ESC 취소
- [ ] `Ctrl/⌘+B`, `Ctrl/⌘+I` 서식 토글
- [ ] 포커스 링이 눈에 잘 보이는지 (특히 다크 모드)

## 4. 렌더링 정확성

- [ ] KaTeX 수식: `$x^2 + y^2 = z^2$`, 블록 수식 `$$\int_0^1 x\,dx$$`
- [ ] Mermaid: flowchart, sequence, gantt 각 1건
- [ ] 표, 체크박스, 취소선, 인라인 코드, 코드블록(언어 지정)
- [ ] 다크 모드에서 코드블록 가독성 (hljs github 테마의 다크 오버라이드)
- [ ] XSS 시도: `<script>alert(1)</script>`, `<img onerror=alert(1) src=x>` 가 무효화되는지 (rehype-sanitize)

## 5. 내보내기 검증

- [ ] `.md` 다운로드 — 본문 그대로
- [ ] `.html` 다운로드 — 다른 브라우저 창/오프라인에서 열어 스타일이 적용되는지
- [ ] HTML 내 Mermaid SVG가 인라인되어 있는지(네트워크 차단 상태에서 확인)
- [ ] HTML 내 KaTeX 수식이 최소한 읽을 수 있는 수준으로 렌더되는지 (폰트는 브라우저 기본 fallback)
- [ ] 이미지 base64 인라인화: `http://` 이미지가 있는 문서 내보내기 시 CORS 제한이 있는 외부 이미지는 원본 URL 유지되는지

## 6. 가져오기 검증

- [ ] 파일 선택 `.md`, `.markdown` 단일/다중 파일
- [ ] `.txt` 같은 비허용 확장자 → alert로 거부 메시지
- [ ] 5MB 초과 파일 → alert로 거부 메시지
- [ ] 드래그 앤 드롭: 여러 파일 동시 드롭
- [ ] 드래그 중 오버레이가 표시되고, 드롭 영역 밖으로 빠지면 사라지는지

## 7. 성능 스팟체크

- [ ] 대용량 문서 입력 (1MB, 5만 라인)에서 타이핑 지연 없는지
- [ ] 자동 저장 debounce(800ms) 후 IndexedDB 쓰기 완료 시 UI 응답성 유지
- [ ] Mermaid 다이어그램 10개 이상 포함 시 첫 프리뷰 렌더 시간
- [ ] Lighthouse Performance 점수 ≥ 90 (Preview 빌드)

## 8. 테마 전환

- [ ] TopBar 테마 토글 → TailwindCSS `.dark` 클래스 토글 + CodeMirror 테마 + Mermaid 테마 연동
- [ ] 시스템 테마 변경 시 앱이 이미 저장된 선택을 유지하는지(persist)
- [ ] 다크에서 highlight.js 가독성

## 9. 데이터 무결성

- [ ] 새로고침 후 마지막 활성 문서 복원
- [ ] 한 문서 삭제 후 잔존 문서 중 최신으로 자동 전환
- [ ] 모든 문서 삭제 시 새 빈 문서가 자동 생성되는지
- [ ] 문서 전환 도중 debounce 중이던 저장이 이전 문서에 제대로 기록되는지 (race 없음)

## 10. 배포 후 확인

- [ ] Cloudflare Pages URL에서 HTTPS로 정상 로드
- [ ] SPA 라우팅: 존재하지 않는 경로(예: `/foo`) 접근 시 `index.html` fallback (404 아님)
- [ ] IndexedDB origin 격리 — 다른 Pages 배포와 데이터 섞이지 않는지
- [ ] Lighthouse SEO/Best Practices (선택 사항)

---

체크리스트 수행 중 발견한 이슈는 GitHub Issues에 기록하고, 해결까지 포함된 새 릴리스에만 "Phase 7 수동 검증 완료" 태그를 붙인다.
