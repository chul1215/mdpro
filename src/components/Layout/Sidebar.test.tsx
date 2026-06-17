import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createDocument = vi.fn(async () => 'new-id');
const switchTo = vi.fn(async () => {});
const removeDocument = vi.fn(async () => {});
const moveDocument = vi.fn(async () => {});
const createFolder = vi.fn(async () => 'folder-new');
const deleteFolder = vi.fn((id: string) => {
  mockFolderState = {
    ...mockFolderState,
    folders: mockFolderState.folders.filter((folder) => folder.id !== id),
    selectedFolderId: mockFolderState.selectedFolderId === id ? null : mockFolderState.selectedFolderId,
    unlockedFolderIds: mockFolderState.unlockedFolderIds.filter((folderId) => folderId !== id),
  };
});
const setSelectedFolder = vi.fn((id: string | null) => {
  mockFolderState = { ...mockFolderState, selectedFolderId: id };
});
const unlockFolder = vi.fn(async (_id: string, code: string) => code === '1234');

type MockState = {
  activeId: string | null;
  documents: Array<{ id: string; title: string; updatedAt: number; folderId?: string | null }>;
  createDocument: typeof createDocument;
  switchTo: typeof switchTo;
  removeDocument: typeof removeDocument;
  moveDocument: typeof moveDocument;
};

type MockFolderState = {
  folders: Array<{ id: string; name: string; locked: boolean }>;
  selectedFolderId: string | null;
  unlockedFolderIds: string[];
  createFolder: typeof createFolder;
  deleteFolder: typeof deleteFolder;
  setSelectedFolder: typeof setSelectedFolder;
  unlockFolder: typeof unlockFolder;
  isFolderUnlocked: (id: string) => boolean;
};

let mockState: MockState = {
  activeId: null,
  documents: [],
  createDocument,
  switchTo,
  removeDocument,
  moveDocument,
};

let mockFolderState: MockFolderState = {
  folders: [],
  selectedFolderId: null,
  unlockedFolderIds: [],
  createFolder,
  deleteFolder,
  setSelectedFolder,
  unlockFolder,
  isFolderUnlocked: (id) => mockFolderState.unlockedFolderIds.includes(id),
};

vi.mock('../../stores/documentStore', () => ({
  useDocumentStore: <T,>(selector: (s: MockState) => T) => selector(mockState),
}));

