import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { useUIStore } from '../../stores/uiStore';
import { getSyncedScrollTop } from '../../utils/scrollSync';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { EditorPane } from './EditorPane';
import { PreviewPane } from './PreviewPane';
import { Toolbar } from '../Toolbar/Toolbar';
import { DropOverlay } from './DropOverlay';

const DIVIDER_WIDTH = 12;
const KEYBOARD_STEP = 5;

export function Layout() {
  const viewMode = useUIStore((s) => s.viewMode);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const splitRatio = useUIStore((s) => s.splitRatio);
  const setSplitRatio = useUIStore((s) => s.setSplitRatio);
  const splitContainerRef = useRef<HTMLElement>(null);
  const editorScrollRef = useRef<HTMLElement | null>(null);
  const previewScrollRef = useRef<HTMLElement | null>(null);
  const ignoredScrollTargetRef = useRef<HTMLElement | null>(null);
  const draggingRef = useRef(false);
  const previousBodyStyleRef = useRef({ cursor: '', userSelect: '' });
  const chromeRef = useRef<HTMLDivElement>(null);
  const [mobileChromeHeight, setMobileChromeHeight] = useState(0);

  useLayoutEffect(() => {
    const chrome = chromeRef.current;
    if (!chrome) return;
    const updateHeight = () => setMobileChromeHeight(chrome.getBoundingClientRect().height);
    updateHeight();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateHeight);
    observer.observe(chrome);
    return () => observer.disconnect();
  }, []);

  const synchronizeScroll = useCallback((source: HTMLElement, target: HTMLElement | null) => {
    if (!target) return;
    if (ignoredScrollTargetRef.current === source) {
      ignoredScrollTargetRef.current = null;
      return;
    }

    const nextScrollTop = getSyncedScrollTop(source, target);
    if (Math.abs(target.scrollTop - nextScrollTop) < 0.5) return;

    ignoredScrollTargetRef.current = target;
    target.scrollTop = nextScrollTop;
    window.requestAnimationFrame(() => {
      if (ignoredScrollTargetRef.current === target) {
        ignoredScrollTargetRef.current = null;
      }
    });
  }, []);

  const handleEditorScroll = useCallback(
    (source: HTMLElement) => synchronizeScroll(source, previewScrollRef.current),
    [synchronizeScroll],
  );

  const handlePreviewScroll = useCallback(
    (source: HTMLElement) => synchronizeScroll(source, editorScrollRef.current),
    [synchronizeScroll],
  );

  const setEditorScrollContainer = useCallback((element: HTMLElement | null) => {
    editorScrollRef.current = element;
  }, []);

  const setPreviewScrollContainer = useCallback((element: HTMLElement | null) => {
    previewScrollRef.current = element;
  }, []);

  const finishResize = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    document.body.style.cursor = previousBodyStyleRef.current.cursor;
    document.body.style.userSelect = previousBodyStyleRef.current.userSelect;
  }, []);

  useEffect(() => () => finishResize(), [finishResize]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    previousBodyStyleRef.current = {
      cursor: document.body.style.cursor,
      userSelect: document.body.style.userSelect,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !splitContainerRef.current) return;
    const bounds = splitContainerRef.current.getBoundingClientRect();
    if (bounds.width <= 0) return;
    setSplitRatio(((event.clientX - bounds.left) / bounds.width) * 100);
  };

  const handleSeparatorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let nextRatio: number | null = null;
    if (event.key === 'ArrowLeft') nextRatio = splitRatio - KEYBOARD_STEP;
    if (event.key === 'ArrowRight') nextRatio = splitRatio + KEYBOARD_STEP;
    if (event.key === 'Home') nextRatio = 25;
    if (event.key === 'End') nextRatio = 75;
    if (nextRatio === null) return;

    event.preventDefault();
    setSplitRatio(nextRatio);
  };

  const splitGridStyle =
    viewMode === 'split'
      ? { gridTemplateColumns: `${splitRatio}fr ${DIVIDER_WIDTH}px ${100 - splitRatio}fr` }
      : undefined;

  return (
    <div
      className="relative flex h-dvh w-full flex-row overflow-hidden bg-apple-bg text-apple-ink dark:bg-black dark:text-white"
      style={{ '--mobile-chrome-height': `${mobileChromeHeight}px` } as CSSProperties}
    >
      {sidebarOpen && <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={chromeRef} className="shrink-0">
          <TopBar />
          <Toolbar />
        </div>
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <main
            ref={splitContainerRef}
            data-testid="split-pane-container"
            className="flex min-h-0 min-w-0 flex-1 flex-col md:grid"
            style={splitGridStyle}
          >
            {viewMode !== 'preview' && (
              <EditorPane
                onScrollContainerReady={setEditorScrollContainer}
                onScroll={handleEditorScroll}
              />
            )}
            {viewMode === 'split' && (
              <div
                role="separator"
                aria-label="편집기와 프리뷰 크기 조절"
                aria-orientation="vertical"
                aria-valuemin={25}
                aria-valuemax={75}
                aria-valuenow={splitRatio}
                aria-valuetext={`에디터 ${splitRatio}%, 프리뷰 ${100 - splitRatio}%`}
                tabIndex={0}
                title="좌우로 드래그하거나 방향키로 크기를 조절하세요. 더블클릭하면 초기화됩니다."
                className="group hidden touch-none cursor-col-resize select-none items-center justify-center bg-apple-border/40 outline-none transition-colors hover:bg-blue-500/20 focus-visible:bg-blue-500/20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 md:flex dark:bg-white/10"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishResize}
                onPointerCancel={finishResize}
                onLostPointerCapture={finishResize}
                onKeyDown={handleSeparatorKeyDown}
                onDoubleClick={() => setSplitRatio(50)}
              >
                <span
                  aria-hidden="true"
                  className="h-12 w-1 rounded-full bg-apple-ink/20 transition-colors group-hover:bg-blue-500 group-focus-visible:bg-blue-500 dark:bg-white/30"
                />
              </div>
            )}
            {viewMode !== 'edit' && (
              <PreviewPane
                onScrollContainerReady={setPreviewScrollContainer}
                onScroll={handlePreviewScroll}
              />
            )}
          </main>
        </div>
      </div>
      <DropOverlay />
    </div>
  );
}
