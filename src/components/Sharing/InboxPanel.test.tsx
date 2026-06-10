import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadInbox = vi.fn(async () => undefined);
const acceptIntoLocalDocument = vi.fn(async () => 'new-doc');
let mockShare = {
  inbox: [] as Array<{
    id: string;
    senderEmail: string;
    title: string;
    content: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: number;
  }>,
  loading: false,
  error: null as string | null,
  loadInbox,
  acceptIntoLocalDocument,
};
vi.mock('../../stores/shareStore', () => ({
  useShareStore: <T,>(selector: (state: typeof mockShare) => T) => selector(mockShare),
}));

const createDocument = vi.fn(async () => 'new-doc');
const switchTo = vi.fn(async () => undefined);
vi.mock('../../stores/documentStore', () => ({
  useDocumentStore: <T,>(selector: (state: { createDocument: typeof createDocument; switchTo: typeof switchTo }) => T) =>
    selector({ createDocument, switchTo }),
}));

import { InboxPanel } from './InboxPanel';

describe('InboxPanel', () => {
  beforeEach(() => {
    loadInbox.mockClear();
    acceptIntoLocalDocument.mockClear();
    createDocument.mockClear();
    switchTo.mockClear();
    mockShare = { inbox: [], loading: false, error: null, loadInbox, acceptIntoLocalDocument };
  });

  it('requires login to view received documents', () => {
    render(<InboxPanel user={null} />);

    expect(screen.getByText(/Google 로그인 후 받은 문서를 볼 수 있습니다/)).toBeInTheDocument();
  });

  it('loads and imports received documents', async () => {
    const user = { uid: 'uid-1', email: 'user@example.com', displayName: null, photoURL: null };
    mockShare = {
      ...mockShare,
      inbox: [
        {
          id: 'share-1',
          senderEmail: 'sender@example.com',
          title: '받은 문서',
          content: '# 받은 문서',
          status: 'pending',
          createdAt: 1234,
        },
      ],
    };

    render(<InboxPanel user={user} />);

    await waitFor(() => expect(loadInbox).toHaveBeenCalledWith(user));
    expect(screen.getByText('받은 문서')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '받은 문서 가져오기' }));

    expect(acceptIntoLocalDocument).toHaveBeenCalledWith('share-1', createDocument, switchTo);
  });
});
