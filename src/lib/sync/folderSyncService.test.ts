import { beforeEach, describe, expect, it, vi } from 'vitest';

const collection = vi.fn((_db, ...path: string[]) => ({ path }));
const deleteDoc = vi.fn(async () => undefined);
const doc = vi.fn((_db, ...path: string[]) => ({ path }));
const getDocs = vi.fn();
const setDoc = vi.fn(async () => undefined);

vi.mock('firebase/firestore', () => ({
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
}));

vi.mock('../firebase/config', () => ({
  getFirestoreDb: () => ({ name: 'db' }),
}));

describe('folderSyncService', () => {
  beforeEach(() => {
    collection.mockClear();
    deleteDoc.mockClear();
    doc.mockClear();
    getDocs.mockReset();
    setDoc.mockClear();
  });

  it('lists signed-in user folders sorted by creation time', async () => {
    getDocs.mockResolvedValueOnce({
      docs: [
        { id: 'b', data: () => ({ name: 'B', locked: true, passcodeHash: 'hash', createdAt: 20 }) },
        { id: 'a', data: () => ({ name: 'A', locked: false, createdAt: 10 }) },
      ],
    });
    const { listCloudFolders } = await import('./folderSyncService');

    const folders = await listCloudFolders({ uid: 'user-1', email: 'u@example.com', displayName: null, photoURL: null });

    expect(collection).toHaveBeenCalledWith({ name: 'db' }, 'users', 'user-1', 'folders');
    expect(folders.map((folder) => folder.id)).toEqual(['a', 'b']);
    expect(folders[1]).toMatchObject({ id: 'b', name: 'B', locked: true, passcodeHash: 'hash' });
  });

  it('upserts a secure folder under the signed-in user path', async () => {
    const { upsertCloudFolder } = await import('./folderSyncService');

    await upsertCloudFolder(
      { uid: 'user-1', email: 'u@example.com', displayName: null, photoURL: null },
      { id: 'folder-1', name: '비공개', locked: true, passcodeHash: 'hash', createdAt: 123 },
    );

    expect(doc).toHaveBeenCalledWith({ name: 'db' }, 'users', 'user-1', 'folders', 'folder-1');
    expect(setDoc).toHaveBeenCalledWith(
      { path: ['users', 'user-1', 'folders', 'folder-1'] },
      expect.objectContaining({ name: '비공개', locked: true, passcodeHash: 'hash', createdAt: 123 }),
      { merge: true },
    );
  });

  it('requires a signed-in user before reading or writing folders', async () => {
    const { listCloudFolders, upsertCloudFolder } = await import('./folderSyncService');

    await expect(listCloudFolders(null)).rejects.toThrow(/로그인/);
    await expect(
      upsertCloudFolder(null, { id: 'folder-1', name: '업무', locked: false, createdAt: 1 }),
    ).rejects.toThrow(/로그인/);
    expect(getDocs).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
  });
});
