// Mermaid는 전체 번들에 수백 KB를 추가하므로 동적 import로 지연 로드한다.
// 마크다운에 mermaid 코드블록이 포함된 경우에만 호출된다.

type MermaidAPI = {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, text: string) => Promise<{ svg: string; bindFunctions?: (el: Element) => void }>;
};

let mermaidPromise: Promise<MermaidAPI> | null = null;
let currentTheme: 'light' | 'dark' | null = null;

async function loadMermaid(theme: 'light' | 'dark'): Promise<MermaidAPI> {
  if (mermaidPromise && currentTheme === theme) return mermaidPromise;
  currentTheme = theme;
  mermaidPromise = import('mermaid').then((mod) => {
    const mermaid = mod.default as MermaidAPI;
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'strict',
    });
    return mermaid;
  });
  return mermaidPromise;
}

/**
 * 컨테이너 안의 <code class="language-mermaid">...</code> 블록을 찾아
 * Mermaid SVG로 치환한다. 실패 시 원본 코드와 에러 메시지를 fallback 렌더.
 *
 * @param container 렌더된 HTML이 주입된 DOM 요소
 * @param theme    'light' | 'dark' — Mermaid 테마 매핑에 사용
 * @param signal   취소 신호 — 프리뷰 재렌더 시 이전 호출 결과 반영 방지
 */
export async function renderMermaidBlocks(
  container: HTMLElement,
  theme: 'light' | 'dark',
  signal?: AbortSignal,
): Promise<void> {
  const codeBlocks = Array.from(
    container.querySelectorAll<HTMLElement>('code.language-mermaid'),
  );
  if (codeBlocks.length === 0) return;

  const mermaid = await loadMermaid(theme);
  if (signal?.aborted) return;

  await Promise.all(
    codeBlocks.map(async (code, index) => {
      if (signal?.aborted) return;
      const source = code.textContent ?? '';
      const wrapper = code.parentElement?.tagName === 'PRE' ? code.parentElement : code;
      const id = `mermaid-${Date.now()}-${index}`;
      try {
        const { svg } = await mermaid.render(id, source);
        if (signal?.aborted) return;
        const div = document.createElement('div');
        div.className = 'mermaid-diagram my-4 flex justify-center';
        div.innerHTML = svg;
        wrapper.replaceWith(div);
      } catch (err) {
        if (signal?.aborted) return;
        const msg = err instanceof Error ? err.message : String(err);
        const fallback = document.createElement('div');
        fallback.className =
          'mermaid-error my-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200';
        const title = document.createElement('strong');
        title.textContent = 'Mermaid 렌더 오류';
        const pre = document.createElement('pre');
        pre.className = 'mt-2 whitespace-pre-wrap text-xs';
        pre.textContent = `${msg}\n\n${source}`;
        fallback.appendChild(title);
        fallback.appendChild(pre);
        wrapper.replaceWith(fallback);
      }
    }),
  );
}
