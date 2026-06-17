import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDocumentStore } from './documentStore';
import { useFolderStore } from './folderStore';
import {
  __resetForTests,
  createDocument as idbCreateDocument,
  getDocument,
  listDocuments,
} from '../lib/storage/documents';
import * as documentsModule from '../lib/storage/documents';

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
  useFolderStore.setState({
    folders: [],
    selectedFolderId: null,
    unlockedFolderIds: [],
    cloudUser: null,
  });
}

describe('documentStore', () => {
  beforeEach(async () => {
    await resetDB();
    localStorage.clear();
    resetStore();
  });

  it('hydrate falls back to an accessible document when the persisted active id is in a locked folder', async () => {
    useFolderStore.setState({
      folders: [{ id: 'secret', name: '비공개', locked: true, passcodeHash: 'x', createdAt: 1 }],
      unlockedFolderIds: [],
    });
    await idbCreateDocument({ title: '공개', content: '# 공개\n\n공개 본문' });
    const secret = (await idbCreateDocument({
      title: '비밀',
      content: '# 비밀\n\n비밀 본문',
      folderId: 'secret',
    })).id;
    // persist된 activeId가 잠긴 폴더 문서를 가리키는 상황.
    useDocumentStore.setState({ activeId: secret });

    await useDocumentStore.getState().hydrate();

    const s = useDocumentStore.getState();
    expect(s.activeId).not.toBe(secret);
    expect(s.content).not.toContain('비밀 본문');
  });

  it('switchTo refuses to load a document inside a locked folder and keeps current content', async () => {
    await useDocumentStore.getState().hydrate();
    const before = useDocumentStore.getState().content;
    useFolderStore.setState({
      folders: [{ id: 'secret', name: '비공개', locked: true, passcodeHash: 'x', createdAt: 1 }],
      unlockedFolderIds: [],
    });
    const secret = (await idbCreateDocument({
      title: '비밀',
      content: '# 비밀\n\n비밀 본문',
      folderId: 'secret',
    })).id;

    await useDocumentStore.getState().switchTo(secret);

    const s = useDocumentStore.getState();
    expect(s.content).toBe(before);
    expect(s.content).not.toContain('비밀 본문');
    expect(s.activeId).not.toBe(secret);
  });

  it('switchTo loads a locked folder document once the folder is unlocked', async () => {
    await useDocumentStore.getState().hydrate();
    useFolderStore.setState({
      folders: [{ id: 'secret', name: '비공개', locked: true, passcodeHash: 'x', createdAt: 1 }],
      unlockedFolderIds: ['secret'],
    });
    const secret = (await idbCreateDocument({
      title: '비밀',
      content: '# 비밀\n\n비밀 본문',
      folderId: 'secret',
    })).id;

    await useDocumentStore.getState().switchTo(secret);

    expect(useDocumentStore.getState().activeId).toBe(secret);
    expect(useDocumentStore.getState().content).toContain('비밀 본문');
  });

  it('switchTo a public document re-locks previously unlocked secure folders', async () => {
    const publicId = (await idbCreateDocument({
      title: '공개',
      content: '# 공개\n\n공개 본문',
    })).id;
    const secretId = (await idbCreateDocument({
      title: '비밀',
      content: '# 비밀\n\n비밀 본문',
      folderId: 'secret',
    })).id;
    useFolderStore.setState({
      folders: [{ id: 'secret', name: '비공개', locked: true, passcodeHash: 'x', createdAt: 1 }],
      unlockedFolderIds: ['secret'],
    });
    await useDocumentStore.getState().switchTo(secretId);
    expect(useFolderStore.getState().unlockedFolderIds).toContain('secret');

    await useDocumentStore.getState().switchTo(publicId);

    expect(useDocumentStore.getState().activeId).toBe(publicId);
    expect(useFolderStore.getState().unlockedFolderIds).not.toContain('secret');
  });

  it('hydrate on empty DB creates and activates a new document', async () => {
    await useDocumentStore.getState().hydrate();
    const s = useDocumentStore.getState();
    expect(s.activeId).toBeTruthy();
    expect(s.documents.length).toBe(1);
    expect(s.title).toBe('제목 없음');
    expect(s.content).toBe('# 제목 없음\n\n');
    expect(s.loading).toBe(false);
  });

  it('concurrent hydrate() on empty DB creates exactly one document', async () => {
    // React StrictMode는 개발 모드에서 mount effect를 두 번 실행한다.
    // 재진입 가드가 없으면 두 hydrate가 동시에 빈 목록을 보고
    // 각각 createDocument()를 호출해 기본 문서가 2개 생성된다.
    await Promise.all([
      useDocumentStore.getState().hydrate(),
      useDocumentStore.getState().hydrate(),
    ]);
    const s = useDocumentStore.getState();
    expect(s.documents.length).toBe(1);
    const list = await listDocuments();
    expect(list.length).toBe(1);
    expect(s.activeId).toBeTruthy();
  });

  it('hydrate() rejects cleanly when the IDB list fails, then re-hydrate succeeds', async () => {
    // 의존성(listDocuments)을 일시적으로 reject시켜 hydrate의 실패 경로를 검증한다.
    // run()의 try/finally가 (a) reject를 catch 가능한 형태로 전파하고
    // (b) hydrateInflight를 풀어 재-hydrate를 허용하며
    // (c) loading을 false로 복구하는지 확인한다.
    const spy = vi
      .spyOn(documentsModule, 'listDocuments')
      .mockRejectedValueOnce(new Error('idb down'));

    // (a) unhandled rejection 없이 정상적으로 catch 가능
    await expect(useDocumentStore.getState().hydrate()).rejects.toThrow('idb down');
    // (c) 실패 경로에서도 loading이 stuck되지 않고 false로 복구
    expect(useDocumentStore.getState().loading).toBe(false);

    // 의존성 복원 후 (b) 재진입 가드가 풀려 재-hydrate가 정상 동작
    spy.mockRestore();
    await useDocumentStore.getState().hydrate();
    const s = useDocumentStore.getState();
    expect(s.activeId).toBeTruthy();
    expect(s.documents.length).toBe(1);
    expect(s.loading).toBe(false);
  });

  it('createDocument adds to list and becomes active', async () => {
    await useDocumentStore.getState().hydrate();
    const before = useDocumentStore.getState().documents.length;
    const id = await useDocumentStore.getState().createDocument();
    const after = useDocumentStore.getState();
    expect(after.documents.length).toBe(before + 1);
    expect(after.activeId).toBe(id);
    expect(after.documents[0].id).toBe(id);
    expect(after.titleManual).toBe(false);
  });

  it('createDocument can assign the active folder and moveDocument changes folder', async () => {
    await useDocumentStore.getState().hydrate();
    const id = await useDocumentStore
      .getState()
      .createDocument({ title: '폴더 문서', folderId: 'folder-a' });

    expect(useDocumentStore.getState().documents[0]).toMatchObject({
      id,
      folderId: 'folder-a',
    });
    expect((await getDocument(id))?.folderId).toBe('folder-a');

    await useDocumentStore.getState().moveDocument(id, null);
    expect(useDocumentStore.getState().documents[0]).toMatchObject({
      id,
      folderId: null,
    });
    expect((await getDocument(id))?.folderId).toBeNull();
  });

  it('setContent derives title from H1 when titleManual is false', async () => {
    await useDocumentStore.getState().hydrate();
    useDocumentStore.getState().setContent('# 안녕\n\n내용');
    const s = useDocumentStore.getState();
    expect(s.title).toBe('안녕');
    expect(s.titleManual).toBe(false);
    expect(s.content).toBe('# 안녕\n\n내용');
  });

  it('setTitle marks manual and survives subsequent setContent', async () => {
    await useDocumentStore.getState().hydrate();
    useDocumentStore.getState().setTitle('수동');
    expect(useDocumentStore.getState().titleManual).toBe(true);
    useDocumentStore.getState().setContent('# 자동제목\n\n바디');
    expect(useDocumentStore.getState().title).toBe('수동');
    expect(useDocumentStore.getState().titleManual).toBe(true);
  });

  it('flushSave persists pending content to IDB', async () => {
    await useDocumentStore.getState().hydrate();
    const id = useDocumentStore.getState().activeId!;
    useDocumentStore.getState().setContent('# 저장됨\n\n본문');
    await useDocumentStore.getState().flushSave();
    const record = await getDocument(id);
    expect(record?.content).toBe('# 저장됨\n\n본문');
    expect(record?.title).toBe('저장됨');
  });

  it('debounce delays save until timer elapses', async () => {
    await useDocumentStore.getState().hydrate();
    const id = useDocumentStore.getState().activeId!;
    useDocumentStore.getState().setContent('# 지연\n\nbody');
    // 즉시 조회 시점에는 debounce 타이머가 만료되지 않았으므로 IDB에 반영되지 않는다.
    const before = await getDocument(id);
    expect(before?.content).not.toBe('# 지연\n\nbody');
    // flushSave는 pending 타이머를 즉시 실행한다.
    await useDocumentStore.getState().flushSave();
    const after = await getDocument(id);
    expect(after?.content).toBe('# 지연\n\nbody');
  });

  it('switchTo flushes pending save and loads the target document', async () => {
    await useDocumentStore.getState().hydrate();
    const firstId = useDocumentStore.getState().activeId!;
    useDocumentStore.getState().setContent('# 첫문서\n\n1');

    const secondId = await useDocumentStore.getState().createDocument();
    // createDocument는 flush를 선행한다 → 첫 문서는 디스크에 저장되어 있어야 한다.
    const firstPersisted = await getDocument(firstId);
    expect(firstPersisted?.content).toBe('# 첫문서\n\n1');

    useDocumentStore.getState().setContent('# 둘문서\n\n2');
    await useDocumentStore.getState().switchTo(firstId);
    // 전환 후 첫 문서 내용이 로드되어야 한다.
    expect(useDocumentStore.getState().activeId).toBe(firstId);
    expect(useDocumentStore.getState().content).toBe('# 첫문서\n\n1');
    // 둘째 문서의 변경분도 전환 전에 flush되어 디스크에 있어야 한다.
    const secondPersisted = await getDocument(secondId);
    expect(secondPersisted?.content).toBe('# 둘문서\n\n2');
  });

  it('removeDocument switches to another document when active is removed', async () => {
    await useDocumentStore.getState().hydrate();
    const first = useDocumentStore.getState().activeId!;
    const second = await useDocumentStore.getState().createDocument();
    expect(useDocumentStore.getState().activeId).toBe(second);
    await useDocumentStore.getState().removeDocument(second);
    const s = useDocumentStore.getState();
    expect(s.activeId).toBe(first);
    expect(s.documents.find((d) => d.id === second)).toBeUndefined();
  });

  it('removeDocument on last document creates a new one', async () => {
    await useDocumentStore.getState().hydrate();
    const onlyId = useDocumentStore.getState().activeId!;
    await useDocumentStore.getState().removeDocument(onlyId);
    const s = useDocumentStore.getState();
    expect(s.documents.length).toBe(1);
    expect(s.activeId).not.toBe(onlyId);
    expect(s.activeId).toBeTruthy();
  });

  it('persist stores only activeId in localStorage', async () => {
    await useDocumentStore.getState().hydrate();
    const id = useDocumentStore.getState().activeId!;
    useDocumentStore.getState().setContent('# 제목\n\n본문');
    // persist는 set 시 동기적으로 저장된다.
    const raw = localStorage.getItem('mdpro-doc');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state).toEqual({ activeId: id });
    expect(parsed.state.content).toBeUndefined();
    expect(parsed.state.documents).toBeUndefined();
    expect(parsed.state.title).toBeUndefined();
  });

  it('switchTo detects manual title when stored title differs from H1', async () => {
    await useDocumentStore.getState().hydrate();
    const id = useDocumentStore.getState().activeId!;
    useDocumentStore.getState().setTitle('손수정');
    useDocumentStore.getState().setContent('# 다른제목\n');
    await useDocumentStore.getState().flushSave();
    // 새 문서 만들고 다시 돌아오기
    await useDocumentStore.getState().createDocument();
    await useDocumentStore.getState().switchTo(id);
    const s = useDocumentStore.getState();
    expect(s.title).toBe('손수정');
    expect(s.titleManual).toBe(true);
  });

  it('createDocument({ title, content }) treats explicit mismatched title as manual', async () => {
    await useDocumentStore.getState().hydrate();
    const id = await useDocumentStore
      .getState()
      .createDocument({ title: '수동', content: '# 자동' });
    const s = useDocumentStore.getState();
    expect(s.activeId).toBe(id);
    expect(s.title).toBe('수동');
    expect(s.content).toBe('# 자동');
    expect(s.titleManual).toBe(true);
    const persisted = await getDocument(id);
    expect(persisted?.title).toBe('수동');
    expect(persisted?.content).toBe('# 자동');
  });

  it('createDocument({ content }) auto-extracts title from H1 without marking manual', async () => {
    await useDocumentStore.getState().hydrate();
    const id = await useDocumentStore
      .getState()
      .createDocument({ content: '# 추출됨\n\n본문' });
    const s = useDocumentStore.getState();
    expect(s.activeId).toBe(id);
    expect(s.title).toBe('추출됨');
    expect(s.titleManual).toBe(false);
    const persisted = await getDocument(id);
    expect(persisted?.title).toBe('추출됨');
  });

  it('createDocument() with no args keeps legacy default title', async () => {
    await useDocumentStore.getState().hydrate();
    const id = await useDocumentStore.getState().createDocument();
    const s = useDocumentStore.getState();
    expect(s.activeId).toBe(id);
    expect(s.title).toBe('제목 없음');
    expect(s.content).toBe('# 제목 없음\n\n');
    // "# 제목 없음\n\n"의 H1에서 추출한 auto 제목과 동일 → manual 아님
    expect(s.titleManual).toBe(false);
  });

  it('document summary reflects latest title after save', async () => {
    await useDocumentStore.getState().hydrate();
    const id = useDocumentStore.getState().activeId!;
    useDocumentStore.getState().setContent('# 새제목\n');
    await useDocumentStore.getState().flushSave();
    const summary = useDocumentStore.getState().documents.find((d) => d.id === id);
    expect(summary?.title).toBe('새제목');
    const list = await listDocuments();
    expect(list[0].title).toBe('새제목');
  });
});
