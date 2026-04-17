import { useUIStore } from '../../stores/uiStore';

export function Sidebar() {
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  return (
    <>
      <button
        type="button"
        aria-label="사이드바 닫기"
        onClick={() => setSidebarOpen(false)}
        className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
      />
      <aside
        aria-label="문서 목록"
        className="absolute left-0 top-12 z-40 flex h-[calc(100%-3rem)] w-64 flex-col border-r border-slate-200 bg-slate-50 shadow-lg md:static md:top-0 md:h-full md:w-56 md:shadow-none dark:border-slate-700 dark:bg-slate-950"
      >
        <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
          문서
        </div>
        <div className="flex-1 overflow-y-auto p-2 text-sm text-slate-500 dark:text-slate-400">
          <p>Phase 5에서 문서 목록 구현</p>
        </div>
      </aside>
    </>
  );
}
