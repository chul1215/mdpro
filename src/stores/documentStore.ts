import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  createDocument as idbCreateDocument,
  deleteDocument as idbDeleteDocument,
  getDocument as idbGetDocument,
  listDocuments as idbListDocuments,
  updateDocument as idbUpdateDocument,
  type DocumentRecord,
  type DocumentSummary,
} from '../lib/storage/documents';
import { extractTitleFromMarkdown } from '../lib/markdown/title';
import type { AppUser } from '../lib/auth/authService';
import {
  deleteCloudDocument,
  getCloudDocument,
  listCloudDocuments,
  upsertCloudDocument,
} from '../lib/sync/documentSyncService';

type DocumentState = {
  activeId: string | null;
  documents: DocumentSummary[];
  title: string;
  content: string;
  titleManual: boolean;
  loading: boolean;
  cloudUser: AppUser | null;

  hydrate: () => Promise<void>;
  syncUser: (user: AppUser | null) => Promise<void>;
  createDocument: (init?: { title?: string; content?: string; folderId?: string | null }) => Promise<string>;
  switchTo: (id: string) => Promise<void>;
  removeDocument: (id: string) => Promise<void>;
  moveDocument: (id: string, folderId: string | null) => Promise<void>;
  setContent: (content: string) => void;
  setTitle: (title: string) => void;
  flushSave: () => Promise<void>;
};

const DEBOUNCE_MS = 800;

// module-level debounce state. zustand set은 동기지만 IDB 저장은 비동기이므로
// 타이머 + 진행 중 Promise를 모두 추적해야 flush/cancel 시 race를 막을 수 있다.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingId: string | null = null;
let pendingRun: (() => Promise<void>) | null = null;
let inflight: Promise<void> | null = null;

// hydrate 재진입 가드. React StrictMode가 mount effect를 두 번 실행하면 두
// hydrate가 동시에 빈 목록을 보고 각각 createDocument()를 호출해 기본 문서가
// 중복 생성된다. 진행 중 Promise를 공유해 동시/중복 호출을 단일 실행으로 합친다.
let hydrateInflight: Promise<void> | null = null;

function clearTimer() {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  pendingId = null;
  pendingRun = null;
}

function scheduleSave(
  id: string,
  run: () => Promise<void>,
  immediate = false,
) {
  if (saveTimer !== null) clearTimeout(saveTimer);
  pendingId = id;
  pendingRun = run;
  if (immediate) {
    saveTimer = null;
    const task = run();
    pendingId = null;
    pendingRun = null;
    inflight = task.finally(() => {
      if (inflight === task) inflight = null;
    });
    return;
  }
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const task = (pendingRun ?? run)();
    pendingId = null;
    pendingRun = null;
    inflight = task.finally(() => {
      if (inflight === task) inflight = null;
    });
  }, DEBOUNCE_MS);
}

async function flushPending(): Promise<void> {
  if (saveTimer !== null && pendingRun) {
    clearTimeout(saveTimer);
    saveTimer = null;
    const run = pendingRun;
    pendingId = null;
    pendingRun = null;
    const task = run();
    inflight = task.finally(() => {
      if (inflight === task) inflight = null;
    });
  }
  if (inflight) await inflight;
}

function cancelPendingIf(id: string) {
  if (pendingId === id) clearTimer();
}

function makeDocumentSummary(record: DocumentRecord): DocumentSummary {
  return {
    id: record.id,
    title: record.title,
    folderId: record.folderId,
    updatedAt: record.updatedAt,
  };
}

async function listLocalDocumentRecords(): Promise<DocumentRecord[]> {
  const summaries = await idbListDocuments();
  const records = await Promise.all(summaries.map((item) => idbGetDocument(item.id)));
  return records.filter((record): record is DocumentRecord => Boolean(record));
}

async function clearLocalDocumentRecords(): Promise<void> {
  const records = await listLocalDocumentRecords();
  await Promise.all(records.map((record) => idbDeleteDocument(record.id)));
}

function isBlankDefaultDocument(record: DocumentRecord): boolean {
  return record.title === '제목 없음' && record.content === '# 제목 없음\n\n';
}

