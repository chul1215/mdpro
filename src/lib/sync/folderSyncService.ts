import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getFirestoreDb } from '../firebase/config';
import type { AppUser } from '../auth/authService';
import type { FolderRecord } from '../../stores/folderStore';

function requireUser(user: AppUser | null): AppUser {
  if (!user) throw new Error('폴더 동기화를 사용하려면 Google 로그인이 필요합니다.');
  return user;
}

function userFoldersCollection(user: AppUser) {
  return collection(getFirestoreDb(), 'users', user.uid, 'folders');
}

function userFolderRef(user: AppUser, id: string) {
  return doc(getFirestoreDb(), 'users', user.uid, 'folders', id);
}

function mapCloudFolder(snapshot: QueryDocumentSnapshot<DocumentData>): FolderRecord {
  const data = snapshot.data();
  const locked = data.locked === true;
  return {
    id: snapshot.id,
    name: typeof data.name === 'string' ? data.name : '새 폴더',
    locked,
    ...(locked && typeof data.passcodeHash === 'string' ? { passcodeHash: data.passcodeHash } : {}),
    ...(typeof data.parentId === 'string' ? { parentId: data.parentId } : {}),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
  };
}

export async function listCloudFolders(user: AppUser | null): Promise<FolderRecord[]> {
  const signedInUser = requireUser(user);
  const snapshot = await getDocs(userFoldersCollection(signedInUser));
  return snapshot.docs
    .map((item) => mapCloudFolder(item))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function upsertCloudFolder(
  user: AppUser | null,
  folder: FolderRecord,
): Promise<FolderRecord> {
  const signedInUser = requireUser(user);
  await setDoc(
    userFolderRef(signedInUser, folder.id),
    {
      name: folder.name.trim() || '새 폴더',
      locked: folder.locked,
      ...(folder.locked && folder.passcodeHash ? { passcodeHash: folder.passcodeHash } : {}),
      ...(folder.parentId ? { parentId: folder.parentId } : { parentId: null }),
      createdAt: folder.createdAt,
    },
    { merge: true },
  );
  return folder;
}

export async function deleteCloudFolder(user: AppUser | null, id: string): Promise<void> {
  const signedInUser = requireUser(user);
  await deleteDoc(userFolderRef(signedInUser, id));
}
