import { defaultSchema } from 'rehype-sanitize';
import type { Schema } from 'hast-util-sanitize';

// rehype-sanitize의 defaultSchema를 KaTeX/highlight.js/Mermaid에 맞게 확장한다.
// - KaTeX 출력은 span.katex, span.katex-html, span.mathnormal 등 수많은 클래스를 쓰므로
//   모든 span/div/annotation/math 관련 태그에 className/style을 허용한다.
// - highlight.js 출력은 <code class="hljs language-xxx"><span class="hljs-keyword">...</span></code>
//   형태이므로 span/code의 className을 허용한다.
// - Mermaid 원본 코드블록은 <code class="language-mermaid">로 보존되어 클라이언트에서 SVG로 치환된다.
//   sanitize 단계에서는 language-mermaid 클래스와 svg 관련 출력이 통과되어야 한다(실제 SVG 주입은
//   후처리에서 DOM 조작으로 이루어지며 본 파이프라인을 거치지 않는다).
// - javascript:, vbscript: 같은 위험 프로토콜은 defaultSchema가 이미 차단한다(allowDangerousHtml:false와 결합).

const passThroughMath = ['math', 'annotation', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'ms', 'mtext'];

export const sanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // 모든 요소에 대해 className과 style을 허용 (기본 스키마는 제한적)
    '*': [
      ...(defaultSchema.attributes?.['*'] ?? []),
      'className',
      'style',
      // KaTeX 접근성 속성
      'ariaHidden',
      'role',
    ],
    // KaTeX/MathML 속성
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      'className',
      'style',
      'ariaHidden',
    ],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      'className',
      'style',
    ],
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      'className',
    ],
    pre: [
      ...(defaultSchema.attributes?.pre ?? []),
      'className',
    ],
    // 체크박스(GFM task list)는 disabled/checked를 허용해야 한다
    input: [
      ...(defaultSchema.attributes?.input ?? []),
      'checked',
      'disabled',
      ['type', 'checkbox'],
    ],
    // 링크: 기본 스키마가 href를 이미 sanitize (javascript: 차단)
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      'className',
      'target',
      'rel',
    ],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    // KaTeX가 생성하는 MathML 태그
    ...passThroughMath,
  ],
};
