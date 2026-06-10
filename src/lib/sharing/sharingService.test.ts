import { beforeEach, describe, expect, it, vi } from 'vitest';

const addDoc = vi.fn(async () => ({ id: 'share-1' }));
const collection = vi.fn((_db, name: string) => ({ name }));
const doc = vi.fn((_db, name: string, id: string) => ({ name, id }));
const getDocs = vi.fn();
const orderBy = vi.fn((field: string, direction?: string) => ({ field, direction }));
const query = vi.fn((...parts: unknown[]) => ({ parts }));
const serverTimestamp = vi.fn(() => ({ __timestamp: true }));
const updateDoc = vi.fn(async () => undefined);
const where = vi.fn((field: string, op: string, value: unknown) => ({ field, op, value }));

vi.mock('firebase/firestore', () => ({
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
}));

vi.mock('../firebase/config', () => ({
  getFirestoreDb: () => ({ name: 'db' }),
}));

describe('sharingService', () => {
  beforeEach(() => {
    addDoc.mockClear();
    getDocs.mockReset();
    updateDoc.mockClear();
    collection.mockClear();
    doc.mockClear();
    query.mockClear();
    where.mockClear();
  });

  it('creates a pending document share for a recipient email', async () => {
    const { sendDocumentShare } = await import('./sharingService');

    const id = await sendDocumentShare({
      user: { uid: 'sender-1', email: 'sender@example.com', displayName: 'Sender', photoURL: null },
      recipientEmail: ' RECIPIENT@example.com ',
      document: { id: 'doc-1', title: '문서', content: '# 문서' },
    });

    expect(id).toBe('share-1');
    expect(addDoc).toHaveBeenCalledWith(
      { name: 'shares' },
      expect.objectContaining({
        senderUid: 'sender-1',
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        title: '문서',
        content: '# 문서',
        sourceDocumentId: 'doc-1',
        status: 'pending',
      }),
    );
  });

  it('rejects invalid recipient emails before writing', async () => {
    const { sendDocumentShare } = await import('./sharingService');

    await expect(
      sendDocumentShare({
        user: { uid: 'sender-1', email: 'sender@example.com', displayName: null, photoURL: null },
        recipientEmail: 'not-an-email',
        document: { id: 'doc-1', title: '문서', content: '# 문서' },
      }),
    ).rejects.toThrow(/올바른 이메일/);
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('requires a signed-in user to send', async () => {
    const { sendDocumentShare } = await import('./sharingService');

    await expect(
      sendDocumentShare({
        user: null,
        recipientEmail: 'recipient@example.com',
        document: { id: 'doc-1', title: '문서', content: '# 문서' },
      }),
    ).rejects.toThrow(/로그인/);
  });

  it('lists inbox shares for the signed-in email', async () => {
    getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'share-1',
          data: () => ({
            senderUid: 'sender-1',
            senderEmail: 'sender@example.com',
            recipientEmail: 'user@example.com',
            title: '받은 문서',
            content: '# 받은 문서',
            sourceDocumentId: 'doc-1',
            status: 'pending',
            createdAt: { toMillis: () => 1234 },
          }),
        },
      ],
    });
    const { listInboxShares } = await import('./sharingService');

    const shares = await listInboxShares({ uid: 'user-1', email: 'USER@example.com', displayName: null, photoURL: null });

    expect(where).toHaveBeenCalledWith('recipientEmail', '==', 'user@example.com');
    expect(shares[0]).toMatchObject({ id: 'share-1', title: '받은 문서', createdAt: 1234 });
  });

  it('marks a share as accepted', async () => {
    const { acceptShare } = await import('./sharingService');

    await acceptShare('share-1');

    expect(updateDoc).toHaveBeenCalledWith(
      { name: 'shares', id: 'share-1' },
      expect.objectContaining({ status: 'accepted' }),
    );
  });
});
