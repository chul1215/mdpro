import { describe, expect, it } from 'vitest';
import { renderMarkdown, containsMermaid } from './pipeline';

describe('renderMarkdown - XSS 방지', () => {
  it('removes <script> tags', async () => {
    const html = await renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
  });

  it('strips onerror and other event handlers from img', async () => {
    const html = await renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(html).not.toMatch(/onerror/i);
  });

  it('neutralizes javascript: URLs in links', async () => {
    const html = await renderMarkdown('[click](javascript:alert(1))');
    // 기본 스키마는 javascript: href를 제거하거나 href 자체를 삭제한다
    expect(html).not.toMatch(/href=["']javascript:/i);
  });

  it('strips onclick from anchor tags', async () => {
    const html = await renderMarkdown('<a href="x" onclick="alert(1)">link</a>');
    expect(html).not.toMatch(/onclick/i);
  });

  it('strips inline event handlers from raw HTML blocks', async () => {
    const html = await renderMarkdown('<div onmouseover="alert(1)">hi</div>');
    expect(html).not.toMatch(/onmouseover/i);
  });
});

describe('renderMarkdown - GFM', () => {
  it('renders task list checkboxes', async () => {
    const html = await renderMarkdown('- [x] done\n- [ ] todo');
    // sanitize가 checked/disabled를 유지해야 한다
    expect(html).toMatch(/<input[^>]*type="checkbox"/);
    expect(html).toMatch(/checked/);
  });

  it('renders GFM tables', async () => {
    const md = '| a | b |\n|---|---|\n| 1 | 2 |';
    const html = await renderMarkdown(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<th>a</th>');
    expect(html).toContain('<td>1</td>');
  });

  it('renders strikethrough', async () => {
    const html = await renderMarkdown('~~gone~~');
    expect(html).toContain('<del>gone</del>');
  });
});

describe('renderMarkdown - 수식 (KaTeX)', () => {
  it('renders inline math with katex class', async () => {
    const html = await renderMarkdown('$a^2 + b^2 = c^2$');
    expect(html).toMatch(/class="[^"]*katex/);
  });

  it('renders display math', async () => {
    const html = await renderMarkdown('$$\\int_0^1 x\\,dx$$');
    expect(html).toMatch(/class="[^"]*katex/);
  });
});

describe('renderMarkdown - 코드 하이라이트', () => {
  it('applies hljs classes to fenced code blocks with language', async () => {
    const md = '```js\nconst x = 1;\n```';
    const html = await renderMarkdown(md);
    expect(html).toMatch(/class="[^"]*hljs/);
    // const는 JS 키워드 → hljs-keyword로 감싸져야 한다
    expect(html).toMatch(/hljs-keyword/);
  });

  it('keeps language class on code element', async () => {
    const md = '```ts\ninterface A {}\n```';
    const html = await renderMarkdown(md);
    expect(html).toMatch(/class="[^"]*language-ts/);
  });
});

describe('renderMarkdown - Mermaid 보존', () => {
  it('preserves language-mermaid class for downstream rendering', async () => {
    const md = '```mermaid\ngraph TD;\nA-->B;\n```';
    const html = await renderMarkdown(md);
    expect(html).toMatch(/class="[^"]*language-mermaid/);
    // Mermaid 본문은 텍스트로 보존되어야 한다(클라이언트에서 mermaid.render 호출)
    expect(html).toContain('graph TD');
    // 화살표 본문(A-->B)이 텍스트로 보존되어야 한다. rehype-stringify는 > 를
    // 텍스트 내부에서는 이스케이프하지 않으므로 원본 그대로 유지된다.
    expect(html).toMatch(/A--&?.?gt;?B|A-->B/);
    // containsMermaid 헬퍼 검증
    expect(containsMermaid(html)).toBe(true);
  });

  it('containsMermaid returns false when absent', async () => {
    const html = await renderMarkdown('# no mermaid here');
    expect(containsMermaid(html)).toBe(false);
  });
});

describe('renderMarkdown - 기본 마크다운', () => {
  it('renders headings', async () => {
    const html = await renderMarkdown('# Title\n## Sub');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<h2>Sub</h2>');
  });

  it('renders links with safe href', async () => {
    const html = await renderMarkdown('[ok](https://example.com)');
    expect(html).toContain('href="https://example.com"');
  });

  it('renders bold and italic', async () => {
    const html = await renderMarkdown('**bold** and *italic*');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('handles empty input gracefully', async () => {
    const html = await renderMarkdown('');
    expect(typeof html).toBe('string');
  });
});
