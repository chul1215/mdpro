import { useEffect, useRef, useState } from 'react';
import { useDocumentStore } from '../../stores/documentStore';
import { useUIStore } from '../../stores/uiStore';

// 프리뷰 업데이트 debounce 간격. 타이핑 중 과도한 재렌더를 방지한다.
const DEBOUNCE_MS = 150;

// 파이프라인 모듈(unified + KaTeX + highlight.js)은 수백 KB에 달하므로 동적 import로 지연 로드.
// PreviewPane이 처음 마운트될 때(프리뷰 모드가 활성화되었을 때)만 네트워크 비용 발생.
type MarkdownModule = typeof import('../../lib/markdown');
let markdownModulePromise: Promise<MarkdownModule> | null = null;
const loadMarkdownModule = (): Promise<MarkdownModule> => {
  if (!markdownModulePromise) {
    markdownModulePromise = import('../../lib/markdown');
  }
  return markdownModulePromise;
};

export function PreviewPane() {
  const content = useDocumentStore((s) => s.content);
  const theme = useUIStore((s) => s.theme);
  const [html, setHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 마크다운 → HTML 변환. 150ms debounce + cancelled 플래그로 늦게 도착한 이전 결과를 무시한다.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      loadMarkdownModule()
        .then(({ renderMarkdown }) => renderMarkdown(content))
        .then((result) => {
          if (cancelled) return;
          setHtml(result);
          setError(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : String(err));
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [content]);

  // HTML 주입 후 Mermaid 코드블록을 SVG로 치환. Mermaid 미포함 시 동적 import도 피한다.
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const controller = new AbortController();
    loadMarkdownModule()
      .then(({ containsMermaid, renderMermaidBlocks }) => {
        if (!containsMermaid(html)) return;
        if (controller.signal.aborted) return;
        return renderMermaidBlocks(container, theme, controller.signal);
      })
      .catch(() => {
        // 개별 블록 에러는 renderMermaidBlocks 내부에서 fallback UI로 처리됨.
        // 여기서는 전체 로드 실패(mermaid 모듈 자체 로드 실패 등)만 조용히 무시.
      });
    return () => controller.abort();
  }, [html, theme]);

  return (
    <section
      aria-label="프리뷰"
      className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50 dark:bg-slate-900"
    >
      <div className="border-b border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
        프리뷰
      </div>
      <div
        className="flex-1 overflow-auto"
        aria-live="polite"
        aria-busy={false}
      >
        {error ? (
          <div
            role="alert"
            className="m-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200"
          >
            <strong>렌더 오류:</strong> {error}
          </div>
        ) : (
          <article
            ref={containerRef}
            className="prose prose-slate max-w-none p-6 dark:prose-invert"
            // 파이프라인에서 이미 rehype-sanitize를 거친 HTML만 주입한다.
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </section>
  );
}
