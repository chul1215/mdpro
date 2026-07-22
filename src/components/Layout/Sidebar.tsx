import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { BookUser, FilePlus, FileText, Folder, FolderPlus, Inbox, List, Lock, Pencil, Shield, Trash2 } from 'lucide-react';
import { useUIStore, type SidebarTab } from '../../stores/uiStore';
import { useDocumentStore } from '../../stores/documentStore';
import { useFolderStore } from '../../stores/folderStore';
import { ConfirmDialog } from '../Modal/ConfirmDialog';
import { OutlinePanel } from './OutlinePanel';
import { InboxPanel } from '../Sharing/InboxPanel';
import { AddressBookPanel } from '../Sharing/AddressBookPanel';
import { useAuthStore } from '../../stores/authStore';
import { useShareStore } from '../../stores/shareStore';

type DeleteTarget = { id: string; title: string };
type FolderDeleteTarget = { id: string; name: string; locked: boolean };
type PasscodePrompt = {
  title: string;
  label: string;
  confirmLabel: string;
  onSubmit: (passcode: string) => Promise<void> | void;
};

const TABS: Array<{
  value: SidebarTab;
  label: string;
  icon: typeof FileText;
}> = [
  { value: 'documents', label: '문서', icon: FileText },
  { value: 'outline', label: '아웃라인', icon: List },
  { value: 'inbox', label: '받은함', icon: Inbox },
  { value: 'addressBook', label: '주소록', icon: BookUser },
];

// 상대 시간 포맷. 초/분/시간/월일/연월일 단위로 점증적으로 덜 세밀해진다.
function formatRelativeTime(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '방금 전';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const target = new Date(ts);
  const today = new Date(now);
  if (target.getFullYear() === today.getFullYear()) {
    return `${target.getMonth() + 1}월 ${target.getDate()}일`;
  }
  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  const dd = String(target.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 모바일(md 미만)에서만 사이드바 자동 닫기. 데스크톱에서는 상태 유지.
function closeIfMobile(setOpen: (v: boolean) => void): void {
  if (typeof window === 'undefined') return;
  const isMobile = window.matchMedia?.('(max-width: 767px)').matches ?? false;
  if (isMobile) setOpen(false);
}

type FolderLike = {
  id: string;
  name: string;
  parentId?: string | null;
};

function getFolderDepth(folder: FolderLike, folders: FolderLike[]): number {
  let depth = 0;
  let parentId = folder.parentId ?? null;
  const seen = new Set<string>([folder.id]);
  while (parentId) {
    const parent = folders.find((item) => item.id === parentId);
    if (!parent || seen.has(parent.id)) break;
    depth += 1;
    seen.add(parent.id);
    parentId = parent.parentId ?? null;
  }
  return depth;
}

function orderFoldersForTree<T extends FolderLike>(folders: T[]): T[] {
  const byParent = new Map<string | null, T[]>();
  for (const folder of folders) {
    const parentId = folder.parentId && folders.some((item) => item.id === folder.parentId)
      ? folder.parentId
      : null;
    byParent.set(parentId, [...(byParent.get(parentId) ?? []), folder]);
  }
  for (const items of byParent.values()) {
    items.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }
  const ordered: T[] = [];
  const visit = (parentId: string | null) => {
    for (const folder of byParent.get(parentId) ?? []) {
      ordered.push(folder);
      visit(folder.id);
    }
  };
  visit(null);
  return ordered;
}

function findLockedFolderInChain<T extends FolderLike & { locked: boolean }>(
  folder: T,
  folders: T[],
): T | null {
  let current: T | undefined = folder;
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current.id)) return null;
    seen.add(current.id);
    if (current.locked) return current;
    current = current.parentId ? folders.find((item) => item.id === current?.parentId) : undefined;
  }
  return null;
}

function hasLockedFolderInChain<T extends FolderLike & { locked: boolean }>(
  folder: T,
  folders: T[],
): boolean {
  let current: T | undefined = folder;
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current.id)) return false;
    seen.add(current.id);
    if (current.locked) return true;
    current = current.parentId ? folders.find((item) => item.id === current?.parentId) : undefined;
  }
  return false;
}

