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
import { FileMenu } from './FileMenu';

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

// Apple 스타일 글래스: 라이트/다크 공통으로 translucent dark + backdrop blur.
// 텍스트 대비를 위해 내용물은 항상 흰색 계열로 유지.
const GLASS_BG =
  'bg-[rgba(0,0,0,0.72)] backdrop-blur-glass backdrop-saturate-glass';

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
      // backdrop-filter가 새 스태킹 컨텍스트를 만들어 내부 드롭다운 패널이
      // 뒤쪽 paint 순서의 메인 영역에 가려진다. relative z-40로 상위에 고정.
      className={`relative z-40 flex h-12 shrink-0 items-center gap-3 px-3 text-white ${GLASS_BG}`}
    >
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="사이드바 토글"
          className="rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        {/* md 이상에서만 시각적으로 노출. 기존 E2E(toBeVisible)가 1280px 기준이라 md+ 에선 유지. */}
        <h1 className="hidden font-display text-[15px] font-semibold tracking-tight text-white md:block">
          MDPro
        </h1>
      </div>

      <input
        type="text"
        aria-label="문서 제목"
        placeholder="제목 없음"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="min-w-0 flex-1 rounded-md bg-white/0 px-2 py-1 text-[13px] text-white placeholder:text-white/40 hover:bg-white/10 focus:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      />

      <div
        role="radiogroup"
        aria-label="뷰 모드"
        className="flex shrink-0 items-center gap-0.5 rounded-md bg-white/10 p-0.5"
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
                'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ' +
                (active
                  ? 'bg-white text-black'
                  : 'text-white/70 hover:text-white')
              }
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      <FileMenu />

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
        title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
        className="shrink-0 rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </header>
  );
}
