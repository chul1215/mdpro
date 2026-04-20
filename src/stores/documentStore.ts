import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  createDocument as idbCreateDocument,
  deleteDocument as idbDeleteDocument,
  getDocument as idbGetDocument,
  listDocuments as idbListDocuments,
  updateDocument as idbUpdateDocument,
  type DocumentSummary,
} from '../lib/storage/documents';
import { extractTitleFromMarkdown } from '../lib/markdown/title';

type DocumentState = {
  activeId: string | null;
  documents: DocumentSummary[];
  title: string;
  content: string;
  titleManual: boolean;
  loading: boolean;

  hydrate: () => Promise<void>;
  createDocument: () => Promise<string>;
  switchTo: (id: string) => Promise<void>;
  removeDocument: (id: string) => Promise<void>;
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

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      activeId: null,
      documents: [],
      title: '',
      content: '',
      titleManual: false,
      loading: false,

      hydrate: async () => {
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
        set({ loading: false });
      },

      createDocument: async () => {
        await flushPending();
        const record = await idbCreateDocument({});
        const summary: DocumentSummary = {
          id: record.id,
          title: record.title,
          updatedAt: record.updatedAt,
        };
        clearTimer();
        set((s) => ({
          activeId: record.id,
          title: record.title,
          content: record.content,
          titleManual: false,
          documents: [summary, ...s.documents.filter((d) => d.id !== record.id)],
        }));
        return record.id;
      },

      switchTo: async (id) => {
        await flushPending();
        const record = await idbGetDocument(id);
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
        await idbDeleteDocument(id);
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

      setContent: (content) => {
        const prev = get();
        const nextTitle = prev.titleManual
          ? prev.title
          : extractTitleFromMarkdown(content);
        set({ content, title: nextTitle });

        const id = prev.activeId;
        if (!id) return;

        // 저장 시 activeId를 클로저로 캡처해 전환 도중 반영되지 않게 한다.
        scheduleSave(id, async () => {
          const latest = get();
          const titleToSave = latest.titleManual
            ? latest.title
            : extractTitleFromMarkdown(latest.content);
          const updated = await idbUpdateDocument(id, {
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
        if (!id) return;
        scheduleSave(id, async () => {
          const latest = get();
          const updated = await idbUpdateDocument(id, {
            title: latest.title,
            content: latest.content,
          });
          if (!updated) return;
          const updatedSummary: DocumentSummary = {
            id: updated.id,
            title: updated.title,
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
