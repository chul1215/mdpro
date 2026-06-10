import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { useAddressBookStore } from '../../stores/addressBookStore';

export function AddressBookPanel() {
  const contacts = useAddressBookStore((s) => s.contacts);
  const upsertContact = useAddressBookStore((s) => s.upsertContact);
  const removeContact = useAddressBookStore((s) => s.removeContact);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      upsertContact({ name, email });
      setName('');
      setEmail('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '주소를 저장하지 못했습니다.');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-3">
        <h2 className="text-sm font-semibold text-apple-ink dark:text-white">주소록</h2>
        <p className="mt-1 text-[11px] text-apple-ink/60 dark:text-white/60">
          문서를 자주 보내는 Google 이메일을 저장합니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 border-y border-apple-border px-3 py-3 dark:border-white/10">
        <label className="block text-[12px] font-medium text-apple-ink dark:text-white">
          이름
          <input
            type="text"
            aria-label="이름"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="홍길동"
            className="mt-1 w-full rounded-lg border border-apple-border bg-white px-2 py-1.5 text-[12px] text-apple-ink outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-surface-5 dark:text-white"
          />
        </label>
        <label className="block text-[12px] font-medium text-apple-ink dark:text-white">
          이메일
          <input
            type="email"
            required
            aria-label="이메일"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="friend@gmail.com"
            className="mt-1 w-full rounded-lg border border-apple-border bg-white px-2 py-1.5 text-[12px] text-apple-ink outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-surface-5 dark:text-white"
          />
        </label>
        {error ? <p role="alert" className="text-[12px] text-red-600 dark:text-red-300">{error}</p> : null}
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-500 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          주소 추가
        </button>
      </form>

      {contacts.length === 0 ? (
        <p className="px-3 py-4 text-sm text-apple-ink/70 dark:text-white/70">저장된 주소가 없습니다.</p>
      ) : (
        <ul role="list" className="flex flex-col gap-2 overflow-y-auto px-2 py-3">
          {contacts.map((contact) => (
            <li key={contact.id} className="group relative rounded-xl border border-apple-border bg-white/70 p-3 pr-10 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="truncate font-medium text-apple-ink dark:text-white">{contact.name}</p>
              <p className="mt-1 truncate text-[11px] text-apple-ink/60 dark:text-white/60">{contact.email}</p>
              <button
                type="button"
                aria-label={`${contact.name} 삭제`}
                onClick={() => removeContact(contact.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-apple-ink/50 hover:bg-black/10 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
