import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getFirestoreDb } from '../firebase/config';
import type { AppUser } from '../auth/authService';
import type { DocumentRecord, DocumentSummary } from '../storage/documents';

function requireUser(user: AppUser | null): AppUser {
  if (!user) throw new Error('문서 동기화를 사용하려면 Google 로그인이 필요합니다.');
  return user;
}

function userDocumentsCollection(user: AppUser) {
  return collection(getFirestoreDb(), 'users', user.uid, 'documents');
}

function userDocumentRef(user: AppUser, id: string) {
  return doc(getFirestoreDb(), 'users', user.uid, 'documents', id);
}

function timestampToMillis(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

function mapCloudDocument(snapshot: QueryDocumentSnapshot<DocumentData>): DocumentRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    title: typeof data.title === 'string' ? data.title : '제목 없음',
    content: typeof data.content === 'string' ? data.content : '',
    folderId: typeof data.folderId === 'string' ? data.folderId : null,
    createdAt: timestampToMillis(data.createdAt),
    updatedAt: timestampToMillis(data.updatedAt),
  };
}

export async function listCloudDocuments(user: AppUser | null): Promise<DocumentSummary[]> {
  const signedInUser = requireUser(user);
  const snapshot = await getDocs(userDocumentsCollection(signedInUser));
  return snapshot.docs
    .map((item) => mapCloudDocument(item))
    .map(({ id, title, folderId, updatedAt }) => ({ id, title, folderId, updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getCloudDocument(
  user: AppUser | null,
  id: string,
): Promise<DocumentRecord | undefined> {
  const signedInUser = requireUser(user);
  const snapshot = await getDoc(userDocumentRef(signedInUser, id));
  if (!snapshot.exists()) return undefined;
  return mapCloudDocument(snapshot as QueryDocumentSnapshot<DocumentData>);
}

export async function upsertCloudDocument(
  user: AppUser | null,
  document: DocumentRecord,
): Promise<DocumentRecord> {
  const signedInUser = requireUser(user);
  await setDoc(
    userDocumentRef(signedInUser, document.id),
    {
      title: document.title.trim() || '제목 없음',
      content: document.content,
      folderId: document.folderId ?? null,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    },
    { merge: true },
  );
  return document;
}

export async function deleteCloudDocument(user: AppUser | null, id: string): Promise<void> {
  const signedInUser = requireUser(user);
  await deleteDoc(userDocumentRef(signedInUser, id));
}
