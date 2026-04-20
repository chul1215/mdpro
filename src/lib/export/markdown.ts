// `.md` 파일 다운로드. 브라우저에서 Blob + 숨은 <a>.click()으로 구현한다.
// 순수 사이드이펙트 함수이므로 단위 테스트는 URL/createObjectURL/click을 모킹해 검증한다.

const FALLBACK_TITLE = '제목 없음';
const MAX_FILENAME_LENGTH = 100;

// 파일 시스템 금지 문자(Windows/POSIX 공통 + 제어 문자)를 언더스코어로 치환한다.
// 이모지/한글 등 멀티바이트는 허용 — 대부분의 최신 파일시스템에서 문제없다.
// eslint-disable-next-line no-control-regex -- 파일명 sanitization에 제어 문자 클래스 필요
const FORBIDDEN_RE = /[<>:"/\\|?*\u0000-\u001f]/g;

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(FORBIDDEN_RE, '_').trim().replace(/^[.\s]+|[.\s]+$/g, '');
  const safe = cleaned.length > 0 ? cleaned : FALLBACK_TITLE;
  // 확장자 붙일 여유를 둬야 하므로 제한을 보수적으로 본문에만 적용한다.
  return safe.length > MAX_FILENAME_LENGTH ? safe.slice(0, MAX_FILENAME_LENGTH) : safe;
}

// Firefox는 DOM에 연결되지 않은 <a>.click()을 무시할 수 있어 append → click → remove 순서가 필요하다.
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadMarkdown(doc: { title: string; content: string }): void {
  const base = sanitizeFilename(doc.title || FALLBACK_TITLE);
  const filename = `${base}.md`;
  const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
  triggerDownload(blob, filename);
}
