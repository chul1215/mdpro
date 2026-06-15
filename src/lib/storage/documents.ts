import { openDB, type IDBPDatabase, type DBSchema } from 'idb';

export type DocumentRecord = {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type DocumentSummary = Pick<DocumentRecord, 'id' | 'title' | 'folderId' | 'updatedAt'>;

interface MDProDB extends DBSchema {
  documents: {
    key: string;
    value: DocumentRecord;
    indexes: { updatedAt: number };
  };
}

const DB_NAME = 'mdpro';
const DB_VERSION = 2;
const STORE = 'documents';

// 싱글톤 Promise로 중복 open 방지. 테스트에서는 __resetForTests로 초기화.
let dbPromise: Promise<IDBPDatabase<MDProDB>> | null = null;

function getDB(): Promise<IDBPDatabase<MDProDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MDProDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
        if (oldVersion < 2) {
          const store = tx.objectStore(STORE);
          const records = await store.getAll();
          await Promise.all(
            records.map((record) =>
              store.put({
                ...record,
                folderId: record.folderId ?? null,
              }),
            ),
          );
        }
      },
    });
  }
  return dbPromise;
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const db = await getDB();
  const all = await db.getAll(STORE);
  // updatedAt 내림차순. 인덱스 역순 커서보다 단순/안정적.
  return all
    .map((r) => ({
      id: r.id,
      title: r.title,
      folderId: r.folderId ?? null,
      updatedAt: r.updatedAt,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDocument(
  id: string,
): Promise<DocumentRecord | undefined> {
  const db = await getDB();
  return db.get(STORE, id);
}

export async function createDocument(init?: {
  title?: string;
  content?: string;
  folderId?: string | null;
}): Promise<DocumentRecord> {
  const db = await getDB();
  const now = Date.now();
  const record: DocumentRecord = {
    id: crypto.randomUUID(),
    title: init?.title ?? '제목 없음',
    content: init?.content ?? '# 제목 없음\n\n',
    folderId: init?.folderId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.put(STORE, record);
  return record;
}

export async function updateDocument(
  id: string,
  patch: { title?: string; content?: string; folderId?: string | null },
): Promise<DocumentRecord | undefined> {
  const db = await getDB();
  const existing = await db.get(STORE, id);
  if (!existing) return undefined;
  const next: DocumentRecord = {
    ...existing,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.content !== undefined ? { content: patch.content } : {}),
    ...(patch.folderId !== undefined ? { folderId: patch.folderId } : {}),
    updatedAt: Date.now(),
  };
  await db.put(STORE, next);
  return next;
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}

// 테스트 격리용: 열려 있는 연결을 명시적으로 닫아야 deleteDatabase가 block되지 않는다.
export async function __resetForTests(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      // open 실패 케이스는 무시.
    }
  }
  dbPromise = null;
}
