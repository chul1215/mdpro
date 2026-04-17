export function PreviewPane() {
  return (
    <section
      aria-label="프리뷰"
      className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50 dark:bg-slate-900"
    >
      <div className="border-b border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
        프리뷰
      </div>
      <div className="flex-1 overflow-auto p-4 text-sm text-slate-500 dark:text-slate-400">
        Phase 3에서 마크다운 렌더링
      </div>
    </section>
  );
}
