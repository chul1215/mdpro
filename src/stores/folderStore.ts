import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AppUser } from '../lib/auth/authService';
import {
  deleteCloudFolder,
  listCloudFolders,
  upsertCloudFolder,
} from '../lib/sync/folderSyncService';

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
  cloudUser: AppUser | null;

  syncUser: (user: AppUser | null) => Promise<void>;
  createFolder: (input: CreateFolderInput) => Promise<string>;
  deleteFolder: (id: string) => void;
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
      cloudUser: null,

      syncUser: async (user) => {
        if (!user) {
          set({
            cloudUser: null,
            folders: [],
            selectedFolderId: null,
            unlockedFolderIds: [],
          });
          return;
        }

        const localFolders = get().folders;
        const existingCloudFolders = await listCloudFolders(user);
        const foldersToUpload = existingCloudFolders.length > 0 ? [] : localFolders;
        await Promise.all(foldersToUpload.map((folder) => upsertCloudFolder(user, folder)));
        if (localFolders.length > 0) localStorage.removeItem('mdpro-folders');
        const cloudFolders = await listCloudFolders(user);
        set({
          cloudUser: user,
          folders: cloudFolders,
          selectedFolderId: cloudFolders.some((folder) => folder.id === get().selectedFolderId)
            ? get().selectedFolderId
            : null,
          unlockedFolderIds: [],
        });
      },

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
        if (get().cloudUser) {
          await upsertCloudFolder(get().cloudUser, folder);
        }
        set((state) => ({
          folders: [...state.folders, folder],
          selectedFolderId: locked ? state.selectedFolderId : id,
          unlockedFolderIds: locked
            ? state.unlockedFolderIds
            : [...new Set([...state.unlockedFolderIds, id])],
        }));
        return id;
      },

      deleteFolder: (id) => {
        const cloudUser = get().cloudUser;
        if (cloudUser) void deleteCloudFolder(cloudUser, id);
        set((state) => ({
          folders: state.folders.filter((folder) => folder.id !== id),
          selectedFolderId: state.selectedFolderId === id ? null : state.selectedFolderId,
          unlockedFolderIds: state.unlockedFolderIds.filter((folderId) => folderId !== id),
        }));
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
        folders: state.cloudUser ? [] : state.folders,
        selectedFolderId: state.cloudUser ? null : state.selectedFolderId,
      }),
    },
  ),
);
