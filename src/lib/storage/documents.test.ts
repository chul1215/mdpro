import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetForTests,
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  updateDocument,
} from './documents';

async function resetDB() {
  await __resetForTests();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('mdpro');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('storage/documents', () => {
  beforeEach(async () => {
    await resetDB();
  });

  it('createDocument applies defaults and returns a record', async () => {
    const record = await createDocument();
    expect(record.id).toBeTruthy();
    expect(record.title).toBe('제목 없음');
    expect(record.content).toBe('# 제목 없음\n\n');
    expect(record.createdAt).toBeGreaterThan(0);
    expect(record.updatedAt).toBe(record.createdAt);
  });

  it('createDocument accepts overrides', async () => {
    const r = await createDocument({ title: 'hi', content: '# hi' });
    expect(r.title).toBe('hi');
    expect(r.content).toBe('# hi');
  });

  it('listDocuments returns summaries sorted by updatedAt desc', async () => {
    const a = await createDocument({ title: 'A' });
    await new Promise((r) => setTimeout(r, 2));
    const b = await createDocument({ title: 'B' });
    await new Promise((r) => setTimeout(r, 2));
    const c = await createDocument({ title: 'C' });
    const list = await listDocuments();
    expect(list.map((s) => s.id)).toEqual([c.id, b.id, a.id]);
    expect(list[0]).toEqual({ id: c.id, title: 'C', updatedAt: c.updatedAt });
  });

  it('getDocument returns the full record or undefined', async () => {
    const r = await createDocument({ title: 'x' });
    const got = await getDocument(r.id);
    expect(got?.id).toBe(r.id);
    expect(await getDocument('missing')).toBeUndefined();
  });

  it('updateDocument bumps updatedAt and returns patched record', async () => {
    const r = await createDocument({ title: 'old', content: 'x' });
    await new Promise((res) => setTimeout(res, 5));
    const patched = await updateDocument(r.id, { title: 'new' });
    expect(patched?.title).toBe('new');
    expect(patched?.content).toBe('x');
    expect(patched?.updatedAt).toBeGreaterThan(r.updatedAt);
    expect(patched?.createdAt).toBe(r.createdAt);
  });

  it('updateDocument returns undefined for missing id', async () => {
    expect(await updateDocument('nope', { title: 't' })).toBeUndefined();
  });

  it('deleteDocument removes the record; list becomes empty', async () => {
    const r = await createDocument();
    await deleteDocument(r.id);
    expect(await getDocument(r.id)).toBeUndefined();
    expect(await listDocuments()).toEqual([]);
  });

  it('updating middle doc moves it to the top of the list', async () => {
    const a = await createDocument({ title: 'A' });
    await new Promise((r) => setTimeout(r, 2));
    const b = await createDocument({ title: 'B' });
    await new Promise((r) => setTimeout(r, 2));
    const c = await createDocument({ title: 'C' });
    await new Promise((r) => setTimeout(r, 2));
    await updateDocument(b.id, { content: 'changed' });
    const list = await listDocuments();
    expect(list.map((s) => s.id)).toEqual([b.id, c.id, a.id]);
  });
});
