import { create } from 'zustand';
import type { AppUser } from '../lib/auth/authService';
import {
  acceptShare,
  listInboxShares,
  sendDocumentShare,
  type ShareRecord,
} from '../lib/sharing/sharingService';

type LocalDocument = {
  id: string;
  title: string;
  content: string;
};

type ShareState = {
  inbox: ShareRecord[];
  loading: boolean;
  error: string | null;
  lastSentShareId: string | null;
  sendActiveDocument: (input: {
    user: AppUser | null;
    recipientEmail: string;
    document: LocalDocument;
    flushSave: () => Promise<void>;
  }) => Promise<string>;
  loadInbox: (user: AppUser | null) => Promise<void>;
  acceptIntoLocalDocument: (
    shareId: string,
    createDocument: (init: { title: string; content: string }) => Promise<string>,
    switchTo: (id: string) => Promise<void>,
  ) => Promise<string>;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export const useShareStore = create<ShareState>()((set, get) => ({
  inbox: [],
  loading: false,
  error: null,
  lastSentShareId: null,

  sendActiveDocument: async ({ user, recipientEmail, document, flushSave }) => {
    set({ loading: true, error: null });
    try {
      await flushSave();
      const shareId = await sendDocumentShare({ user, recipientEmail, document });
      set({ lastSentShareId: shareId });
      return shareId;
    } catch (error) {
      set({ error: getErrorMessage(error, '문서 보내기에 실패했습니다.') });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  loadInbox: async (user) => {
    set({ loading: true, error: null });
    try {
      const inbox = await listInboxShares(user);
      set({ inbox });
    } catch (error) {
      set({ error: getErrorMessage(error, '받은 문서를 불러오지 못했습니다.') });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  acceptIntoLocalDocument: async (shareId, createDocument, switchTo) => {
    const share = get().inbox.find((item) => item.id === shareId);
    if (!share) throw new Error('받은 문서를 찾을 수 없습니다.');

    set({ loading: true, error: null });
    try {
      const id = await createDocument({ title: share.title, content: share.content });
      await switchTo(id);
      await acceptShare(shareId);
      set((state) => ({
        inbox: state.inbox.map((item) =>
          item.id === shareId ? { ...item, status: 'accepted' } : item,
        ),
      }));
      return id;
    } catch (error) {
      set({ error: getErrorMessage(error, '받은 문서를 가져오지 못했습니다.') });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
