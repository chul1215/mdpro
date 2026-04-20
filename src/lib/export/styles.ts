// 독립형 HTML 내보내기에 주입할 CSS 번들.
// KaTeX/highlight.js 정적 CSS를 `?raw`로 문자열 임포트해 <style> 태그 하나로 합친다.
// @font-face url()은 상대 경로이므로 woff2 폰트는 독립 문서에서 로드되지 않고
// 브라우저 기본 폰트로 fallback된다(허용 범위 — Phase 6 밖).

import katexCSS from 'katex/dist/katex.min.css?raw';
import hljsCSS from 'highlight.js/styles/github.css?raw';

const BASE_STYLES = `
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif; max-width: 768px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1a202c; background: #ffffff; }
h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin-top: 1.5em; margin-bottom: 0.5em; }
h1 { font-size: 2em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
h2 { font-size: 1.5em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
h3 { font-size: 1.25em; }
p { margin: 0.75em 0; }
a { color: #2563eb; }
pre { background: #f6f8fa; border-radius: 6px; padding: 1rem; overflow-x: auto; }
code { background: rgba(175,184,193,0.2); padding: 0.2em 0.4em; border-radius: 3px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 85%; }
pre > code { background: transparent; padding: 0; }
blockquote { border-left: 4px solid #d1d5db; padding-left: 1rem; color: #4b5563; margin: 1em 0; }
table { border-collapse: collapse; margin: 1em 0; }
table th, table td { border: 1px solid #d1d5db; padding: 0.5em 0.75em; }
table th { background: #f3f4f6; }
img { max-width: 100%; height: auto; }
hr { border: 0; border-top: 1px solid #e2e8f0; margin: 2em 0; }
.mermaid-diagram { display: flex; justify-content: center; margin: 1.5rem 0; }
.mermaid-diagram svg { max-width: 100%; height: auto; }
.mermaid-error { border: 1px solid #fca5a5; background: #fef2f2; color: #991b1b; padding: 0.75rem; border-radius: 6px; margin: 1rem 0; }
.mermaid-error pre { background: transparent; padding: 0; margin-top: 0.5rem; white-space: pre-wrap; font-size: 0.8rem; }
ul, ol { padding-left: 2em; }
`;

export const exportStyles = `${BASE_STYLES}
/* highlight.js — GitHub 테마 */
${hljsCSS}
/* KaTeX */
${katexCSS}
`;
