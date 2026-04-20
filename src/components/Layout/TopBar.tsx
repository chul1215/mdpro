import {
  Columns2,
  FileText,
  Eye,
  Moon,
  Sun,
  PanelLeft,
} from 'lucide-react';
import { useUIStore, type ViewMode } from '../../stores/uiStore';
import { useDocumentStore } from '../../stores/documentStore';

type ViewModeOption = {
  value: ViewMode;
  label: string;
  icon: typeof FileText;
};

const VIEW_MODES: ViewModeOption[] = [
  { value: 'edit', label: '편집만', icon: FileText },
  { value: 'split', label: '분할', icon: Columns2 },
  { value: 'preview', label: '프리뷰만', icon: Eye },
];

export function TopBar() {
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const title = useDocumentStore((s) => s.title);
  const setTitle = useDocumentStore((s) => s.setTitle);

  return (
    <header
      role="banner"
      className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="사이드바 토글"
          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        {/* md 이상에서만 시각적으로 노출. 기존 E2E(toBeVisible)가 1280px 기준이라 md+ 에선 유지. */}
        <h1 className="hidden text-sm font-semibold text-slate-900 md:block dark:text-slate-100">
          MDPro
        </h1>
      </div>

      <input
        type="text"
        aria-label="문서 제목"
        placeholder="제목 없음"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="min-w-0 flex-1 rounded bg-transparent px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
      />

      <div
        role="radiogroup"
        aria-label="뷰 모드"
        className="flex shrink-0 items-center gap-0.5 rounded-md bg-slate-100 p-0.5 dark:bg-slate-800"
      >
        {VIEW_MODES.map(({ value, label, icon: Icon }) => {
          const active = viewMode === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={label}
              title={label}
              onClick={() => setViewMode(value)}
              className={
                'flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ' +
                (active
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100')
              }
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
        title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
        className="shrink-0 rounded p-1.5 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </header>
  );
}
