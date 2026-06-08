import { useCallback, useEffect, useMemo } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useEditorStore } from '../../stores/editorStore';
import { useDocumentStore } from '../../stores/documentStore';
import { parseHeadings, findCurrentHeading, getHeadingIndentClass, Heading } from '../../utils/headingParser';

interface OutlineItemProps {
  heading: Heading;
  isActive: boolean;
  onClick: (position: number) => void;
}

function OutlineItem({ heading, isActive, onClick }: OutlineItemProps) {
  const indentClass = getHeadingIndentClass(heading.level);
  
  return (
    <button
      type="button"
      onClick={() => onClick(heading.position)}
      className={`w-full flex items-center gap-1 px-2 py-1 text-left text-[12px] rounded transition-colors ${
        isActive
          ? 'bg-blue-500 text-white'
          : 'text-apple-ink/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/5'
      } ${indentClass}`}
      aria-current={isActive ? 'true' : undefined}
      title={`Line ${heading.line + 1}`}
    >
      <span className="shrink-0" aria-hidden="true">
        {'#'.repeat(heading.level)}
      </span>
      <span className="truncate flex-1">{heading.text}</span>
    </button>
  );
}

export function OutlinePanel() {
  const setOutlineOpen = useUIStore((s) => s.setSidebarOpen);
  const content = useDocumentStore((s) => s.content);
  const view = useEditorStore((s) => s.view);

  // 현재 커서 위치 추출
  const cursorPosition = useMemo(() => {
    if (!view) return 0;
    return view.state.selection.main.head;
  }, [view]);

  // 헤딩 파싱
  const headings = useMemo(() => parseHeadings(content), [content]);

  // 현재 활성 헤딩 찾기
  const activeHeading = useMemo(
    () => findCurrentHeading(headings, cursorPosition),
    [headings, cursorPosition]
  );

  // 헤딩 클릭 시 에디터에서 해당 위치로 이동
  const handleHeadingClick = useCallback(
    (position: number) => {
      if (!view) return;
      view.dispatch({
        selection: { anchor: position },
        scrollIntoView: true,
        userEvent: 'select.pointer',
      });
      view.focus();
    },
    [view]
  );

  // 현재 헤딩이 변경되면 헤딩 요소로 스크롤 (부드러운 동기화)
  useEffect(() => {
    if (!activeHeading) return;
    // 현재 활성 헤딩 요소가 보이도록 사이드바 내부 스크롤
    const headingElement = document.querySelector(
      `[data-heading-line="${activeHeading.line}"]`
    );
    if (headingElement) {
      headingElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeHeading]);

  const closeSidebar = useCallback(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.matchMedia?.('(max-width: 767px)').matches ?? false;
      if (isMobile) setOutlineOpen(false);
    }
  }, [setOutlineOpen]);

  return (
    <aside
      role="navigation"
      aria-label="문서 아웃라인"
      className="absolute left-0 top-12 z-40 flex h-[calc(100%-3rem)] w-64 flex-col bg-apple-bg shadow-apple md:static md:top-0 md:h-full md:w-56 md:shadow-none dark:bg-surface-5"
    >
      <div className="flex flex-col gap-2 px-3 py-3 border-b border-apple-border dark:border-white/10">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-ink/70 dark:text-white/70">
          아웃라인
        </span>
      </div>
      
      <nav className="flex-1 overflow-y-auto px-2 pb-3" role="list">
        {headings.length === 0 ? (
          <p className="px-2 py-4 text-center text-[12px] text-apple-ink/70 dark:text-white/70">
            헤딩이 없습니다
          </p>
        ) : (
          <ul role="list" className="flex flex-col gap-0.5">
            {headings.map((heading) => {
              const isActive = activeHeading?.position === heading.position;
              return (
                <li key={heading.position} data-heading-line={heading.line}>
                  <OutlineItem
                    heading={heading}
                    isActive={isActive}
                    onClick={() => {
                      handleHeadingClick(heading.position);
                      closeSidebar();
                    }}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}