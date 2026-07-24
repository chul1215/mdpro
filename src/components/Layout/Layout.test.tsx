import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Layout이 FileMenu/DropOverlay를 통해 정적 import하는 export 모듈을 모킹해 외부 의존 제거.
vi.mock('../../lib/export/markdown', () => ({ downloadMarkdown: vi.fn() }));
vi.mock('../../lib/export/html', () => ({ downloadHtml: vi.fn(async () => undefined) }));
vi.mock('../../lib/export/import', () => ({
  readMarkdownFiles: vi.fn(async () => ({ imported: [], errors: [] })),
}));

import { Layout } from './Layout';
import { useUIStore } from '../../stores/uiStore';

describe('Layout', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({
      theme: 'light',
      viewMode: 'split',
      sidebarOpen: true,
      splitRatio: 50,
    });
  });

  it('shows both editor and preview in split mode', () => {
    render(<Layout />);
    expect(screen.getByRole('region', { name: '에디터' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '프리뷰' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: '편집기와 프리뷰 크기 조절' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
  });

  it('resizes both panes with separator keyboard controls', () => {
    render(<Layout />);
    const separator = screen.getByRole('separator', { name: '편집기와 프리뷰 크기 조절' });

    fireEvent.keyDown(separator, { key: 'ArrowRight' });

    expect(useUIStore.getState().splitRatio).toBe(55);
    expect(screen.getByTestId('split-pane-container')).toHaveStyle({
      gridTemplateColumns: '55fr 12px 45fr',
    });
  });

  it('resizes both panes by dragging the separator', () => {
    render(<Layout />);
    const container = screen.getByTestId('split-pane-container');
    const separator = screen.getByRole('separator', { name: '편집기와 프리뷰 크기 조절' });
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1000,
      bottom: 700,
      width: 1000,
      height: 700,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(separator, { pointerId: 1, clientX: 500 });
    fireEvent.pointerMove(separator, { pointerId: 1, clientX: 650 });
    fireEvent.pointerUp(separator, { pointerId: 1, clientX: 650 });

    expect(useUIStore.getState().splitRatio).toBe(65);
    expect(container).toHaveStyle({ gridTemplateColumns: '65fr 12px 35fr' });
  });

  it('synchronizes editor scrolling to the preview by scroll progress', () => {
    const { container } = render(<Layout />);
    const editorScroller = container.querySelector<HTMLElement>('.cm-scroller');
    const previewScroller = screen.getByTestId('preview-scroll');
    expect(editorScroller).not.toBeNull();

    Object.defineProperties(editorScroller!, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 200 },
    });
    Object.defineProperties(previewScroller, {
      scrollHeight: { configurable: true, value: 600 },
      clientHeight: { configurable: true, value: 200 },
    });
    editorScroller!.scrollTop = 400;

    fireEvent.scroll(editorScroller!);

    expect(previewScroller.scrollTop).toBe(200);
  });

  it('synchronizes preview scrolling back to the editor', () => {
    const { container } = render(<Layout />);
    const editorScroller = container.querySelector<HTMLElement>('.cm-scroller');
    const previewScroller = screen.getByTestId('preview-scroll');
    expect(editorScroller).not.toBeNull();

    Object.defineProperties(editorScroller!, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 200 },
    });
    Object.defineProperties(previewScroller, {
      scrollHeight: { configurable: true, value: 600 },
      clientHeight: { configurable: true, value: 200 },
    });
    previewScroller.scrollTop = 100;

    fireEvent.scroll(previewScroller);

    expect(editorScroller!.scrollTop).toBe(200);
  });

  it('renders the sidebar as a full-height column beside the editor shell', () => {
    const { container } = render(<Layout />);
    expect(container.firstElementChild).toHaveClass('flex-row');
    const sidebar = screen.getByRole('navigation', { name: '문서 목록' });
    expect(sidebar).toHaveClass('md:h-full');
    expect(sidebar).toHaveClass('md:w-56');
  });

  it('uses dynamic viewport height and clips the app shell for mobile portrait layout', () => {
    const { container } = render(<Layout />);
    const shell = container.firstElementChild;

    expect(shell).toHaveClass('h-dvh');
    expect(shell).toHaveClass('overflow-hidden');
  });

  it('renders an iOS-style mobile view tab bar with all three view modes', () => {
    render(<Layout />);

    const tablist = screen.getByRole('tablist', { name: '모바일 뷰 모드' });
    expect(tablist).toHaveClass('md:hidden');
    expect(screen.getByRole('tab', { name: '편집' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: '분할' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '프리뷰' })).toHaveAttribute('aria-selected', 'false');
  });

  it('changes view mode from the mobile view tab bar', () => {
    render(<Layout />);

    fireEvent.click(screen.getByRole('tab', { name: '프리뷰' }));
    expect(useUIStore.getState().viewMode).toBe('preview');
  });

  it('hides preview in edit-only mode', () => {
    useUIStore.setState({ viewMode: 'edit' });
    render(<Layout />);
    expect(screen.getByRole('region', { name: '에디터' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '프리뷰' })).not.toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('hides editor in preview-only mode', () => {
    useUIStore.setState({ viewMode: 'preview' });
    render(<Layout />);
    expect(screen.queryByRole('region', { name: '에디터' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '프리뷰' })).toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('hides sidebar when sidebarOpen is false', () => {
    useUIStore.setState({ sidebarOpen: false });
    render(<Layout />);
    expect(screen.queryByRole('complementary', { name: '문서 목록' })).not.toBeInTheDocument();
  });
});
