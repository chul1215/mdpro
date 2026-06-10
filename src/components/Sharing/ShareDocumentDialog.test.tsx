import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendActiveDocument = vi.fn(async () => 'share-1');
let mockShare = { loading: false, error: null as string | null, sendActiveDocument };
vi.mock('../../stores/shareStore', () => ({
  useShareStore: <T,>(selector: (state: typeof mockShare) => T) => selector(mockShare),
}));

const flushSave = vi.fn(async () => undefined);
let mockDoc = { activeId: 'doc-1', title: '문서', content: '# 문서', flushSave };
vi.mock('../../stores/documentStore', () => ({
  useDocumentStore: <T,>(selector: (state: typeof mockDoc) => T) => selector(mockDoc),
}));

const upsertContact = vi.fn();
let mockAddressBook = {
  contacts: [] as Array<{ id: string; name: string; email: string; updatedAt: number }>,
  upsertContact,
};
vi.mock('../../stores/addressBookStore', () => ({
  useAddressBookStore: <T,>(selector: (state: typeof mockAddressBook) => T) =>
    selector(mockAddressBook),
}));

import { ShareDocumentDialog } from './ShareDocumentDialog';

describe('ShareDocumentDialog', () => {
  beforeEach(() => {
    sendActiveDocument.mockClear();
    flushSave.mockClear();
    upsertContact.mockClear();
    mockShare = { loading: false, error: null, sendActiveDocument };
    mockDoc = { activeId: 'doc-1', title: '문서', content: '# 문서', flushSave };
    mockAddressBook = { contacts: [], upsertContact };
  });

  it('requires login before sending', () => {
    render(<ShareDocumentDialog open onClose={vi.fn()} user={null} />);

    expect(screen.getByText(/Google 로그인 후 문서를 보낼 수 있습니다/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '받는 사람 이메일' })).not.toBeInTheDocument();
  });

  it('sends the active document to a recipient email', async () => {
    const onClose = vi.fn();
    const user = { uid: 'uid-1', email: 'user@example.com', displayName: null, photoURL: null };
    render(<ShareDocumentDialog open onClose={onClose} user={user} />);

    await userEvent.type(screen.getByRole('textbox', { name: '받는 사람 이메일' }), 'friend@example.com');
    await userEvent.click(screen.getByRole('button', { name: '보내기' }));

    await waitFor(() => {
      expect(sendActiveDocument).toHaveBeenCalledWith({
        user,
        recipientEmail: 'friend@example.com',
        document: { id: 'doc-1', title: '문서', content: '# 문서' },
        flushSave,
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('selects a recipient from the address book', async () => {
    const user = { uid: 'uid-1', email: 'user@example.com', displayName: null, photoURL: null };
    mockAddressBook = {
      contacts: [{ id: 'contact-1', name: '홍길동', email: 'friend@example.com', updatedAt: 1234 }],
      upsertContact,
    };
    render(<ShareDocumentDialog open onClose={vi.fn()} user={user} />);

    await userEvent.click(screen.getByRole('button', { name: '홍길동 선택' }));

    expect(screen.getByRole('textbox', { name: '받는 사람 이메일' })).toHaveValue('friend@example.com');
  });

  it('saves recipient to address book after successful send when requested', async () => {
    const user = { uid: 'uid-1', email: 'user@example.com', displayName: null, photoURL: null };
    render(<ShareDocumentDialog open onClose={vi.fn()} user={user} />);

    await userEvent.type(screen.getByRole('textbox', { name: '받는 사람 이름' }), '홍길동');
    await userEvent.type(screen.getByRole('textbox', { name: '받는 사람 이메일' }), 'friend@example.com');
    await userEvent.click(screen.getByRole('checkbox', { name: '주소록에 저장' }));
    await userEvent.click(screen.getByRole('button', { name: '보내기' }));

    await waitFor(() => {
      expect(upsertContact).toHaveBeenCalledWith({ name: '홍길동', email: 'friend@example.com' });
    });
  });
});
