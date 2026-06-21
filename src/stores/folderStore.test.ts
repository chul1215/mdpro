import { beforeEach, describe, expect, it } from 'vitest';
import { useFolderStore } from './folderStore';

function resetStore() {
  localStorage.clear();
  useFolderStore.setState({
    folders: [],
    selectedFolderId: null,
    unlockedFolderIds: [],
  });
}

describe('folderStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('creates and selects a normal folder', async () => {
    const id = await useFolderStore.getState().createFolder({ name: '업무' });

    const state = useFolderStore.getState();
    expect(state.folders).toHaveLength(1);
    expect(state.folders[0]).toMatchObject({ id, name: '업무', locked: false });
    expect(state.selectedFolderId).toBe(id);
  });

  it('creates a child folder under the selected parent folder', async () => {
    const parentId = await useFolderStore.getState().createFolder({ name: '상위' });

    const childId = await useFolderStore
      .getState()
      .createFolder({ name: '하위', parentId });

    const state = useFolderStore.getState();
    expect(state.folders.find((folder) => folder.id === childId)).toMatchObject({
      id: childId,
      name: '하위',
      parentId,
    });
    expect(state.selectedFolderId).toBe(childId);
  });

  it('creates a locked folder and unlocks it only with the correct passcode', async () => {
    useFolderStore.getState().setSelectedFolder(null);
    const id = await useFolderStore
      .getState()
      .createFolder({ name: '비공개', passcode: '1234' });

    let state = useFolderStore.getState();
    expect(state.folders[0]).toMatchObject({ id, name: '비공개', locked: true });
    expect(state.selectedFolderId).toBeNull();
    expect(state.unlockedFolderIds).not.toContain(id);

    await expect(useFolderStore.getState().unlockFolder(id, '0000')).resolves.toBe(false);
    expect(useFolderStore.getState().unlockedFolderIds).not.toContain(id);

    await expect(useFolderStore.getState().unlockFolder(id, '1234')).resolves.toBe(true);
    state = useFolderStore.getState();
    expect(state.unlockedFolderIds).toContain(id);
  });

  it('re-locks secure folders when another folder scope is selected', async () => {
    const publicId = await useFolderStore.getState().createFolder({ name: '업무' });
    const secretId = await useFolderStore
      .getState()
      .createFolder({ name: '비공개', passcode: '1234' });
    await useFolderStore.getState().unlockFolder(secretId, '1234');
    useFolderStore.getState().setSelectedFolder(secretId);
    expect(useFolderStore.getState().unlockedFolderIds).toContain(secretId);

    useFolderStore.getState().setSelectedFolder(publicId);
    expect(useFolderStore.getState().selectedFolderId).toBe(publicId);
    expect(useFolderStore.getState().unlockedFolderIds).not.toContain(secretId);

    await useFolderStore.getState().unlockFolder(secretId, '1234');
    useFolderStore.getState().setSelectedFolder(null);
    expect(useFolderStore.getState().selectedFolderId).toBeNull();
    expect(useFolderStore.getState().unlockedFolderIds).not.toContain(secretId);
  });

  it('keeps an unlocked secure parent accessible while a child folder is selected', async () => {
    const secretId = await useFolderStore
      .getState()
      .createFolder({ name: '비공개', passcode: '1234' });
    await useFolderStore.getState().unlockFolder(secretId, '1234');
    const childId = await useFolderStore
      .getState()
      .createFolder({ name: '하위', parentId: secretId });

    useFolderStore.getState().setSelectedFolder(childId);

    expect(useFolderStore.getState().selectedFolderId).toBe(childId);
    expect(useFolderStore.getState().unlockedFolderIds).toContain(secretId);
    expect(useFolderStore.getState().isFolderUnlocked(childId)).toBe(true);
  });

  it('persists folders without persisting transient unlock state', async () => {
    const id = await useFolderStore
      .getState()
      .createFolder({ name: '비공개', passcode: '1234' });
    await useFolderStore.getState().unlockFolder(id, '1234');

    const raw = localStorage.getItem('mdpro-folders');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.folders).toHaveLength(1);
    expect(parsed.state.selectedFolderId).toBeNull();
    expect(parsed.state.unlockedFolderIds).toBeUndefined();
  });

  it('deletes a normal folder and clears the selected folder', async () => {
    const id = await useFolderStore.getState().createFolder({ name: '업무' });

    useFolderStore.getState().deleteFolder(id);

    const state = useFolderStore.getState();
    expect(state.folders).toHaveLength(0);
    expect(state.selectedFolderId).toBeNull();
    expect(state.unlockedFolderIds).not.toContain(id);
  });

  it('moves child folders up one level when deleting their parent folder', async () => {
    const grandParentId = await useFolderStore.getState().createFolder({ name: '상위' });
    const parentId = await useFolderStore
      .getState()
      .createFolder({ name: '중간', parentId: grandParentId });
    const childId = await useFolderStore
      .getState()
      .createFolder({ name: '하위', parentId });

    useFolderStore.getState().deleteFolder(parentId);

    const state = useFolderStore.getState();
    expect(state.folders.find((folder) => folder.id === parentId)).toBeUndefined();
    expect(state.folders.find((folder) => folder.id === childId)?.parentId).toBe(grandParentId);
  });

  it('renames a folder', async () => {
    const id = await useFolderStore.getState().createFolder({ name: '기존' });

    useFolderStore.getState().renameFolder(id, '변경됨');

    expect(useFolderStore.getState().folders.find((folder) => folder.id === id)?.name).toBe('변경됨');
  });

  it('moves a folder under another folder and prevents cyclic moves', async () => {
    const parentId = await useFolderStore.getState().createFolder({ name: '상위' });
    const childId = await useFolderStore.getState().createFolder({ name: '하위', parentId });
    const targetId = await useFolderStore.getState().createFolder({ name: '대상' });

    useFolderStore.getState().moveFolder(childId, targetId);
    expect(useFolderStore.getState().folders.find((folder) => folder.id === childId)?.parentId).toBe(targetId);

    useFolderStore.getState().moveFolder(targetId, childId);
    expect(useFolderStore.getState().folders.find((folder) => folder.id === targetId)?.parentId).toBeUndefined();
  });

  it('deletes a locked folder and removes its transient unlock state', async () => {
    const id = await useFolderStore
      .getState()
      .createFolder({ name: '비공개', passcode: '1234' });
    await useFolderStore.getState().unlockFolder(id, '1234');
    useFolderStore.getState().setSelectedFolder(id);

    useFolderStore.getState().deleteFolder(id);

    const state = useFolderStore.getState();
    expect(state.folders).toHaveLength(0);
    expect(state.selectedFolderId).toBeNull();
    expect(state.unlockedFolderIds).not.toContain(id);
  });
});
