import { useEffect } from 'react';
import type { AppUser } from '../../lib/auth/authService';
import { useDocumentStore } from '../../stores/documentStore';
import { useShareStore } from '../../stores/shareStore';

type InboxPanelProps = {
  user: AppUser | null;
};

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

export function InboxPanel({ user }: InboxPanelProps) {
  const inbox = useShareStore((s) => s.inbox);
  const loading = useShareStore((s) => s.loading);
  const error = useShareStore((s) => s.error);
  const loadInbox = useShareStore((s) => s.loadInbox);
  const acceptIntoLocalDocument = useShareStore((s) => s.acceptIntoLocalDocument);
  const createDocument = useDocumentStore((s) => s.createDocument);
  const switchTo = useDocumentStore((s) => s.switchTo);

  useEffect(() => {
    if (user) void loadInbox(user);
  }, [loadInbox, user]);

  if (!user) {
    return (
      <div className="px-3 py-4 text-sm text-apple-ink/70 dark:text-white/70">
        Google 로그인 후 받은 문서를 볼 수 있습니다.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-3">
        <div>
          <h2 className="text-sm font-semibold text-apple-ink dark:text-white">받은 문서함</h2>
          <p className="text-[11px] text-apple-ink/60 dark:text-white/60">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadInbox(user)}
          className="rounded-md px-2 py-1 text-[12px] text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
        >
          새로고침
        </button>
      </div>
      {error ? <p role="alert" className="mx-3 mb-2 rounded-md bg-red-50 px-2 py-1 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p> : null}
      {loading && inbox.length === 0 ? (
        <p className="px-3 py-4 text-sm text-apple-ink/70 dark:text-white/70">불러오는 중…</p>
      ) : inbox.length === 0 ? (
        <p className="px-3 py-4 text-sm text-apple-ink/70 dark:text-white/70">받은 문서가 없습니다.</p>
      ) : (
        <ul role="list" className="flex flex-col gap-2 overflow-y-auto px-2 pb-3">
          {inbox.map((share) => {
            const accepted = share.status === 'accepted';
            return (
              <li key={share.id} className="rounded-xl border border-apple-border bg-white/70 p-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="min-w-0">
                  <h3 className="truncate font-medium text-apple-ink dark:text-white">{share.title}</h3>
                  <p className="mt-1 text-[11px] text-apple-ink/60 dark:text-white/60">
                    {share.senderEmail} · {formatDate(share.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={accepted || loading}
                  aria-label={`${share.title} 가져오기`}
                  onClick={() => void acceptIntoLocalDocument(share.id, createDocument, switchTo)}
                  className="mt-2 w-full rounded-lg bg-blue-500 px-2 py-1.5 text-[12px] font-medium text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {accepted ? '가져옴' : '내 문서로 가져오기'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
