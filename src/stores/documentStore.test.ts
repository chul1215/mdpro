import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { useDocumentStore } from './documentStore';
import {
  __resetForTests,
  getDocument,
  listDocuments,
} from '../lib/storage/documents';

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
  });
}

describe('documentStore', () => {
  beforeEach(async () => {
    await resetDB();
    localStorage.clear();
    resetStore();
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
