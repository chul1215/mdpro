import { beforeEach, describe, expect, it, vi } from 'vitest';

const collection = vi.fn((_db, ...path: string[]) => ({ path }));
const deleteDoc = vi.fn(async () => undefined);
const doc = vi.fn((_db, ...path: string[]) => ({ path }));
const getDoc = vi.fn();
const getDocs = vi.fn();
const setDoc = vi.fn(async () => undefined);

vi.mock('firebase/firestore', () => ({
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
}));

vi.mock('../firebase/config', () => ({
  getFirestoreDb: () => ({ name: 'db' }),
}));

describe('documentSyncService', () => {
  beforeEach(() => {
    collection.mockClear();
    deleteDoc.mockClear();
    doc.mockClear();
    getDoc.mockReset();
    getDocs.mockReset();
    setDoc.mockClear();
  });

  it('lists signed-in user documents sorted by newest first', async () => {
    getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'old',
          data: () => ({ title: 'Old', content: '# Old', folderId: null, createdAt: 1, updatedAt: 10 }),
        },
        {
          id: 'new',
          data: () => ({ title: 'New', content: '# New', folderId: 'folder-a', createdAt: 2, updatedAt: 99 }),
        },
      ],
    });
    const { listCloudDocuments } = await import('./documentSyncService');

    const docs = await listCloudDocuments({ uid: 'user-1', email: 'u@example.com', displayName: null, photoURL: null });

    expect(collection).toHaveBeenCalledWith({ name: 'db' }, 'users', 'user-1', 'documents');
    expect(docs.map((item) => item.id)).toEqual(['new', 'old']);
    expect(docs[0]).toMatchObject({ id: 'new', title: 'New', folderId: 'folder-a' });
  });

  it('upserts a document under the signed-in user path without changing the id', async () => {
    const { upsertCloudDocument } = await import('./documentSyncService');

    await upsertCloudDocument(
      { uid: 'user-1', email: 'u@example.com', displayName: null, photoURL: null },
      { id: 'doc-1', title: '문서', content: '# 문서', folderId: null, createdAt: 100, updatedAt: 200 },
    );

    expect(doc).toHaveBeenCalledWith({ name: 'db' }, 'users', 'user-1', 'documents', 'doc-1');
    expect(setDoc).toHaveBeenCalledWith(
      { path: ['users', 'user-1', 'documents', 'doc-1'] },
      expect.objectContaining({ title: '문서', content: '# 문서', folderId: null, createdAt: 100, updatedAt: 200 }),
      { merge: true },
    );
  });

  it('requires a signed-in user before reading or writing cloud documents', async () => {
    const { listCloudDocuments, upsertCloudDocument } = await import('./documentSyncService');

    await expect(listCloudDocuments(null)).rejects.toThrow(/로그인/);
    await expect(
      upsertCloudDocument(null, { id: 'doc-1', title: '문서', content: '', folderId: null, createdAt: 1, updatedAt: 1 }),
    ).rejects.toThrow(/로그인/);
    expect(getDocs).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
  });
});
