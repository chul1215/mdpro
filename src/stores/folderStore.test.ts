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

  it('creates a locked folder and unlocks it only with the correct passcode', async () => {
    const id = await useFolderStore
      .getState()
      .createFolder({ name: '비공개', passcode: '1234' });

    let state = useFolderStore.getState();
    expect(state.folders[0]).toMatchObject({ id, name: '비공개', locked: true });
    expect(state.unlockedFolderIds).not.toContain(id);

    await expect(useFolderStore.getState().unlockFolder(id, '0000')).resolves.toBe(false);
    expect(useFolderStore.getState().unlockedFolderIds).not.toContain(id);

    await expect(useFolderStore.getState().unlockFolder(id, '1234')).resolves.toBe(true);
    state = useFolderStore.getState();
    expect(state.unlockedFolderIds).toContain(id);
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
    expect(parsed.state.selectedFolderId).toBe(id);
    expect(parsed.state.unlockedFolderIds).toBeUndefined();
  });
});
