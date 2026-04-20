// `.html` 독립형 내보내기.
// 1) 마크다운 → sanitize된 HTML (renderMarkdown)
// 2) 메모리 DOM에서 Mermaid 블록을 SVG로 인라인 치환 (renderMermaidBlocks, 동적 import)
// 3) 원격 이미지 fetch → base64 data URL 인라인 (CORS 실패 시 원본 URL 유지)
// 4) <!doctype html> 문서로 조립 후 Blob 다운로드
//
// 주의: Mermaid 모듈은 정적 import 금지. renderMermaidBlocks가 내부에서 동적 import로 로드한다.

import { renderMarkdown, containsMermaid } from '../markdown/pipeline';
import { renderMermaidBlocks } from '../markdown/mermaid';
import { exportStyles } from './styles';

const FALLBACK_TITLE = '제목 없음';
const MAX_FILENAME_LENGTH = 100;
// eslint-disable-next-line no-control-regex -- 파일명 sanitization에 제어 문자 클래스 필요
const FORBIDDEN_RE = /[<>:"/\\|?*\u0000-\u001f]/g;

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(FORBIDDEN_RE, '_').trim().replace(/^[.\s]+|[.\s]+$/g, '');
  const safe = cleaned.length > 0 ? cleaned : FALLBACK_TITLE;
  return safe.length > MAX_FILENAME_LENGTH ? safe.slice(0, MAX_FILENAME_LENGTH) : safe;
}

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('FileReader가 문자열을 반환하지 않았습니다'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader 오류'));
    reader.readAsDataURL(blob);
  });
}

function isRemoteUrl(src: string | null): src is string {
  if (!src) return false;
  return src.startsWith('http://') || src.startsWith('https://');
}

/**
 * 컨테이너 내부의 원격 이미지(<img src="http(s)://...">)를 fetch 후
 * base64 data URL로 교체한다. 실패(CORS, 404 등)는 원본 URL 유지하고 계속.
 */
export async function inlineImages(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll<HTMLImageElement>('img'));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src');
      if (!isRemoteUrl(src)) return;
      try {
        const res = await fetch(src, { mode: 'cors' });
        if (!res.ok) return;
        const blob = await res.blob();
        const dataUrl = await blobToDataURL(blob);
        img.setAttribute('src', dataUrl);
      } catch {
        // 원본 URL 유지. 독립 HTML을 오프라인에서 열 때만 이미지가 깨질 수 있다.
      }
    }),
  );
}

function buildDocument(title: string, body: string): string {
  const safeTitle = escapeHtml(title || FALLBACK_TITLE);
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>${exportStyles}</style>
</head>
<body>
${body}
</body>
</html>
`;
}

export async function downloadHtml(
  doc: { title: string; content: string },
  options?: { theme?: 'light' | 'dark' },
): Promise<void> {
  const theme = options?.theme ?? 'light';
  const rendered = await renderMarkdown(doc.content);

  // 하나의 오프스크린 컨테이너에서 Mermaid 치환과 이미지 인라인화를 연쇄 처리.
  // 화면에 노출하지 않도록 offscreen/hidden 속성을 부여한다.
  const container = document.createElement('div');
  container.setAttribute('aria-hidden', 'true');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.innerHTML = rendered;
  document.body.appendChild(container);

  try {
    if (containsMermaid(rendered)) {
      await renderMermaidBlocks(container, theme);
    }
    await inlineImages(container);
    const finalBody = container.innerHTML;
    const html = buildDocument(doc.title, finalBody);
    const base = sanitizeFilename(doc.title || FALLBACK_TITLE);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    triggerDownload(blob, `${base}.html`);
  } finally {
    container.remove();
  }
}
