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
});
