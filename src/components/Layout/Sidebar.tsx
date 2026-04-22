import { useCallback, useState } from 'react';
import { FilePlus, FileText, Trash2 } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useDocumentStore } from '../../stores/documentStore';
import { ConfirmDialog } from '../Modal/ConfirmDialog';

type DeleteTarget = { id: string; title: string };

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
  const documents = useDocumentStore((s) => s.documents);
  const activeId = useDocumentStore((s) => s.activeId);
  const createDocument = useDocumentStore((s) => s.createDocument);
  const switchTo = useDocumentStore((s) => s.switchTo);
  const removeDocument = useDocumentStore((s) => s.removeDocument);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const handleCreate = useCallback(async () => {
    await createDocument();
    closeIfMobile(setSidebarOpen);
  }, [createDocument, setSidebarOpen]);

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

  return (
    <>
      <button
        type="button"
        aria-label="사이드바 닫기"
        onClick={() => setSidebarOpen(false)}
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
      />
      <aside
        role="navigation"
        aria-label="문서 목록"
        className="absolute left-0 top-12 z-40 flex h-[calc(100%-3rem)] w-64 flex-col bg-apple-bg shadow-apple md:static md:top-0 md:h-full md:w-56 md:shadow-none dark:bg-surface-5"
      >
        <div className="flex flex-col gap-2 px-3 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-ink/70 dark:text-white/70">
            문서
          </span>
          <button
            type="button"
            onClick={handleCreate}
            aria-label="새 문서"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <FilePlus className="h-4 w-4" aria-hidden="true" />
            <span>새 문서</span>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          {documents.length === 0 ? (
            <p className="px-2 py-4 text-center text-[12px] text-apple-ink/70 dark:text-white/70">
              아직 문서가 없습니다
            </p>
          ) : (
            <ul role="list" className="flex flex-col gap-0.5">
              {documents.map((doc) => {
                const active = doc.id === activeId;
                const displayTitle = doc.title.trim() || '제목 없음';
                const itemClass = active
                  ? 'group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] bg-blue-500 text-white'
                  : 'group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-apple-ink hover:bg-black/5 dark:text-white dark:hover:bg-white/5';
                return (
                  <li key={doc.id}>
                    <div className="relative">
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
        </nav>
      </aside>
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
    </>
  );
}