function makeNewRecord(init?: { title?: string; content?: string; folderId?: string | null }): DocumentRecord {
  const now = Date.now();
  const content = init?.content ?? '# 제목 없음\n\n';
  return {
    id: crypto.randomUUID(),
    title: init?.title ?? (init?.content !== undefined ? extractTitleFromMarkdown(content) : '제목 없음'),
    content,
    folderId: init?.folderId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      activeId: null,
      documents: [],
      title: '',
      content: '',
      titleManual: false,
      loading: false,
      cloudUser: null,

      hydrate: async () => {
        // 이미 진행 중인 hydrate가 있으면 그 Promise를 공유한다(in-flight 공유).
        if (hydrateInflight) return hydrateInflight;
        // run()이 자체 try/finally로 정리를 책임진다. 별도 .finally() 체인을
        // 만들면 (1) reject 시 그 버려진 Promise에서 unhandled rejection이 나고
        // (2) loading:false가 성공 경로에서만 실행돼 reject 시 loading이 stuck된다.
        // task 참조는 finally에서 hydrateInflight===task 비교에 필요하다. run의
        // finally는 task 할당 이후(microtask)에만 실행되므로 클로저로 안전히 참조한다.
        const run = async () => {
          try {
            set({ loading: true });
            const list = await idbListDocuments();
            set({ documents: list });
            const persistedId = get().activeId;
            if (persistedId && list.some((d) => d.id === persistedId)) {
              await get().switchTo(persistedId);
            } else if (list.length > 0) {
              await get().switchTo(list[0].id);
            } else {
              await get().createDocument();
            }
          } finally {
            set({ loading: false });
            if (hydrateInflight === task) hydrateInflight = null;
          }
        };
        const task = run();
        hydrateInflight = task;
        return task;
      },

      syncUser: async (user) => {
        await flushPending();
        clearTimer();
        if (!user) {
          set({
            cloudUser: null,
            activeId: null,
            documents: [],
            title: '',
            content: '',
            titleManual: false,
            loading: false,
          });
          await get().hydrate();
          return;
        }

        set({ loading: true, cloudUser: user });
        try {
          const localRecords = await listLocalDocumentRecords();
          const existingCloudList = await listCloudDocuments(user);
          const recordsToUpload = existingCloudList.length > 0
            ? localRecords.filter((record) => !isBlankDefaultDocument(record))
            : localRecords;
          await Promise.all(recordsToUpload.map((record) => upsertCloudDocument(user, record)));
          if (localRecords.length > 0) await clearLocalDocumentRecords();

          let cloudList = await listCloudDocuments(user);
          if (cloudList.length === 0) {
            await get().createDocument();
            cloudList = await listCloudDocuments(user);
          } else {
            set({ documents: cloudList });
            const preferredId = get().activeId;
            const nextId = preferredId && cloudList.some((doc) => doc.id === preferredId)
              ? preferredId
              : cloudList[0].id;
            await get().switchTo(nextId);
          }
        } finally {
          set({ loading: false });
        }
      },

      createDocument: async (init) => {
        await flushPending();
        const cloudUser = get().cloudUser;
        if (cloudUser) {
          const record = makeNewRecord(init);
          await upsertCloudDocument(cloudUser, record);
          const summary = makeDocumentSummary(record);
          clearTimer();
          const auto = extractTitleFromMarkdown(record.content);
          set((s) => ({
            activeId: record.id,
            title: record.title,
            content: record.content,
            titleManual: record.title !== auto,
            documents: [summary, ...s.documents.filter((d) => d.id !== record.id)],
          }));
          return record.id;
        }
        // title 미지정 + content 제공 시 H1에서 자동 추출해 idb 어댑터에 전달하면
        // 저장 레코드 / 목록 요약이 일관된 제목을 갖는다.
        const resolvedInit = {
          content: init?.content,
          folderId: init?.folderId ?? null,
          title:
            init?.title ??
            (init?.content !== undefined
              ? extractTitleFromMarkdown(init.content)
              : undefined),
        };
        const record = await idbCreateDocument(resolvedInit);
        const summary: DocumentSummary = {
          id: record.id,
          title: record.title,
          folderId: record.folderId,
          updatedAt: record.updatedAt,
        };
        clearTimer();
        // 저장된 content로부터 다시 auto 제목을 계산해 수동 여부 판정.
        // (idb 기본값 "# 제목 없음\n\n"도 동일 경로로 처리된다.)
        const auto = extractTitleFromMarkdown(record.content);
        set((s) => ({
          activeId: record.id,
          title: record.title,
          content: record.content,
          titleManual: record.title !== auto,
          documents: [summary, ...s.documents.filter((d) => d.id !== record.id)],
        }));
        return record.id;
      },

      switchTo: async (id) => {
        await flushPending();
        const cloudUser = get().cloudUser;
        const record = cloudUser
          ? await getCloudDocument(cloudUser, id)
          : await idbGetDocument(id);
        if (!record) {
          // 조용히 무시. 상위 UI가 목록을 다시 로드하도록 둔다.
          console.warn('[documentStore] switchTo: record not found', id);
          return;
        }
        clearTimer();
        const auto = extractTitleFromMarkdown(record.content);
        set({
          activeId: record.id,
          title: record.title,
          content: record.content,
          titleManual: record.title !== auto,
        });
      },

      removeDocument: async (id) => {
        cancelPendingIf(id);
        const cloudUser = get().cloudUser;
        if (cloudUser) {
          await deleteCloudDocument(cloudUser, id);
        } else {
          await idbDeleteDocument(id);
        }
        const remaining = get().documents.filter((d) => d.id !== id);
        set({ documents: remaining });
        if (get().activeId === id) {
          if (remaining.length > 0) {
            await get().switchTo(remaining[0].id);
          } else {
            await get().createDocument();
          }
        }
      },

      moveDocument: async (id, folderId) => {
        await flushPending();
        const cloudUser = get().cloudUser;
        const existingCloudRecord = cloudUser ? await getCloudDocument(cloudUser, id) : undefined;
        const updated = cloudUser && existingCloudRecord
          ? await upsertCloudDocument(cloudUser, {
              ...existingCloudRecord,
              folderId,
              updatedAt: Date.now(),
            })
          : await idbUpdateDocument(id, { folderId });
        if (!updated) return;
        const updatedSummary: DocumentSummary = {
          id: updated.id,
          title: updated.title,
          folderId: updated.folderId,
          updatedAt: updated.updatedAt,
        };
        set((s) => ({
          documents: [
            updatedSummary,
            ...s.documents.filter((d) => d.id !== id),
          ],
        }));
      },

      setContent: (content) => {
        const prev = get();
        const nextTitle = prev.titleManual
          ? prev.title
          : extractTitleFromMarkdown(content);
        set({ content, title: nextTitle });

        const id = prev.activeId;
        if (!id) return;
        const cloudUser = prev.cloudUser;

        // 저장 시 activeId를 클로저로 캡처해 전환 도중 반영되지 않게 한다.
        scheduleSave(id, async () => {
          const latest = get();
          const titleToSave = latest.titleManual
            ? latest.title
            : extractTitleFromMarkdown(latest.content);
          const previousRecord = cloudUser ? await getCloudDocument(cloudUser, id) : undefined;
          const updated = cloudUser
            ? await upsertCloudDocument(cloudUser, {
                id,
                title: titleToSave,
                content: latest.content,
                folderId: previousRecord?.folderId ?? null,
                createdAt: previousRecord?.createdAt ?? Date.now(),
                updatedAt: Date.now(),
              })
            : await idbUpdateDocument(id, {
                title: titleToSave,
                content: latest.content,
              });
          if (!updated) return;
          // 활성 문서가 여전히 동일하면 상태에도 최신 title 반영.
          const current = get();
          if (current.activeId === id && !current.titleManual) {
            set({ title: updated.title });
          }
          const updatedSummary: DocumentSummary = {
            id: updated.id,
            title: updated.title,
            folderId: updated.folderId,
            updatedAt: updated.updatedAt,
          };
          set((s) => ({
            documents: [
              updatedSummary,
              ...s.documents.filter((d) => d.id !== id),
            ],
          }));
        });
      },

      setTitle: (title) => {
        set({ title, titleManual: true });
        const id = get().activeId;
        const cloudUser = get().cloudUser;
        if (!id) return;
        scheduleSave(id, async () => {
          const latest = get();
          const previousRecord = cloudUser ? await getCloudDocument(cloudUser, id) : undefined;
          const updated = cloudUser
            ? await upsertCloudDocument(cloudUser, {
                id,
                title: latest.title,
                content: latest.content,
                folderId: previousRecord?.folderId ?? null,
                createdAt: previousRecord?.createdAt ?? Date.now(),
                updatedAt: Date.now(),
              })
            : await idbUpdateDocument(id, {
                title: latest.title,
                content: latest.content,
              });
          if (!updated) return;
          const updatedSummary: DocumentSummary = {
            id: updated.id,
            title: updated.title,
            folderId: updated.folderId,
            updatedAt: updated.updatedAt,
          };
          set((s) => ({
            documents: [
              updatedSummary,
              ...s.documents.filter((d) => d.id !== id),
            ],
          }));
        });
      },

      flushSave: flushPending,
    }),
    {
      name: 'mdpro-doc',
      storage: createJSONStorage(() => localStorage),
      // 세션 간에는 activeId만 보존. 나머지는 hydrate()로 IDB에서 재구성.
      partialize: (state) => ({ activeId: state.activeId }),
    },
  ),
);
