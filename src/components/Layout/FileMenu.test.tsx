import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// export 모듈을 전부 모킹해 외부 의존 없이 검증.
vi.mock('../../lib/export/markdown', () => ({
  downloadMarkdown: vi.fn(),
}));
vi.mock('../../lib/export/html', () => ({
  downloadHtml: vi.fn(async () => undefined),
}));
vi.mock('../../lib/export/import', () => ({
  readMarkdownFiles: vi.fn(async () => ({
    imported: [{ title: '불러온 문서', content: '# 안녕' }],
    errors: [],
  })),
}));

// 스토어도 모킹해 IDB 접근을 우회.
const createDocument = vi.fn(async () => 'new-id');
const switchTo = vi.fn(async () => undefined);
let mockDoc = {
  title: '문서 제목',
  content: '본문 내용',
  createDocument,
  switchTo,
};
vi.mock('../../stores/documentStore', () => ({
  useDocumentStore: <T,>(selector: (s: typeof mockDoc) => T) => selector(mockDoc),
}));

const mockUi = { theme: 'light' as const };
vi.mock('../../stores/uiStore', () => ({
  useUIStore: <T,>(selector: (s: typeof mockUi) => T) => selector(mockUi),
}));

import { FileMenu } from './FileMenu';
import { downloadMarkdown } from '../../lib/export/markdown';
import { downloadHtml } from '../../lib/export/html';
import { readMarkdownFiles } from '../../lib/export/import';

describe('FileMenu', () => {
  beforeEach(() => {
    vi.mocked(downloadMarkdown).mockClear();
    vi.mocked(downloadHtml).mockClear();
    vi.mocked(readMarkdownFiles).mockClear();
    vi.mocked(readMarkdownFiles).mockResolvedValue({
      imported: [{ title: '불러온 문서', content: '# 안녕' }],
      errors: [],
    });
    createDocument.mockClear();
    switchTo.mockClear();
    mockDoc = { title: '문서 제목', content: '본문 내용', createDocument, switchTo };
  });

  async function openMenu() {
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '파일 메뉴' }));
    return user;
  }

  it('renders trigger button with aria-label 파일 메뉴', () => {
    render(<FileMenu />);
    expect(screen.getByRole('button', { name: '파일 메뉴' })).toBeInTheDocument();
  });

  it('calls downloadMarkdown with current title and content', async () => {
    render(<FileMenu />);
    const user = await openMenu();
    await user.click(screen.getByRole('menuitem', { name: '내보내기 (.md)' }));
    expect(downloadMarkdown).toHaveBeenCalledWith({
      title: '문서 제목',
      content: '본문 내용',
    });
  });

  it('calls downloadHtml with theme from uiStore', async () => {
    render(<FileMenu />);
    const user = await openMenu();
    await user.click(screen.getByRole('menuitem', { name: '내보내기 (.html)' }));
    expect(downloadHtml).toHaveBeenCalledWith(
      { title: '문서 제목', content: '본문 내용' },
      { theme: 'light' },
    );
  });

  it('imports markdown files via hidden input and creates documents', async () => {
    render(<FileMenu />);
    // 숨은 파일 input을 직접 찾아 change 이벤트 디스패치(jsdom에서 click→dialog 불가).
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    const file = new File(['# test'], 'test.md', { type: 'text/markdown' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(readMarkdownFiles).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(createDocument).toHaveBeenCalledWith({
        title: '불러온 문서',
        content: '# 안녕',
      });
    });
    expect(switchTo).toHaveBeenCalledWith('new-id');
  });

  it('alerts on import errors', async () => {
    vi.mocked(readMarkdownFiles).mockResolvedValueOnce({
      imported: [],
      errors: [{ fileName: 'bad.md', reason: '읽기 실패' }],
    });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<FileMenu />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['bad'], 'bad.md', { type: 'text/markdown' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
    alertSpy.mockRestore();
  });
});
