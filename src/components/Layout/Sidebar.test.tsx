import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// 스토어 모킹: 실제 IDB 접근 없이 documents 배열과 스파이 함수를 주입한다.
const createDocument = vi.fn(async () => 'new-id');
const switchTo = vi.fn(async () => {});
const removeDocument = vi.fn(async () => {});

type MockState = {
  activeId: string | null;
  documents: Array<{ id: string; title: string; updatedAt: number }>;
  createDocument: typeof createDocument;
  switchTo: typeof switchTo;
  removeDocument: typeof removeDocument;
};

let mockState: MockState = {
  activeId: null,
  documents: [],
  createDocument,
  switchTo,
  removeDocument,
};

vi.mock('../../stores/documentStore', () => ({
  useDocumentStore: <T,>(selector: (s: MockState) => T) => selector(mockState),
}));

import { Sidebar } from './Sidebar';
import { useUIStore } from '../../stores/uiStore';

function setDocs(docs: MockState['documents'], activeId: string | null = null) {
  mockState = {
    activeId,
    documents: docs,
    createDocument,
    switchTo,
    removeDocument,
  };
}

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({ sidebarOpen: true, theme: 'light', viewMode: 'split' });
    createDocument.mockClear();
    switchTo.mockClear();
    removeDocument.mockClear();
    setDocs([], null);
  });

  it('renders new document button when list is empty', () => {
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: '새 문서' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText('아직 문서가 없습니다')).toBeInTheDocument();
  });

  it('renders three document items', () => {
    const now = Date.now();
    setDocs(
      [
        { id: 'a', title: 'Alpha', updatedAt: now - 10_000 },
        { id: 'b', title: 'Beta', updatedAt: now - 60 * 60_000 },
        { id: 'c', title: 'Gamma', updatedAt: now - 24 * 60 * 60_000 * 2 },
      ],
      'a',
    );
    render(<Sidebar />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('marks the active item with aria-current=true', () => {
    const now = Date.now();
    setDocs(
      [
        { id: 'a', title: 'Alpha', updatedAt: now },
        { id: 'b', title: 'Beta', updatedAt: now - 60_000 },
      ],
      'b',
    );
    render(<Sidebar />);
    // 활성 아이템만 aria-current를 가진다. aria-label로 정확 매칭한다.
    const betaButton = screen.getByRole('button', { name: 'Beta' });
    expect(betaButton).toHaveAttribute('aria-current', 'true');
    const alphaButton = screen.getByRole('button', { name: 'Alpha' });
    expect(alphaButton).not.toHaveAttribute('aria-current');
  });

  it('calls createDocument when "새 문서" clicked', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: '새 문서' }));
    expect(createDocument).toHaveBeenCalledTimes(1);
  });

  it('calls switchTo when item clicked', async () => {
    const now = Date.now();
    setDocs(
      [
        { id: 'a', title: 'Alpha', updatedAt: now },
        { id: 'b', title: 'Beta', updatedAt: now - 60_000 },
      ],
      'a',
    );
    const user = userEvent.setup();
    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: 'Beta' }));
    expect(switchTo).toHaveBeenCalledWith('b');
  });

  it('opens confirm dialog and calls removeDocument on confirm', async () => {
    const now = Date.now();
    setDocs([{ id: 'a', title: 'Alpha', updatedAt: now }], 'a');
    const user = userEvent.setup();
    render(<Sidebar />);

    // 삭제 아이콘 버튼은 aria-label="Alpha 삭제".
    await user.click(screen.getByRole('button', { name: 'Alpha 삭제' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // switchTo는 호출되지 않아야 한다(stopPropagation).
    expect(switchTo).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '삭제' }));
    expect(removeDocument).toHaveBeenCalledWith('a');
  });

  it('closes confirm dialog without deleting when cancelled', async () => {
    const now = Date.now();
    setDocs([{ id: 'a', title: 'Alpha', updatedAt: now }], 'a');
    const user = userEvent.setup();
    render(<Sidebar />);

    await user.click(screen.getByRole('button', { name: 'Alpha 삭제' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '취소' }));
    expect(removeDocument).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
