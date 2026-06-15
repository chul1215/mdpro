import { useCallback, useState } from 'react';
import { BookUser, FilePlus, FileText, Folder, FolderPlus, Inbox, List, Lock, Shield, Trash2 } from 'lucide-react';
import { useUIStore, type SidebarTab } from '../../stores/uiStore';
import { useDocumentStore } from '../../stores/documentStore';
import { useFolderStore } from '../../stores/folderStore';
import { ConfirmDialog } from '../Modal/ConfirmDialog';
import { OutlinePanel } from './OutlinePanel';
import { InboxPanel } from '../Sharing/InboxPanel';
import { AddressBookPanel } from '../Sharing/AddressBookPanel';
import { useAuthStore } from '../../stores/authStore';

type DeleteTarget = { id: string; title: string };
type FolderDeleteTarget = { id: string; name: string; locked: boolean };

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
  const deleteFolder = useFolderStore((s) => s.deleteFolder);
  const setSelectedFolder = useFolderStore((s) => s.setSelectedFolder);
  const unlockFolder = useFolderStore((s) => s.unlockFolder);
  const isFolderUnlocked = useFolderStore((s) => s.isFolderUnlocked);
  const user = useAuthStore((s) => s.user);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [folderDeleteTarget, setFolderDeleteTarget] = useState<FolderDeleteTarget | null>(null);

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
    await createFolder({ name });
  }, [createFolder]);

  const handleCreateSecureFolder = useCallback(async () => {
    const name = window.prompt('보안 폴더 이름을 입력하세요.', '비공개');
    if (!name) return;
    const passcode = window.prompt('폴더 암호코드를 입력하세요.');
    if (!passcode) return;
    await createFolder({ name, passcode });
  }, [createFolder]);

  const handleSelectFolder = useCallback(
    async (id: string | null) => {
      if (!id) {
        setSelectedFolder(null);
        return;
      }
      const folder = folders.find((item) => item.id === id);
      if (!folder) return;
      if (folder.locked && !isFolderUnlocked(id)) {
        const passcode = window.prompt('폴더 암호코드를 입력하세요.');
        if (!passcode) return;
        const ok = await unlockFolder(id, passcode);
        if (!ok) {
          window.alert('암호코드가 올바르지 않습니다.');
          return;
        }
      }
      setSelectedFolder(id);
    },
    [folders, isFolderUnlocked, setSelectedFolder, unlockFolder],
  );

  const handleRequestDeleteFolder = useCallback(
    async (folder: FolderDeleteTarget) => {
      if (folder.locked && !isFolderUnlocked(folder.id)) {
        const passcode = window.prompt('폴더 삭제를 위해 암호코드를 입력하세요.');
        if (!passcode) return;
        const ok = await unlockFolder(folder.id, passcode);
        if (!ok) {
          window.alert('암호코드가 올바르지 않습니다.');
          return;
        }
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
  }, [deleteTarget, removeDocument]);

  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId);
  const selectedFolderLocked = Boolean(
    selectedFolder?.locked && !isFolderUnlocked(selectedFolder.id),
  );
  const visibleDocuments = selectedFolderId
    ? selectedFolderLocked
      ? []
      : documents.filter((doc) => doc.folderId === selectedFolderId)
    : documents;

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
        className="absolute inset-0 z-20 bg-black/40 backdrop-blur-sm md:hidden"
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
        className="fixed inset-y-0 left-0 z-30 flex w-[min(18rem,calc(100vw-2rem))] flex-col bg-apple-bg shadow-apple md:static md:h-full md:w-56 md:shrink-0 md:shadow-none dark:bg-surface-5"
      >
        {/* 탭 네비게이션 */}
        <div className="flex border-b border-apple-border dark:border-white/10">
          {TABS.map(({ value: tab, label, icon: Icon }) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabClick(tab)}
              aria-selected={sidebarTab === tab}
              aria-controls={`${tab}-panel`}
              role="tab"
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[12px] font-medium transition-colors relative ${
                sidebarTab === tab
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-apple-ink/70 hover:text-apple-ink dark:text-white/70 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* 탭 패널 */}
        <div role="tabpanel" id="documents-panel" className="flex-1 overflow-hidden">
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
              </div>
              <nav aria-label="폴더와 문서 목록" className="flex-1 overflow-y-auto px-2 pb-3">
                <div className="flex flex-col gap-1 border-t border-apple-border pt-2 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => handleSelectFolder(null)}
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
                  {folders.map((folder) => {
                    const locked = folder.locked && !isFolderUnlocked(folder.id);
                    return (
                      <div key={folder.id} className="group flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSelectFolder(folder.id)}
                          aria-label={locked ? `${folder.name} 잠김` : folder.name}
                          aria-current={selectedFolderId === folder.id ? 'true' : undefined}
                          className={`inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12px] ${
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
                        ? 'flex h-9 w-full items-center gap-2 rounded-lg px-2.5 py-1 pr-14 text-left text-[13px] bg-blue-500 text-white'
                        : 'flex h-9 w-full items-center gap-2 rounded-lg px-2.5 py-1 pr-14 text-left text-[13px] text-apple-ink hover:bg-black/5 dark:text-white dark:hover:bg-white/5';
                      return (
                        <li key={doc.id}>
                          <div className="group relative h-9" data-testid={`document-row-${doc.id}`}>
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
                                void moveDocument(doc.id, event.target.value || null);
                              }}
                              className={
                                'absolute right-7 top-1/2 h-7 w-7 -translate-y-1/2 rounded-md border px-0 text-[10px] text-transparent transition-opacity focus:text-apple-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus:text-white ' +
                                (active
                                  ? 'border-white/40 bg-white/15 opacity-90'
                                  : 'border-apple-border bg-white opacity-70 hover:opacity-100 dark:border-white/10 dark:bg-surface-4 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100')
                              }
                            >
                              <option className="text-apple-ink" value="">전체 문서</option>
                              {folders.map((folder) => (
                                <option className="text-apple-ink" key={folder.id} value={folder.id}>
                                  {folder.locked ? '🔒 ' : ''}{folder.name}
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

        <div role="tabpanel" id="outline-panel" className="flex-1 overflow-hidden">
          {sidebarTab === 'outline' && <OutlinePanel />}
        </div>

        <div role="tabpanel" id="inbox-panel" className="flex-1 overflow-hidden">
          {sidebarTab === 'inbox' && <InboxPanel user={user} />}
        </div>

        <div role="tabpanel" id="addressBook-panel" className="flex-1 overflow-hidden">
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
      </aside>
    </>
  );
}
