import { render, screen } from '@testing-library/react';
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

  it('prompts for a passcode before opening a locked folder', async () => {
    setFolders([{ id: 'secret', name: '비공개', locked: true }]);
    vi.spyOn(window, 'prompt').mockReturnValue('1234');
    const user = userEvent.setup();

    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: '비공개 잠김' }));

    expect(unlockFolder).toHaveBeenCalledWith('secret', '1234');
    expect(setSelectedFolder).toHaveBeenCalledWith('secret');
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

  it('moves a document to a different folder from the document row', async () => {
    const now = Date.now();
    setFolders([{ id: 'folder-a', name: '업무', locked: false }]);
    setDocs([{ id: 'a', title: 'Alpha', updatedAt: now }], 'a');
    const user = userEvent.setup();

    render(<Sidebar />);
    await user.selectOptions(screen.getByLabelText('Alpha 폴더 이동'), 'folder-a');

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
    vi.spyOn(window, 'prompt').mockReturnValue('1234');
    const user = userEvent.setup();

    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: '비공개 잠김 폴더 삭제' }));

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
