import {
  Columns2,
  FileText,
  Eye,
  Gamepad2,
  Moon,
  Sun,
  PanelLeft,
  Send,
  Type,
  MoreHorizontal,
} from 'lucide-react';
import { useUIStore, type Theme, type ViewMode } from '../../stores/uiStore';
import { useDocumentStore } from '../../stores/documentStore';
import { FileMenu } from './FileMenu';
import { calculateStatistics, formatStatisticsSummary } from '../../utils/textStatistics';
import { useMemo, useRef, useState } from 'react';
import { AccountMenu } from '../Auth/AccountMenu';
import { ShareDocumentDialog } from '../Sharing/ShareDocumentDialog';
import { useAuthStore } from '../../stores/authStore';

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

const THEME_ACTIONS: Record<
  Theme,
  { label: string; title: string; icon: typeof Moon }
> = {
  light: { label: '다크 모드로 전환', title: '다크 모드', icon: Moon },
  dark: { label: '게임보이 모드로 전환', title: '게임보이 모드', icon: Gamepad2 },
  gameboy: { label: '라이트 모드로 전환', title: '라이트 모드', icon: Sun },
};

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
  const content = useDocumentStore((s) => s.content);
  const user = useAuthStore((s) => s.user);
  const [shareOpen, setShareOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const [mobileMenuPosition, setMobileMenuPosition] = useState({ top: 0, left: 8 });
  const themeAction = THEME_ACTIONS[theme];
  const ThemeActionIcon = themeAction.icon;

  const stats = useMemo(() => calculateStatistics(content), [content]);
  const summary = useMemo(() => formatStatisticsSummary(stats), [stats]);

  return (
    <header
      role="banner"
      className={`relative z-40 flex min-h-12 shrink-0 flex-nowrap items-center gap-1 px-1 pb-1 pt-[calc(env(safe-area-inset-top)+0.5rem)] text-white sm:pt-0 max-md:pt-[calc(env(safe-area-inset-top)+0.5rem)] md:gap-3 md:px-3 md:py-0 md:pt-0 ${GLASS_BG}`}
    >
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="사이드바 토글"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:h-8 md:w-8"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <img
          src="/roomi-character.webp"
          alt="Roomi 마스코트"
          className="hidden h-8 w-8 rounded-full bg-white/90 object-cover object-top ring-1 ring-white/30 md:block"
          loading="eager"
          decoding="async"
        />
        <div className="hidden md:flex md:flex-col md:leading-tight">
          <h1 className="font-display text-[15px] font-semibold tracking-tight text-white">
            mdONE
          </h1>
        </div>
      </div>

      <input
        type="text"
        aria-label="문서 제목"
        placeholder="제목 없음"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="min-w-0 flex-1 rounded-md bg-white/0 px-1 py-1 text-[13px] text-white placeholder:text-white/40 hover:bg-white/10 focus:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:px-2"
      />

      {/* 통계 표시 */}
      <div
        aria-label="문서 통계"
        className="hidden md:flex items-center gap-1.5 shrink-0 text-[11px] text-white/60 font-mono tabular-nums"
        title={summary}
      >
        <Type className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>{summary}</span>
      </div>

      <div
        role="radiogroup"
        aria-label="뷰 모드"
        className="ml-auto hidden shrink-0 items-center gap-0.5 rounded-md bg-white/10 p-0.5 md:flex md:ml-0"
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
                'flex h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:h-8 md:min-w-8 md:px-2.5 ' +
                (active
                  ? 'bg-white text-black'
                  : 'text-white/70 hover:text-white')
              }
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{label}</span>
            </button>
          );
        })}
      </div>

      <FileMenu />

      <button
        type="button"
        onClick={() => setShareOpen(true)}
        aria-label="문서 보내기"
        title="문서 보내기"
        className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:inline-flex sm:max-md:hidden md:inline-flex md:h-8 md:w-8"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
      </button>

      <AccountMenu />

      <div className="relative shrink-0 md:hidden">
        <button
          ref={mobileMenuTriggerRef}
          type="button"
          aria-label="모바일 더보기 메뉴"
          aria-haspopup="menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => {
            if (mobileMenuOpen) {
              setMobileMenuOpen(false);
              return;
            }
            const trigger = mobileMenuTriggerRef.current?.getBoundingClientRect();
            if (trigger) {
              const viewportMargin = 8;
              const menuWidth = 184;
              setMobileMenuPosition({
                top: trigger.bottom + viewportMargin,
                left: Math.min(
                  Math.max(trigger.left, viewportMargin),
                  Math.max(viewportMargin, window.innerWidth - menuWidth - viewportMargin),
                ),
              });
            }
            setMobileMenuOpen(true);
          }}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
        {mobileMenuOpen ? (
          <div
            role="menu"
            aria-label="모바일 작업 메뉴"
            style={mobileMenuPosition}
            className="fixed z-50 min-w-44 overflow-hidden rounded-xl bg-white/95 py-1 text-sm text-apple-ink shadow-apple ring-1 ring-black/5 backdrop-blur-glass dark:bg-surface-1/95 dark:text-white dark:ring-white/10"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMobileMenuOpen(false);
                setShareOpen(true);
              }}
              className="flex min-h-11 w-full items-center gap-2 px-3 text-left transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-white/10"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              문서 보내기
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMobileMenuOpen(false);
                toggleTheme();
              }}
              className="flex min-h-11 w-full items-center gap-2 px-3 text-left transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-white/10"
            >
              <ThemeActionIcon className="h-4 w-4" />
              {themeAction.label}
            </button>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={themeAction.label}
        title={themeAction.title}
        className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:inline-flex sm:max-md:hidden md:inline-flex md:h-8 md:w-8"
      >
        <ThemeActionIcon className="h-4 w-4" />
      </button>

      <ShareDocumentDialog
        open={shareOpen}
        user={user}
        onClose={() => setShareOpen(false)}
      />
    </header>
  );
}