vi.mock('../../stores/folderStore', () => ({
  useFolderStore: <T,>(selector: (s: MockFolderState) => T) => selector(mockFolderState),
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
    moveDocument,
  };
}

function setFolders(
  folders: MockFolderState['folders'],
  selectedFolderId: string | null = null,
  unlockedFolderIds: string[] = [],
) {
  mockFolderState = {
    folders,
    selectedFolderId,
    unlockedFolderIds,
    createFolder,
    deleteFolder,
    setSelectedFolder,
    unlockFolder,
    isFolderUnlocked: (id) => mockFolderState.unlockedFolderIds.includes(id),
  };
}

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({ sidebarOpen: true, theme: 'light', viewMode: 'split' });
    createDocument.mockClear();
    switchTo.mockClear();
    removeDocument.mockClear();
    moveDocument.mockClear();
    createFolder.mockClear();
    deleteFolder.mockClear();
    setSelectedFolder.mockClear();
    unlockFolder.mockClear();
    vi.restoreAllMocks();
    setDocs([], null);
    setFolders([], null, []);
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

  it('filters documents by the selected folder', () => {
    const now = Date.now();
    setFolders([{ id: 'folder-a', name: '업무', locked: false }], 'folder-a');
    setDocs(
      [
        { id: 'a', title: 'Alpha', updatedAt: now, folderId: 'folder-a' },
        { id: 'b', title: 'Beta', updatedAt: now, folderId: null },
      ],
      'a',
    );

    render(<Sidebar />);

    expect(screen.getByRole('button', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Beta' })).not.toBeInTheDocument();
  });

  it('only gives flex height to the active tab panel and hides the inactive ones', () => {
    const now = Date.now();
    setDocs([{ id: 'a', title: '새 문서', updatedAt: now, folderId: null }], 'a');

    const { container } = render(<Sidebar />);

    const documentsPanel = container.querySelector('#documents-panel');
    const outlinePanel = container.querySelector('#outline-panel');
    const inboxPanel = container.querySelector('#inbox-panel');
    const addressBookPanel = container.querySelector('#addressBook-panel');

    // 활성 패널(documents)만 남은 세로 공간을 차지한다.
    expect(documentsPanel).toHaveClass('flex-1');
    // 비활성 패널은 flex 분배에서 제외되어야 한다(공간을 차지하지 않음).
    expect(outlinePanel).not.toHaveClass('flex-1');
    expect(inboxPanel).not.toHaveClass('flex-1');
    expect(addressBookPanel).not.toHaveClass('flex-1');
    expect(outlinePanel).toHaveClass('hidden');
    expect(inboxPanel).toHaveClass('hidden');
    expect(addressBookPanel).toHaveClass('hidden');
  });

  it('keeps folders and documents in one full-height sidebar list', () => {
    const now = Date.now();
    setFolders([{ id: 'folder-a', name: '업무', locked: false }]);
    setDocs([{ id: 'a', title: '새 문서', updatedAt: now, folderId: null }], 'a');

    render(<Sidebar />);

    const fullHeightList = screen.getByRole('navigation', { name: '폴더와 문서 목록' });
    const listQueries = within(fullHeightList);
    expect(fullHeightList).toHaveClass('flex-1');
    expect(fullHeightList).toHaveClass('overflow-y-auto');
    expect(fullHeightList).toContainElement(listQueries.getByRole('button', { name: '전체 문서' }));
    expect(fullHeightList).toContainElement(listQueries.getByRole('button', { name: '업무' }));
    expect(fullHeightList).toContainElement(listQueries.getByRole('button', { name: '새 문서' }));
  });

  it('keeps secure folder documents out of all documents even after the folder is unlocked', () => {
    const now = Date.now();
    setFolders([{ id: 'secret', name: '비공개', locked: true }], null, ['secret']);
    setDocs(
      [
        { id: 'public', title: '공개 문서', updatedAt: now, folderId: null },
        { id: 'hidden', title: '비밀 문서', updatedAt: now, folderId: 'secret' },
      ],
      'public',
    );

    render(<Sidebar />);

    expect(screen.getByRole('button', { name: '공개 문서' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '비밀 문서' })).not.toBeInTheDocument();
  });

  it('shows secure folder documents only inside that unlocked secure folder', () => {
    const now = Date.now();
    setFolders([{ id: 'secret', name: '비공개', locked: true }], 'secret', ['secret']);
    setDocs(
      [
        { id: 'public', title: '공개 문서', updatedAt: now, folderId: null },
        { id: 'hidden', title: '비밀 문서', updatedAt: now, folderId: 'secret' },
      ],
      'hidden',
    );

    render(<Sidebar />);

    expect(screen.queryByRole('button', { name: '공개 문서' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '비밀 문서' })).toBeInTheDocument();
  });

  it('prompts for a passcode before opening a locked folder', async () => {
    setFolders([{ id: 'secret', name: '비공개', locked: true }]);
    const user = userEvent.setup();

    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: '비공개 잠김' }));

    const passcodeInput = screen.getByLabelText('폴더 암호코드');
    expect(passcodeInput).toHaveAttribute('type', 'password');
    await user.type(passcodeInput, '1234');
    await user.click(screen.getByRole('button', { name: '열기' }));

    expect(unlockFolder).toHaveBeenCalledWith('secret', '1234');
    expect(setSelectedFolder).toHaveBeenCalledWith('secret');
  });

  it('uses a masked password input when creating a secure folder', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('비공개');
    const user = userEvent.setup();

    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: '보안' }));

    const passcodeInput = screen.getByLabelText('새 폴더 암호코드');
    expect(passcodeInput).toHaveAttribute('type', 'password');
    await user.type(passcodeInput, '1234');
    await user.click(screen.getByRole('button', { name: '생성' }));

    expect(createFolder).toHaveBeenCalledWith({ name: '비공개', passcode: '1234' });
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

  it('moves a document to a different folder from the compact document row without covering the title', async () => {
    const now = Date.now();
    setFolders([{ id: 'folder-a', name: '업무', locked: false }]);
    setDocs([{ id: 'a', title: 'Alpha', updatedAt: now }], 'a');
    const user = userEvent.setup();

    render(<Sidebar />);
    const row = screen.getByTestId('document-row-a');
    expect(row).toHaveClass('h-9');
    const documentButton = screen.getByRole('button', { name: 'Alpha' });
    expect(documentButton).toHaveClass('pr-14');
    expect(documentButton).not.toHaveClass('pr-24');
    const folderSelect = screen.getByLabelText('Alpha 폴더 이동');
    expect(folderSelect).toHaveClass('absolute');
    expect(folderSelect).toHaveClass('w-7');
    expect(folderSelect).toHaveClass('text-transparent');
    expect(folderSelect).not.toHaveClass('mt-1');
    expect(folderSelect).not.toHaveClass('w-full');
    expect(folderSelect).not.toHaveClass('w-16');

    await user.selectOptions(folderSelect, 'folder-a');

    expect(moveDocument).toHaveBeenCalledWith('a', 'folder-a');
  });

  it('opens confirm dialog and deletes a folder while moving its documents to all documents', async () => {
    const now = Date.now();
    setFolders([{ id: 'folder-a', name: '업무', locked: false }], 'folder-a', ['folder-a']);
    setDocs([
      { id: 'a', title: 'Alpha', updatedAt: now, folderId: 'folder-a' },
      { id: 'b', title: 'Beta', updatedAt: now, folderId: null },
    ]);
    const user = userEvent.setup();

    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: '업무 폴더 삭제' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '삭제' }));

    expect(moveDocument).toHaveBeenCalledWith('a', null);
    expect(moveDocument).not.toHaveBeenCalledWith('b', null);
    expect(deleteFolder).toHaveBeenCalledWith('folder-a');
  });

  it('requires the passcode before deleting a locked folder', async () => {
    setFolders([{ id: 'secret', name: '비공개', locked: true }]);
    const user = userEvent.setup();

    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: '비공개 잠김 폴더 삭제' }));

    const passcodeInput = screen.getByLabelText('폴더 삭제 암호코드');
    expect(passcodeInput).toHaveAttribute('type', 'password');
    await user.type(passcodeInput, '1234');
    await user.click(screen.getByRole('button', { name: '확인' }));

    expect(unlockFolder).toHaveBeenCalledWith('secret', '1234');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens confirm dialog and calls removeDocument on confirm', async () => {
    const now = Date.now();
    setDocs([{ id: 'a', title: 'Alpha', updatedAt: now }], 'a');
    const user = userEvent.setup();
    render(<Sidebar />);

    await user.click(screen.getByRole('button', { name: 'Alpha 삭제' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
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
