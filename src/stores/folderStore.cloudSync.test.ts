import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const cloudFolders = new Map<string, {
    id: string;
    name: string;
    locked: boolean;
    passcodeHash?: string;
    createdAt: number;
  }>();
  return {
    cloudFolders,
    listCloudFolders: vi.fn(async () => [...cloudFolders.values()].sort((a, b) => a.createdAt - b.createdAt)),
    upsertCloudFolder: vi.fn(async (_user, folder) => {
      cloudFolders.set(folder.id, folder);
      return folder;
    }),
    deleteCloudFolder: vi.fn(async (_user, id: string) => {
      cloudFolders.delete(id);
    }),
  };
});

vi.mock('../lib/sync/folderSyncService', () => ({
  listCloudFolders: mocks.listCloudFolders,
  upsertCloudFolder: mocks.upsertCloudFolder,
  deleteCloudFolder: mocks.deleteCloudFolder,
}));

import { useFolderStore } from './folderStore';

const user = { uid: 'user-1', email: 'user@example.com', displayName: null, photoURL: null };

function resetStore() {
  localStorage.clear();
  useFolderStore.setState({
    folders: [],
    selectedFolderId: null,
    unlockedFolderIds: [],
    cloudUser: null,
  });
}

describe('folderStore cloud sync', () => {
  beforeEach(() => {
    mocks.cloudFolders.clear();
    vi.clearAllMocks();
    resetStore();
  });

  it('uploads local folders on sign-in, clears local folder persistence, and shows cloud folders', async () => {
    await useFolderStore.getState().createFolder({ name: '업무' });
    await useFolderStore.getState().createFolder({ name: '비공개', passcode: '1234' });

    await useFolderStore.getState().syncUser(user);

    expect(mocks.upsertCloudFolder).toHaveBeenCalledTimes(2);
    const persisted = JSON.parse(localStorage.getItem('mdpro-folders')!);
    expect(persisted.state.folders).toEqual([]);
    const state = useFolderStore.getState();
    expect(state.cloudUser?.uid).toBe('user-1');
    expect(state.folders.map((folder) => folder.name)).toEqual(['업무', '비공개']);
  });

  it('uses Firestore for create/delete while signed in and hides cloud folders after sign-out', async () => {
    mocks.cloudFolders.set('cloud-folder', {
      id: 'cloud-folder',
      name: '클라우드 보안',
      locked: true,
      passcodeHash: 'plain:1234',
      createdAt: 1,
    });

    await useFolderStore.getState().syncUser(user);
    expect(useFolderStore.getState().folders[0]).toMatchObject({ id: 'cloud-folder', locked: true });

    const createdId = await useFolderStore.getState().createFolder({ name: '새 클라우드 폴더' });
    expect(mocks.upsertCloudFolder).toHaveBeenLastCalledWith(user, expect.objectContaining({ id: createdId, name: '새 클라우드 폴더' }));

    useFolderStore.getState().deleteFolder('cloud-folder');
    expect(mocks.deleteCloudFolder).toHaveBeenCalledWith(user, 'cloud-folder');

    await useFolderStore.getState().syncUser(null);
    const state = useFolderStore.getState();
    expect(state.cloudUser).toBeNull();
    expect(state.folders.find((folder) => folder.id === 'cloud-folder')).toBeUndefined();
    expect(state.folders).toHaveLength(0);
  });
});
