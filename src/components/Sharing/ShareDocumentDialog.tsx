import { useState, type FormEvent } from 'react';
import type { AppUser } from '../../lib/auth/authService';
import { useAddressBookStore } from '../../stores/addressBookStore';
import { useDocumentStore } from '../../stores/documentStore';
import { useShareStore } from '../../stores/shareStore';

type ShareDocumentDialogProps = {
  open: boolean;
  user: AppUser | null;
  onClose: () => void;
};

export function ShareDocumentDialog({ open, user, onClose }: ShareDocumentDialogProps) {
  const contacts = useAddressBookStore((s) => s.contacts);
  const upsertContact = useAddressBookStore((s) => s.upsertContact);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [saveToAddressBook, setSaveToAddressBook] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const activeId = useDocumentStore((s) => s.activeId);
  const title = useDocumentStore((s) => s.title);
  const content = useDocumentStore((s) => s.content);
  const flushSave = useDocumentStore((s) => s.flushSave);
  const loading = useShareStore((s) => s.loading);
  const error = useShareStore((s) => s.error);
  const sendActiveDocument = useShareStore((s) => s.sendActiveDocument);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    if (!activeId) {
      setLocalError('보낼 문서를 먼저 선택해 주세요.');
      return;
    }
    try {
      await sendActiveDocument({
        user,
        recipientEmail,
        document: { id: activeId, title, content },
        flushSave,
      });
      if (saveToAddressBook) {
        upsertContact({ name: recipientName, email: recipientEmail });
      }
      setRecipientName('');
      setRecipientEmail('');
      setSaveToAddressBook(false);
      onClose();
    } catch (submitError) {
      setLocalError(submitError instanceof Error ? submitError.message : '문서를 보내지 못했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="share-dialog-title" className="w-full max-w-md rounded-2xl bg-white p-5 text-apple-ink shadow-apple-lg dark:bg-surface-4 dark:text-white">
        <div className="mb-4">
          <h2 id="share-dialog-title" className="text-base font-semibold">
            문서 보내기
          </h2>
          <p className="mt-1 text-sm text-apple-ink/70 dark:text-white/70">
            현재 문서의 사본을 Google 계정 이메일로 보냅니다.
          </p>
        </div>

        {!user ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
              Google 로그인 후 문서를 보낼 수 있습니다.
            </p>
            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10">
                닫기
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {contacts.length > 0 ? (
              <div className="rounded-xl bg-black/[0.03] p-2 dark:bg-white/5">
                <p className="mb-2 text-[12px] font-medium text-apple-ink/70 dark:text-white/70">
                  주소록에서 선택
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {contacts.slice(0, 8).map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      aria-label={`${contact.name} 선택`}
                      onClick={() => {
                        setRecipientName(contact.name);
                        setRecipientEmail(contact.email);
                      }}
                      className="rounded-full bg-white px-2 py-1 text-[12px] text-apple-ink shadow-sm hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-white/10 dark:text-white dark:hover:bg-blue-500/20"
                    >
                      {contact.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="block text-sm font-medium">
              받는 사람 이름
              <input
                type="text"
                aria-label="받는 사람 이름"
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                placeholder="홍길동"
                className="mt-1 w-full rounded-lg border border-apple-border bg-white px-3 py-2 text-sm text-apple-ink outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-surface-5 dark:text-white"
              />
            </label>
            <label className="block text-sm font-medium">
              받는 사람 이메일
              <input
                type="email"
                required
                aria-label="받는 사람 이메일"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                placeholder="friend@gmail.com"
                className="mt-1 w-full rounded-lg border border-apple-border bg-white px-3 py-2 text-sm text-apple-ink outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-surface-5 dark:text-white"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-apple-ink/80 dark:text-white/80">
              <input
                type="checkbox"
                checked={saveToAddressBook}
                onChange={(event) => setSaveToAddressBook(event.target.checked)}
                className="h-4 w-4 rounded border-apple-border text-blue-500 focus:ring-blue-500"
              />
              주소록에 저장
            </label>
            {localError || error ? (
              <p role="alert" className="text-sm text-red-600 dark:text-red-300">
                {localError ?? error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10">
                취소
              </button>
              <button type="submit" disabled={loading} className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60">
                보내기
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
