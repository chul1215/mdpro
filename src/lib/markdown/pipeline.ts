import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { sanitizeSchema } from './sanitize-schema';

// 파이프라인 인스턴스는 모듈 레벨에서 단 한 번 생성하여 모든 렌더 호출에서 재사용한다.
// unified processor는 thread-safe하지 않지만 브라우저 메인 스레드에서는 동기적으로 실행되므로
// 재진입 없이 안전하게 재사용 가능하다.
//
// 플러그인 순서가 중요하다:
//   1. remark-parse     → 마크다운 문자열을 mdast로 파싱
//   2. remark-gfm       → 표/체크박스/취소선/자동링크 확장
//   3. remark-math      → $...$ 를 math 노드로 파싱 (remark-rehype 전에 있어야 한다)
//   4. remark-rehype    → mdast → hast 변환 (allowDangerousHtml:false로 raw HTML 제거)
//   5. rehype-katex     → math 노드를 KaTeX HTML로 치환
//   6. rehype-highlight → <code class="language-xxx">를 hljs 클래스로 하이라이트
//                         ignoreMissing: 언어 탐지 실패 시(예: mermaid) 원본 보존
//                         subset: false로 자동 언어 탐지 비활성화(성능 + mermaid 보존)
//   7. rehype-sanitize  → 확장 스키마로 XSS 제거 (KaTeX/hljs 클래스 허용)
//   8. rehype-stringify → HTML 문자열로 직렬화
//
// Mermaid 통합 전략:
// rehype-highlight는 language-mermaid 코드에 대해 언어 정의가 없으므로 hljs 하이라이트를
// 시도하지 않고 <code class="language-mermaid">...</code>를 그대로 보존한다
// (ignoreMissing: true 필수). 이후 PreviewPane이 DOM 주입 후 mermaid.run으로 치환한다.

// subset: [] 는 rehype-highlight의 자동 언어 탐지를 비활성화한다(언어 명시된 경우만 하이라이트).
// 이는 mermaid/plantuml 등 hljs가 모르는 언어 블록을 원본 그대로 남기기 위해 필요하며, 성능에도 유리하다.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeKatex)
  .use(rehypeHighlight, { ignoreMissing: true, subset: [] })
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify)
  .freeze();

/**
 * 마크다운 문자열을 sanitize된 HTML 문자열로 변환한다.
 * 동기 파이프라인이지만 향후 Web Worker 이관을 위해 Promise를 반환한다.
 */
export async function renderMarkdown(md: string): Promise<string> {
  const file = await processor.process(md);
  return String(file);
}

/**
 * 주어진 HTML에 Mermaid 코드블록이 포함되어 있는지 빠르게 판정한다.
 * PreviewPane이 Mermaid 런타임을 지연 로드할지 결정할 때 쓴다.
 */
export function containsMermaid(html: string): boolean {
  return html.includes('language-mermaid');
}
