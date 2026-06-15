import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const cloudRecords = new Map<string, {
    id: string;
    title: string;
    content: string;
    folderId: string | null;
    createdAt: number;
    updatedAt: number;
  }>();
  return {
    cloudRecords,
    listCloudDocuments: vi.fn(async () =>
      [...cloudRecords.values()]
        .map(({ id, title, folderId, updatedAt }) => ({ id, title, folderId, updatedAt }))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    ),
    getCloudDocument: vi.fn(async (_user, id: string) => cloudRecords.get(id)),
    upsertCloudDocument: vi.fn(async (_user, record) => {
      cloudRecords.set(record.id, record);
      return record;
    }),
    deleteCloudDocument: vi.fn(async (_user, id: string) => {
      cloudRecords.delete(id);
    }),
  };
});

vi.mock('../lib/sync/documentSyncService', () => ({
  listCloudDocuments: mocks.listCloudDocuments,
  getCloudDocument: mocks.getCloudDocument,
  upsertCloudDocument: mocks.upsertCloudDocument,
  deleteCloudDocument: mocks.deleteCloudDocument,
}));

import { useDocumentStore } from './documentStore';
import {
  __resetForTests,
  createDocument as idbCreateDocument,
  listDocuments,
} from '../lib/storage/documents';
import * as documentsModule from '../lib/storage/documents';

const user = { uid: 'user-1', email: 'user@example.com', displayName: null, photoURL: null };

async function resetDB() {
  await __resetForTests();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('mdpro');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

function resetStore() {
  useDocumentStore.setState({
    activeId: null,
    documents: [],
    title: '',
    content: '',
    titleManual: false,
    loading: false,
    cloudUser: null,
  });
}

describe('documentStore cloud sync', () => {
  beforeEach(async () => {
    await resetDB();
    localStorage.clear();
    mocks.cloudRecords.clear();
    vi.clearAllMocks();
    resetStore();
  });

  it('uploads existing local documents on sign-in, clears local storage, and shows cloud documents', async () => {
    await idbCreateDocument({ title: '로컬 문서', content: '# 로컬 문서\n\n본문' });

    await useDocumentStore.getState().syncUser(user);

    expect(mocks.upsertCloudDocument).toHaveBeenCalledWith(user, expect.objectContaining({ title: '로컬 문서' }));
    expect(await listDocuments()).toHaveLength(0);
    const state = useDocumentStore.getState();
    expect(state.cloudUser?.uid).toBe('user-1');
    expect(state.documents).toHaveLength(1);
    expect(state.title).toBe('로컬 문서');
  });

  it('uses Firestore instead of IndexedDB while signed in and hides cloud documents after sign-out', async () => {
    mocks.cloudRecords.set('cloud-1', {
      id: 'cloud-1',
      title: '클라우드 문서',
      content: '# 클라우드 문서',
      folderId: null,
      createdAt: 1,
      updatedAt: 2,
    });

    await useDocumentStore.getState().syncUser(user);
    expect(useDocumentStore.getState().activeId).toBe('cloud-1');

    useDocumentStore.getState().setContent('# 바뀐 문서');
    await useDocumentStore.getState().flushSave();
    expect(mocks.upsertCloudDocument).toHaveBeenLastCalledWith(user, expect.objectContaining({
      id: 'cloud-1',
      title: '바뀐 문서',
      content: '# 바뀐 문서',
    }));
    expect(await listDocuments()).toHaveLength(0);

    await useDocumentStore.getState().syncUser(null);
    const state = useDocumentStore.getState();
    expect(state.cloudUser).toBeNull();
    expect(state.documents.find((doc) => doc.id === 'cloud-1')).toBeUndefined();
    expect(state.documents).toHaveLength(1);
    expect(state.title).toBe('제목 없음');
  });

  it('moveDocument for the active doc upserts to the cloud (no IndexedDB fallback) when no cloud record exists yet', async () => {
    const idbSpy = vi.spyOn(documentsModule, 'updateDocument');
    useDocumentStore.setState({
      cloudUser: user,
      activeId: 'active-doc',
      title: '활성 문서',
      content: '# 활성 문서\n\n본문',
      titleManual: false,
      documents: [{ id: 'active-doc', title: '활성 문서', folderId: null, updatedAt: 1 }],
    });
    // getCloudDocument는 cloudRecords에 'active-doc'이 없으므로 undefined를 반환한다.

    await useDocumentStore.getState().moveDocument('active-doc', 'folder-x');

    // 로컬 IDB로 무음 fallback하지 않아야 한다.
    expect(idbSpy).not.toHaveBeenCalled();
    // 활성 문서이므로 현재 content/title로 cloud upsert하며 folderId 반영.
    expect(mocks.upsertCloudDocument).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ id: 'active-doc', content: '# 활성 문서\n\n본문', folderId: 'folder-x' }),
    );
    expect(useDocumentStore.getState().documents[0]).toMatchObject({
      id: 'active-doc',
      folderId: 'folder-x',
    });
    idbSpy.mockRestore();
  });

  it('moveDocument does not fall back to IndexedDB for a non-active doc missing in the cloud', async () => {
    const idbSpy = vi.spyOn(documentsModule, 'updateDocument');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    useDocumentStore.setState({
      cloudUser: user,
      activeId: 'other-doc',
      documents: [{ id: 'ghost', title: '유령', folderId: null, updatedAt: 1 }],
    });

    await useDocumentStore.getState().moveDocument('ghost', 'folder-x');

    expect(idbSpy).not.toHaveBeenCalled();
    expect(mocks.upsertCloudDocument).not.toHaveBeenCalled();
    expect(useDocumentStore.getState().documents.find((d) => d.id === 'ghost')).toMatchObject({
      folderId: null,
    });
    idbSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('moveDocument keeps using the existing cloud record when present', async () => {
    mocks.cloudRecords.set('cloud-2', {
      id: 'cloud-2',
      title: '클라우드 문서',
      content: '# 클라우드 문서',
      folderId: null,
      createdAt: 1,
      updatedAt: 2,
    });
    const idbSpy = vi.spyOn(documentsModule, 'updateDocument');
    useDocumentStore.setState({
      cloudUser: user,
      activeId: 'cloud-2',
      documents: [{ id: 'cloud-2', title: '클라우드 문서', folderId: null, updatedAt: 2 }],
    });

    await useDocumentStore.getState().moveDocument('cloud-2', 'folder-y');

    expect(idbSpy).not.toHaveBeenCalled();
    expect(mocks.upsertCloudDocument).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ id: 'cloud-2', content: '# 클라우드 문서', folderId: 'folder-y' }),
    );
    idbSpy.mockRestore();
  });
});
