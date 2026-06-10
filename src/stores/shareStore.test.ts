import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendDocumentShare = vi.fn(async () => 'share-1');
const listInboxShares = vi.fn(async () => [
  {
    id: 'share-1',
    senderUid: 'sender-1',
    senderEmail: 'sender@example.com',
    recipientEmail: 'user@example.com',
    title: '받은 문서',
    content: '# 받은 문서',
    sourceDocumentId: 'doc-1',
    status: 'pending',
    createdAt: 1234,
  },
]);
const acceptShare = vi.fn(async () => undefined);

vi.mock('../lib/sharing/sharingService', () => ({
  sendDocumentShare,
  listInboxShares,
  acceptShare,
}));

describe('shareStore', () => {
  beforeEach(async () => {
    vi.resetModules();
    sendDocumentShare.mockClear();
    listInboxShares.mockClear();
    acceptShare.mockClear();
  });

  it('sends the current document after flushing local saves', async () => {
    const { useShareStore } = await import('./shareStore');
    const flushSave = vi.fn(async () => undefined);
    const user = { uid: 'user-1', email: 'user@example.com', displayName: null, photoURL: null };

    await useShareStore.getState().sendActiveDocument({
      user,
      recipientEmail: 'friend@example.com',
      document: { id: 'doc-1', title: '문서', content: '# 문서' },
      flushSave,
    });

    expect(flushSave).toHaveBeenCalled();
    expect(sendDocumentShare).toHaveBeenCalledWith({
      user,
      recipientEmail: 'friend@example.com',
      document: { id: 'doc-1', title: '문서', content: '# 문서' },
    });
  });


  it('loads inbox shares for the signed-in user', async () => {
    const { useShareStore } = await import('./shareStore');
    const user = { uid: 'user-1', email: 'user@example.com', displayName: null, photoURL: null };

    await useShareStore.getState().loadInbox(user);

    expect(listInboxShares).toHaveBeenCalledWith(user);
    expect(useShareStore.getState().inbox[0].title).toBe('받은 문서');
  });

  it('accepts a share and creates a local document copy', async () => {
    const { useShareStore } = await import('./shareStore');
    const createDocument = vi.fn(async () => 'new-doc');
    const switchTo = vi.fn(async () => undefined);

    useShareStore.setState({
      inbox: [
        {
          id: 'share-1',
          senderUid: 'sender-1',
          senderEmail: 'sender@example.com',
          recipientEmail: 'user@example.com',
          title: '받은 문서',
          content: '# 받은 문서',
          sourceDocumentId: 'doc-1',
          status: 'pending',
          createdAt: 1234,
        },
      ],
    });

    await useShareStore.getState().acceptIntoLocalDocument('share-1', createDocument, switchTo);

    expect(createDocument).toHaveBeenCalledWith({ title: '받은 문서', content: '# 받은 문서' });
    expect(switchTo).toHaveBeenCalledWith('new-doc');
    expect(acceptShare).toHaveBeenCalledWith('share-1');
    expect(useShareStore.getState().inbox[0].status).toBe('accepted');
  });
});
