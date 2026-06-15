import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type FolderRecord = {
  id: string;
  name: string;
  locked: boolean;
  passcodeHash?: string;
  createdAt: number;
};

type CreateFolderInput = {
  name: string;
  passcode?: string;
};

type FolderState = {
  folders: FolderRecord[];
  selectedFolderId: string | null;
  unlockedFolderIds: string[];

  createFolder: (input: CreateFolderInput) => Promise<string>;
  setSelectedFolder: (id: string | null) => void;
  unlockFolder: (id: string, passcode: string) => Promise<boolean>;
  lockFolder: (id: string) => void;
  isFolderUnlocked: (id: string) => boolean;
};

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `folder-${Date.now()}-${Math.random()}`;
}

async function hashPasscode(passcode: string): Promise<string> {
  const normalized = passcode.trim();
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const bytes = new TextEncoder().encode(normalized);
    const digest = await subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  return `plain:${normalized}`;
}

export const useFolderStore = create<FolderState>()(
  persist(
    (set, get) => ({
      folders: [],
      selectedFolderId: null,
      unlockedFolderIds: [],

      createFolder: async ({ name, passcode }) => {
        const trimmed = name.trim() || '새 폴더';
        const normalizedPasscode = passcode?.trim() ?? '';
        const locked = normalizedPasscode.length > 0;
        const id = makeId();
        const folder: FolderRecord = {
          id,
          name: trimmed,
          locked,
          ...(locked ? { passcodeHash: await hashPasscode(normalizedPasscode) } : {}),
          createdAt: Date.now(),
        };
        set((state) => ({
          folders: [...state.folders, folder],
          selectedFolderId: locked ? state.selectedFolderId : id,
          unlockedFolderIds: locked
            ? state.unlockedFolderIds
            : [...new Set([...state.unlockedFolderIds, id])],
        }));
        return id;
      },

      setSelectedFolder: (id) => set({ selectedFolderId: id }),

      unlockFolder: async (id, passcode) => {
        const folder = get().folders.find((item) => item.id === id);
        if (!folder) return false;
        if (!folder.locked) {
          set((state) => ({
            unlockedFolderIds: [...new Set([...state.unlockedFolderIds, id])],
          }));
          return true;
        }
        const ok = folder.passcodeHash === await hashPasscode(passcode);
        if (ok) {
          set((state) => ({
            unlockedFolderIds: [...new Set([...state.unlockedFolderIds, id])],
          }));
        }
        return ok;
      },

      lockFolder: (id) =>
        set((state) => ({
          unlockedFolderIds: state.unlockedFolderIds.filter((item) => item !== id),
        })),

      isFolderUnlocked: (id) => {
        const folder = get().folders.find((item) => item.id === id);
        if (!folder) return true;
        return !folder.locked || get().unlockedFolderIds.includes(id);
      },
    }),
    {
      name: 'mdpro-folders',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        folders: state.folders,
        selectedFolderId: state.selectedFolderId,
      }),
    },
  ),
);