function PasscodeDialog({
  prompt,
  onCancel,
}: {
  prompt: PasscodePrompt | null;
  onCancel: () => void;
}) {
  const titleId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState('');

  const handleCancel = useCallback(() => {
    setValue('');
    onCancel();
  }, [onCancel]);

  useEffect(() => {
    if (!prompt) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => inputRef.current?.focus(), 0);
    const handleEsc = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [prompt, handleCancel]);

  if (!prompt) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const passcode = value.trim();
    if (!passcode) return;
    setValue('');
    void prompt.onSubmit(passcode);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleCancel();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-apple ring-1 ring-black/5 dark:bg-surface-1 dark:ring-white/10"
      >
        <h2
          id={titleId}
          className="font-display text-[17px] font-semibold tracking-tight text-apple-ink dark:text-white"
        >
          {prompt.title}
        </h2>
        <label
          htmlFor={inputId}
          className="mt-4 block text-[13px] font-medium text-apple-ink dark:text-white"
        >
          {prompt.label}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="password"
          autoComplete="current-password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="mt-2 w-full rounded-lg border border-apple-border bg-white px-3 py-2 text-[14px] text-apple-ink outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-white/10 dark:bg-surface-4 dark:text-white"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg px-4 py-1.5 text-[13px] font-medium text-apple-ink transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-white dark:hover:bg-white/10"
          >
            취소
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-500 px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
            disabled={value.trim().length === 0}
          >
            {prompt.confirmLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

export function Sidebar() {
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const sidebarTab = useUIStore((s) => s.sidebarTab);
  const setSidebarTab = useUIStore((s) => s.setSidebarTab);
  const documents = useDocumentStore((s) => s.documents);
  const activeId = useDocumentStore((s) => s.activeId);
  const createDocument = useDocumentStore((s) => s.createDocument);
  const switchTo = useDocumentStore((s) => s.switchTo);
  const removeDocument = useDocumentStore((s) => s.removeDocument);
  const moveDocument = useDocumentStore((s) => s.moveDocument);
  const folders = useFolderStore((s) => s.folders);
  const selectedFolderId = useFolderStore((s) => s.selectedFolderId);
  const createFolder = useFolderStore((s) => s.createFolder);
  const renameFolder = useFolderStore((s) => s.renameFolder);
  const moveFolder = useFolderStore((s) => s.moveFolder);
  const deleteFolder = useFolderStore((s) => s.deleteFolder);
  const setSelectedFolder = useFolderStore((s) => s.setSelectedFolder);
  const unlockFolder = useFolderStore((s) => s.unlockFolder);
  const isFolderUnlocked = useFolderStore((s) => s.isFolderUnlocked);
  const user = useAuthStore((s) => s.user);
  const hasPendingInbox = useShareStore((s) => s.inbox.some((share) => share.status === 'pending'));

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [folderDeleteTarget, setFolderDeleteTarget] = useState<FolderDeleteTarget | null>(null);
  const [passcodePrompt, setPasscodePrompt] = useState<PasscodePrompt | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [dragItem, setDragItem] = useState<
    | { type: 'document'; id: string }
    | { type: 'folder'; id: string }
    | null
  >(null);

  const handleCreate = useCallback(async () => {
    const selectedFolder = folders.find((folder) => folder.id === selectedFolderId);
    const folderId = selectedFolder && isFolderUnlocked(selectedFolder.id)
      ? selectedFolder.id
      : null;
    await createDocument({ folderId });
    closeIfMobile(setSidebarOpen);
  }, [createDocument, folders, isFolderUnlocked, selectedFolderId, setSidebarOpen]);

  const handleCreateFolder = useCallback(async () => {
    const name = window.prompt('새 폴더 이름을 입력하세요.', '새 폴더');
    if (!name) return;
    const parentFolder = folders.find((folder) => folder.id === selectedFolderId);
    await createFolder({
      name,
      ...(parentFolder ? { parentId: parentFolder.id } : {}),
    });
  }, [createFolder, folders, selectedFolderId]);

  const handleCreateSecureFolder = useCallback(async () => {
    const name = window.prompt('보안 폴더 이름을 입력하세요.', '비공개');
    if (!name) return;
    setPasscodePrompt({
      title: '보안 폴더 암호코드 설정',
      label: '새 폴더 암호코드',
      confirmLabel: '생성',
      onSubmit: async (passcode) => {
        setPasscodePrompt(null);
        const parentFolder = folders.find((folder) => folder.id === selectedFolderId);
        await createFolder({
          name,
          passcode,
          ...(parentFolder ? { parentId: parentFolder.id } : {}),
        });
      },
    });
  }, [createFolder, folders, selectedFolderId]);

  const handleSelectFolder = useCallback(
    async (id: string | null) => {
      if (!id) {
        setSelectedFolder(null);
        return;
      }
      const folder = folders.find((item) => item.id === id);
      if (!folder) return;
      const lockedFolder = findLockedFolderInChain(folder, folders);
      if (lockedFolder) {
        setPasscodePrompt({
          title: `${lockedFolder.name} 보안 폴더 열기`,
          label: '폴더 암호코드',
          confirmLabel: '열기',
          onSubmit: async (passcode) => {
            const ok = await unlockFolder(lockedFolder.id, passcode);
            if (!ok) {
              window.alert('암호코드가 올바르지 않습니다.');
              return;
            }
            setPasscodePrompt(null);
            setSelectedFolder(id);
          },
        });
        return;
      }
      setSelectedFolder(id);
    },
    [folders, setSelectedFolder, unlockFolder],
  );

  const handleRequestDeleteFolder = useCallback(
    async (folder: FolderDeleteTarget) => {
      if (folder.locked && !isFolderUnlocked(folder.id)) {
        setPasscodePrompt({
          title: `${folder.name} 폴더 삭제 확인`,
          label: '폴더 삭제 암호코드',
          confirmLabel: '확인',
          onSubmit: async (passcode) => {
            const ok = await unlockFolder(folder.id, passcode);
            if (!ok) {
              window.alert('암호코드가 올바르지 않습니다.');
              return;
            }
            setPasscodePrompt(null);
            setFolderDeleteTarget(folder);
          },
        });
        return;
      }
      setFolderDeleteTarget(folder);
    },
    [isFolderUnlocked, unlockFolder],
  );

  const handleConfirmFolderDelete = useCallback(async () => {
    if (!folderDeleteTarget) return;
    const id = folderDeleteTarget.id;
    setFolderDeleteTarget(null);
    await Promise.all(
      documents
        .filter((doc) => doc.folderId === id)
        .map((doc) => moveDocument(doc.id, null)),
    );
    deleteFolder(id);
  }, [deleteFolder, documents, folderDeleteTarget, moveDocument]);

  const handleSelect = useCallback(
    async (id: string) => {
      if (id === activeId) return;
      await switchTo(id);
      closeIfMobile(setSidebarOpen);
    },
    [activeId, switchTo, setSidebarOpen],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    await removeDocument(id);
    setSelectedDocumentIds((ids) => ids.filter((item) => item !== id));
  }, [deleteTarget, removeDocument]);

  const handleConfirmBulkDelete = useCallback(async () => {
    if (selectedDocumentIds.length === 0) return;
    const ids = [...selectedDocumentIds];
    setBulkDeleteOpen(false);
    setSelectedDocumentIds([]);
    await Promise.all(ids.map((id) => removeDocument(id)));
  }, [removeDocument, selectedDocumentIds]);

  const toggleDocumentSelection = useCallback((id: string) => {
    setSelectedDocumentIds((ids) => (
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
    ));
  }, []);

  const moveDocumentsTogether = useCallback(
    async (id: string, folderId: string | null) => {
      const ids = selectedDocumentIds.includes(id) ? selectedDocumentIds : [id];
      await Promise.all(ids.map((docId) => moveDocument(docId, folderId)));
    },
    [moveDocument, selectedDocumentIds],
  );

  const handleRenameFolder = useCallback(
    (folder: { id: string; name: string }) => {
      const name = window.prompt('폴더 이름을 입력하세요.', folder.name);
      if (!name) return;
      renameFolder(folder.id, name);
    },
    [renameFolder],
  );

  const handleDropOnFolder = useCallback(
    async (folderId: string | null) => {
      if (!dragItem) return;
      if (dragItem.type === 'document') {
        await moveDocumentsTogether(dragItem.id, folderId);
      } else {
        moveFolder(dragItem.id, folderId);
      }
      setDragItem(null);
    },
    [dragItem, moveDocumentsTogether, moveFolder],
  );

  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId);
  const orderedFolders = orderFoldersForTree(folders);
  const selectedFolderLocked = Boolean(
    selectedFolder && !isFolderUnlocked(selectedFolder.id),
  );
  const isDocumentVisibleInSelectedScope = useCallback(
    (folderId: string | null | undefined): boolean => {
      if (selectedFolderId === null) {
        if (!folderId) return true;
        const folder = folders.find((item) => item.id === folderId);
        // 전체 문서에서는 보안 폴더와 그 하위폴더 문서를 잠금 해제 여부와 무관하게 숨긴다.
        return folder ? !hasLockedFolderInChain(folder, folders) : true;
      }
      if (!folderId) return true;
      return isFolderUnlocked(folderId);
    },
    [folders, isFolderUnlocked, selectedFolderId],
  );
  const visibleDocuments = selectedFolderId
    ? selectedFolderLocked
      ? []
      : documents.filter((doc) => doc.folderId === selectedFolderId && isDocumentVisibleInSelectedScope(doc.folderId))
    : documents.filter((doc) => isDocumentVisibleInSelectedScope(doc.folderId));

  const handleTabClick = useCallback(
    (tab: SidebarTab) => {
      setSidebarTab(tab);
      // 아웃라인 탭으로 전환 시 사이드바가 열려있어야 함
      if (tab === 'outline' || tab === 'inbox' || tab === 'addressBook') {
        setSidebarOpen(true);
      }
    },
    [setSidebarTab, setSidebarOpen]
  );

  return (
    <>
      <button
        type="button"
        aria-label="사이드바 닫기"
        onClick={() => setSidebarOpen(false)}
        className="absolute inset-x-0 bottom-0 top-[var(--mobile-chrome-height)] z-20 bg-black/40 backdrop-blur-sm md:hidden"
      />
      <aside
        role="navigation"
        aria-label={
          sidebarTab === 'documents'
            ? '문서 목록'
            : sidebarTab === 'outline'
              ? '문서 아웃라인'
              : sidebarTab === 'inbox'
                ? '받은 문서함'
                : '주소록'
        }
        className="fixed bottom-0 left-0 top-[var(--mobile-chrome-height)] z-50 flex w-[min(18rem,calc(100vw-2rem))] flex-col bg-apple-bg pb-[env(safe-area-inset-bottom)] shadow-apple md:static md:h-full md:w-56 md:shrink-0 md:pb-0 md:shadow-none dark:bg-surface-5"
      >
        {/* 탭 네비게이션 */}
        <div
          role="tablist"
          aria-label="사이드바 보기"
          className="flex border-b border-apple-border dark:border-white/10"
        >
          {TABS.map(({ value: tab, label, icon: Icon }) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabClick(tab)}
              aria-selected={sidebarTab === tab}
              aria-controls={`${tab}-panel`}
              role="tab"
              className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 px-1 py-2 text-[12px] font-medium transition-colors relative ${
                sidebarTab === tab
                  ? 'border-b-2 border-[#005eb8] text-[#005eb8] dark:border-[#6eb4ff] dark:text-[#6eb4ff]'
                  : 'text-apple-ink/70 hover:text-apple-ink dark:text-white/70 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
              {tab === 'inbox' && hasPendingInbox ? (
                <span
                  aria-label="새로 받은 문서 있음"
                  className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-apple-bg dark:ring-surface-5"
                />
              ) : null}
            </button>
          ))}
        </div>

        {/* 탭 패널 — 활성 패널만 flex-1로 남은 세로 공간을 차지하고, 비활성 패널은
            display:none(hidden)으로 flex 분배에서 제외해 활성 패널 높이를 보존한다. */}
        <div
          role="tabpanel"
          id="documents-panel"
          className={sidebarTab === 'documents' ? 'flex-1 overflow-hidden' : 'hidden'}
        >
          {sidebarTab === 'documents' ? (
            <div className="flex flex-col h-full">
              <div className="flex flex-col gap-2 px-3 py-3">
                <button
                  type="button"
                  onClick={handleCreate}
                  aria-label="새 문서"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <FilePlus className="h-4 w-4" aria-hidden="true" />
                  <span>새 문서</span>
                </button>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={handleCreateFolder}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-apple-border px-2 py-1.5 text-[12px] font-medium text-apple-ink hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
                  >
                    <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    폴더
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateSecureFolder}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-apple-border px-2 py-1.5 text-[12px] font-medium text-apple-ink hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
                  >
                    <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                    보안
                  </button>
                </div>
                {selectedDocumentIds.length > 0 ? (
                  <button
                    type="button"
                    aria-label={`선택 문서 ${selectedDocumentIds.length}개 삭제`}
                    onClick={() => setBulkDeleteOpen(true)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    선택 문서 {selectedDocumentIds.length}개 삭제
                  </button>
                ) : null}
              </div>
              <nav aria-label="폴더와 문서 목록" className="flex-1 overflow-y-auto px-2 pb-3">
                <div className="flex flex-col gap-1 border-t border-apple-border pt-2 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => handleSelectFolder(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleDropOnFolder(null);
                    }}
                    aria-current={selectedFolderId === null ? 'true' : undefined}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12px] ${
                      selectedFolderId === null
                        ? 'bg-blue-500 text-white'
                        : 'text-apple-ink hover:bg-black/5 dark:text-white dark:hover:bg-white/5'
                    }`}
                  >
                    <Folder className="h-3.5 w-3.5" aria-hidden="true" />
                    전체 문서
                  </button>
                  {orderedFolders.map((folder) => {
                    const locked = !isFolderUnlocked(folder.id);
                    const depth = getFolderDepth(folder, folders);
                    const indentClass = depth > 0 ? 'pl-6' : 'pl-2';
                    return (
                      <div
                        key={folder.id}
                        className="group flex items-center gap-1"
                        data-testid={`folder-row-${folder.id}`}
                        draggable
                        onDragStart={() => setDragItem({ type: 'folder', id: folder.id })}
                        onDragEnd={() => setDragItem(null)}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectFolder(folder.id)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void handleDropOnFolder(folder.id);
                          }}
                          aria-label={locked ? `${folder.name} 잠김` : folder.name}
                          aria-current={selectedFolderId === folder.id ? 'true' : undefined}
                          className={`inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-[12px] ${indentClass} ${
                            selectedFolderId === folder.id
                              ? 'bg-blue-500 text-white'
                              : 'text-apple-ink hover:bg-black/5 dark:text-white dark:hover:bg-white/5'
                          }`}
                        >
                          {locked ? <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <Folder className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                          <span className="truncate">{folder.name}</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`${folder.name} 폴더 이름 변경`}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRenameFolder({ id: folder.id, name: folder.name });
                          }}
                          className="rounded-md p-1 text-apple-ink/50 opacity-80 transition-colors hover:bg-black/10 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-blue-400 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={`${folder.name}${locked ? ' 잠김' : ''} 폴더 삭제`}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleRequestDeleteFolder({
                              id: folder.id,
                              name: folder.name,
                              locked: folder.locked,
                            });
                          }}
                          className="rounded-md p-1 text-apple-ink/50 opacity-80 transition-colors hover:bg-black/10 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 border-t border-apple-border pt-2 dark:border-white/10">
                {visibleDocuments.length === 0 ? (
                  <p className="px-2 py-4 text-center text-[12px] text-apple-ink/70 dark:text-white/70">
                    아직 문서가 없습니다
                  </p>
                ) : (
                  <ul role="list" className="flex flex-col gap-0.5">
                    {visibleDocuments.map((doc) => {
                      const active = doc.id === activeId;
                      const displayTitle = doc.title.trim() || '제목 없음';
                      const itemClass = active
                        ? 'flex h-9 w-full items-center gap-2 rounded-lg px-2.5 py-1 pl-8 pr-14 text-left text-[13px] bg-blue-500 text-white'
                        : 'flex h-9 w-full items-center gap-2 rounded-lg px-2.5 py-1 pl-8 pr-14 text-left text-[13px] text-apple-ink hover:bg-black/5 dark:text-white dark:hover:bg-white/5';
                      return (
                        <li key={doc.id}>
                          <div
                            className="group relative h-9"
                            data-testid={`document-row-${doc.id}`}
                            draggable
                            onDragStart={() => setDragItem({ type: 'document', id: doc.id })}
                            onDragEnd={() => setDragItem(null)}
                          >
                            <input
                              type="checkbox"
                              aria-label={`${displayTitle} 선택`}
                              checked={selectedDocumentIds.includes(doc.id)}
                              onClick={(event) => event.stopPropagation()}
                              onChange={() => toggleDocumentSelection(doc.id)}
                              className="absolute left-1 top-1/2 z-10 h-4 w-4 -translate-y-1/2 rounded border-apple-border text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            />
                            <button
                              type="button"
                              aria-label={displayTitle}
                              aria-current={active ? 'true' : undefined}
                              onClick={() => handleSelect(doc.id)}
                              className={
                                itemClass +
                                ' focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                              }
                            >
                              <FileText
                                className="h-3.5 w-3.5 shrink-0 opacity-70"
                                aria-hidden="true"
                              />
                              <span className="min-w-0 flex-1 truncate">
                                {displayTitle}
                              </span>
                              <span
                                className={
                                  'shrink-0 text-[10px] tabular-nums ' +
                                  (active
                                    ? 'text-white'
                                    : 'text-apple-ink/70 dark:text-white/70')
                                }
                              >
                                {formatRelativeTime(doc.updatedAt)}
                              </span>
                            </button>
                            <select
                              aria-label={`${displayTitle} 폴더 이동`}
                              value={doc.folderId ?? ''}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => {
                                void moveDocumentsTogether(doc.id, event.target.value || null);
                              }}
                              className={
                                'absolute right-7 top-1/2 h-7 w-7 -translate-y-1/2 rounded-md border px-0 text-[10px] transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ' +
                                (active
                                  ? 'border-white/60 bg-[#005eb8] text-white opacity-100'
                                  : 'border-apple-border bg-white text-apple-ink opacity-70 hover:opacity-100 dark:border-white/10 dark:bg-surface-4 dark:text-white md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100')
                              }
                            >
                              <option className="text-apple-ink" value="">전체 문서</option>
                              {orderedFolders.map((folder) => (
                                <option className="text-apple-ink" key={folder.id} value={folder.id}>
                                  {'　'.repeat(getFolderDepth(folder, folders))}{folder.locked ? '🔒 ' : ''}{folder.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              aria-label={`${displayTitle} 삭제`}
                              onClick={(event) => {
                                // 부모 아이템의 switchTo가 실행되면 안 되므로 이벤트 전파 차단.
                                event.stopPropagation();
                                setDeleteTarget({ id: doc.id, title: displayTitle });
                              }}
                              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-apple-ink/50 opacity-0 transition-opacity hover:bg-black/10 hover:text-red-600 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 group-hover:opacity-100 group-focus-within:opacity-100 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                </div>
              </nav>
            </div>
          ) : null}
        </div>

        <div
          role="tabpanel"
          id="outline-panel"
          className={sidebarTab === 'outline' ? 'flex-1 overflow-hidden' : 'hidden'}
        >
          {sidebarTab === 'outline' && <OutlinePanel />}
        </div>

        <div
          role="tabpanel"
          id="inbox-panel"
          className={sidebarTab === 'inbox' ? 'flex-1 overflow-hidden' : 'hidden'}
        >
          {sidebarTab === 'inbox' && <InboxPanel user={user} />}
        </div>

        <div
          role="tabpanel"
          id="addressBook-panel"
          className={sidebarTab === 'addressBook' ? 'flex-1 overflow-hidden' : 'hidden'}
        >
          {sidebarTab === 'addressBook' && <AddressBookPanel />}
        </div>

        <ConfirmDialog
          open={folderDeleteTarget !== null}
          title="폴더 삭제"
          message={
            folderDeleteTarget
              ? `"${folderDeleteTarget.name}" 폴더를 삭제하시겠습니까? 폴더 안의 문서는 삭제하지 않고 전체 문서로 이동합니다.`
              : ''
          }
          confirmLabel="삭제"
          destructive
          onConfirm={handleConfirmFolderDelete}
          onCancel={() => setFolderDeleteTarget(null)}
        />

        <ConfirmDialog
          open={deleteTarget !== null}
          title="문서 삭제"
          message={
            deleteTarget
              ? `"${deleteTarget.title}" 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
              : ''
          }
          confirmLabel="삭제"
          destructive
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
        <ConfirmDialog
          open={bulkDeleteOpen}
          title="선택 문서 삭제"
          message={`선택한 문서 ${selectedDocumentIds.length}개를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="삭제"
          destructive
          onConfirm={handleConfirmBulkDelete}
          onCancel={() => setBulkDeleteOpen(false)}
        />
        <PasscodeDialog
          prompt={passcodePrompt}
          onCancel={() => setPasscodePrompt(null)}
        />
      </aside>
    </>
  );
}
