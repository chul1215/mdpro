import { Columns2, Eye, FileText } from 'lucide-react';
import { useUIStore, type ViewMode } from '../../stores/uiStore';

const TABS: Array<{ value: ViewMode; label: string; icon: typeof FileText }> = [
  { value: 'edit', label: '편집', icon: FileText },
  { value: 'split', label: '분할', icon: Columns2 },
  { value: 'preview', label: '프리뷰', icon: Eye },
];

export function MobileViewTabs() {
  const viewMode = useUIStore((state) => state.viewMode);
  const setViewMode = useUIStore((state) => state.setViewMode);

  return (
    <div
      role="tablist"
      aria-label="모바일 뷰 모드"
      className="mobile-view-tabs grid min-h-[62px] shrink-0 grid-cols-3 border-t border-black/10 bg-white/75 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-glass backdrop-saturate-glass md:hidden dark:border-white/15 dark:bg-black/75"
    >
      {TABS.map(({ value, label, icon: Icon }) => {
        const selected = viewMode === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => setViewMode(value)}
            className={`flex min-h-[54px] min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              selected
                ? 'bg-blue-500/15 text-blue-600 dark:bg-blue-400/20 dark:text-blue-300'
                : 'text-apple-ink/65 hover:bg-black/5 dark:text-white/65 dark:hover:bg-white/10'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
