import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// FileMenu가 export 모듈을 정적 import하므로 IDB/Blob 실행을 피하려 모킹.
vi.mock('../../lib/export/markdown', () => ({
  downloadMarkdown: vi.fn(),
}));
vi.mock('../../lib/export/html', () => ({
  downloadHtml: vi.fn(async () => undefined),
}));
vi.mock('../../lib/export/import', () => ({
  readMarkdownFiles: vi.fn(async () => ({ imported: [], errors: [] })),
}));

// TopBar가 documentStore에서 title/setTitle을 읽으므로 스토어를 모킹해 IDB 접근을 우회한다.
const setTitle = vi.fn();
const createDocument = vi.fn(async () => 'id');
const switchTo = vi.fn(async () => undefined);
let mockDoc = { title: '', content: '', setTitle, createDocument, switchTo };

vi.mock('../../stores/documentStore', () => ({
  useDocumentStore: <T,>(selector: (s: typeof mockDoc) => T) => selector(mockDoc),
}));

import { TopBar } from './TopBar';
import { useUIStore } from '../../stores/uiStore';

describe('TopBar', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({ theme: 'light', viewMode: 'split', sidebarOpen: true });
    setTitle.mockClear();
    createDocument.mockClear();
    switchTo.mockClear();
    mockDoc = { title: '', content: '', setTitle, createDocument, switchTo };
  });

  it('renders the product title as mdONE', () => {
    render(<TopBar />);

    expect(screen.getByRole('heading', { name: 'mdONE' })).toBeInTheDocument();
    expect(screen.queryByText('SMC AI실무도입전환 프로젝트')).not.toBeInTheDocument();
  });

  it('shows the Roomi mascot next to the product title', () => {
    render(<TopBar />);

    const mascot = screen.getByRole('img', { name: 'Roomi 마스코트' });
    expect(mascot).toHaveAttribute('src', '/roomi-character.webp');
    expect(mascot).toHaveClass('rounded-full');
  });

  it('renders view mode radio group with three options', () => {
    render(<TopBar />);
    const group = screen.getByRole('radiogroup', { name: '뷰 모드' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '편집만' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '분할' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '프리뷰만' })).toBeInTheDocument();
  });

  it('marks current view mode as checked', () => {
    render(<TopBar />);
    expect(screen.getByRole('radio', { name: '분할' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('changes view mode on click', async () => {
    const user = userEvent.setup();
    render(<TopBar />);
    await user.click(screen.getByRole('radio', { name: '편집만' }));
    expect(useUIStore.getState().viewMode).toBe('edit');
  });

  it('toggles theme when theme button clicked', async () => {
    const user = userEvent.setup();
    render(<TopBar />);
    await user.click(screen.getByRole('button', { name: /다크 모드로 전환/ }));
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('toggles sidebar via sidebar button', async () => {
    const user = userEvent.setup();
    render(<TopBar />);
    await user.click(screen.getByRole('button', { name: '사이드바 토글' }));
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('renders title input with aria-label 문서 제목', () => {
    mockDoc = { title: 'My Doc', content: '', setTitle, createDocument, switchTo };
    render(<TopBar />);
    const input = screen.getByRole('textbox', { name: '문서 제목' });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('My Doc');
  });

  it('calls setTitle when title input changes', async () => {
    const user = userEvent.setup();
    render(<TopBar />);
    const input = screen.getByRole('textbox', { name: '문서 제목' });
    await user.type(input, 'A');
    expect(setTitle).toHaveBeenCalled();
    // 마지막 인자가 'A'인지 확인 (controlled input + 빈 초기값).
    expect(setTitle).toHaveBeenLastCalledWith('A');
  });

  it('renders file menu trigger', () => {
    render(<TopBar />);
    expect(screen.getByRole('button', { name: '파일 메뉴' })).toBeInTheDocument();
  });

  it('uses larger mobile touch targets for primary toolbar controls', () => {
    render(<TopBar />);

    expect(screen.getByRole('button', { name: '사이드바 토글' })).toHaveClass('h-11', 'w-11');
    expect(screen.getByRole('radio', { name: '편집만' })).toHaveClass('h-11', 'min-w-11');
  });

  it('adds mobile safe-area top padding so the header is not covered in portrait browsers', () => {
    render(<TopBar />);

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('pt-[calc(env(safe-area-inset-top)+0.5rem)]');
    expect(header).toHaveClass('sm:pt-0');
  });

  it('moves secondary actions into a mobile more menu', async () => {
    const user = userEvent.setup();
    render(<TopBar />);

    expect(screen.getByRole('button', { name: '모바일 더보기 메뉴' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '문서 보내기' })).toHaveClass('hidden', 'sm:inline-flex');
    expect(screen.getByRole('button', { name: /모드로 전환/ })).toHaveClass('hidden', 'sm:inline-flex');

    await user.click(screen.getByRole('button', { name: '모바일 더보기 메뉴' }));

    expect(screen.getByRole('menu', { name: '모바일 작업 메뉴' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '문서 보내기' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /다크 모드로 전환/ })).toBeInTheDocument();
  });
});
