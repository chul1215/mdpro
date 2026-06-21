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
  parentId?: string | null;
  createdAt: number;
};

type CreateFolderInput = {
  name: string;
  passcode?: string;
  parentId?: string | null;
};

function lockedIdsForScope(
  folders: FolderRecord[],
  unlockedFolderIds: string[],
  folderId: string | null | undefined,
): string[] {
  if (!folderId) return [];
  const lockedIds: string[] = [];
  const seen = new Set<string>();
  let currentId: string | null | undefined = folderId;
  while (currentId) {
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const folder = folders.find((item) => item.id === currentId);
    if (!folder) break;
    if (folder.locked) lockedIds.push(folder.id);
    currentId = folder.parentId;
  }
  return lockedIds.filter((id) => unlockedFolderIds.includes(id));
}

function isFolderChainAccessible(
  folders: FolderRecord[],
  unlockedFolderIds: string[],
  folderId: string | null | undefined,
): boolean {
  if (!folderId) return true;
  const seen = new Set<string>();
  let currentId: string | null | undefined = folderId;
  while (currentId) {
    if (seen.has(currentId)) return true;
    seen.add(currentId);
    const folder = folders.find((item) => item.id === currentId);
    if (!folder) return true;
    if (folder.locked && !unlockedFolderIds.includes(folder.id)) return false;
    currentId = folder.parentId;
  }
  return true;
}

function isDescendantFolder(
  folders: FolderRecord[],
  folderId: string,
  possibleDescendantId: string | null | undefined,
): boolean {
  let currentId = possibleDescendantId ?? null;
  const seen = new Set<string>();
  while (currentId) {
    if (currentId === folderId) return true;
    if (seen.has(currentId)) return false;
    seen.add(currentId);
    currentId = folders.find((folder) => folder.id === currentId)?.parentId ?? null;
  }
  return false;
}

function normalizeParentId(
  folders: FolderRecord[],
  folderId: string,
  parentId: string | null,
): string | null {
  if (!parentId) return null;
  if (parentId === folderId) return null;
  if (!folders.some((folder) => folder.id === parentId)) return null;
  if (isDescendantFolder(folders, folderId, parentId)) return null;
  return parentId;
}

type FolderState = {
  folders: FolderRecord[];
  selectedFolderId: string | null;
  unlockedFolderIds: string[];
  cloudUser: AppUser | null;

  syncUser: (user: AppUser | null) => Promise<void>;
  createFolder: (input: CreateFolderInput) => Promise<string>;
  renameFolder: (id: string, name: string) => void;
  moveFolder: (id: string, parentId: string | null) => void;
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
        // 클라우드에 폴더가 이미 있어도 로컬 폴더를 병합해 업로드한다. 동일 id는
        // 클라우드 우선(재업로드 안 함), 클라우드에 없는 로컬 폴더만 업로드해
        // 로컬 잠금 폴더 메타데이터 손실 + document.folderId 고아화를 막는다.
        const cloudIds = new Set(existingCloudFolders.map((folder) => folder.id));
        const foldersToUpload = localFolders.filter((folder) => !cloudIds.has(folder.id));
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

      createFolder: async ({ name, passcode, parentId }) => {
        const trimmed = name.trim() || '새 폴더';
        const normalizedPasscode = passcode?.trim() ?? '';
        const locked = normalizedPasscode.length > 0;
        const validParentId = parentId && get().folders.some((folder) => folder.id === parentId)
          ? parentId
          : null;
        const id = makeId();
        const folder: FolderRecord = {
          id,
          name: trimmed,
          locked,
          ...(locked ? { passcodeHash: await hashPasscode(normalizedPasscode) } : {}),
          ...(validParentId ? { parentId: validParentId } : {}),
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

      renameFolder: (id, name) => {
        const trimmed = name.trim() || '새 폴더';
        let updatedFolder: FolderRecord | undefined;
        set((state) => {
          const folders = state.folders.map((folder) => {
            if (folder.id !== id) return folder;
            updatedFolder = { ...folder, name: trimmed };
            return updatedFolder;
          });
          return { folders };
        });
        if (get().cloudUser && updatedFolder) void upsertCloudFolder(get().cloudUser, updatedFolder);
      },

      moveFolder: (id, parentId) => {
        let updatedFolder: FolderRecord | undefined;
        set((state) => {
          const normalizedParentId = normalizeParentId(state.folders, id, parentId);
          const folders = state.folders.map((folder) => {
            if (folder.id !== id) return folder;
            updatedFolder = normalizedParentId
              ? { ...folder, parentId: normalizedParentId }
              : { ...folder, parentId: undefined };
            return updatedFolder;
          });
          return { folders };
        });
        if (get().cloudUser && updatedFolder) void upsertCloudFolder(get().cloudUser, updatedFolder);
      },

      deleteFolder: (id) => {
        const cloudUser = get().cloudUser;
        if (cloudUser) void deleteCloudFolder(cloudUser, id);
        set((state) => {
          const deletedFolder = state.folders.find((folder) => folder.id === id);
          return {
            folders: state.folders
              .filter((folder) => folder.id !== id)
              .map((folder) => (
                folder.parentId === id
                  ? { ...folder, parentId: deletedFolder?.parentId ?? null }
                  : folder
              )),
            selectedFolderId: state.selectedFolderId === id ? null : state.selectedFolderId,
            unlockedFolderIds: state.unlockedFolderIds.filter((folderId) => folderId !== id),
          };
        });
      },

      setSelectedFolder: (id) =>
        set((state) => ({
          selectedFolderId: id,
          unlockedFolderIds: lockedIdsForScope(state.folders, state.unlockedFolderIds, id),
        })),

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

      isFolderUnlocked: (id) => isFolderChainAccessible(
        get().folders,
        get().unlockedFolderIds,
        id,
      ),
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

// documentStore 등 외부 모듈이 React 훅 없이 폴더 잠금 상태를 조회하기 위한 공유 helper.
// 폴더가 없거나(전체 문서) 알 수 없으면 접근 가능으로 본다. 잠긴 폴더는 해제된
// 경우에만 접근 가능 → 잠금 문서가 에디터/뷰어에 노출되는 것을 막는 단일 진실 공급원.
export function isFolderAccessible(folderId: string | null | undefined): boolean {
  const { folders, unlockedFolderIds } = useFolderStore.getState();
  return isFolderChainAccessible(folders, unlockedFolderIds, folderId);
}

export function lockSecureFoldersExcept(folderId: string | null | undefined): void {
  useFolderStore.setState((state) => ({
    unlockedFolderIds: lockedIdsForScope(state.folders, state.unlockedFolderIds, folderId),
  }));
}
