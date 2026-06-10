import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getFirestoreDb } from '../firebase/config';
import type { AppUser } from '../auth/authService';

export type ShareStatus = 'pending' | 'accepted' | 'declined';

export type ShareRecord = {
  id: string;
  senderUid: string;
  senderEmail: string;
  recipientEmail: string;
  title: string;
  content: string;
  sourceDocumentId: string;
  status: ShareStatus;
  createdAt: number;
  acceptedAt?: number;
};

export type ShareDocumentInput = {
  user: AppUser | null;
  recipientEmail: string;
  document: {
    id: string;
    title: string;
    content: string;
  };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertEmail(email: string): string {
  const normalized = normalizeEmail(email);
  if (!EMAIL_RE.test(normalized)) {
    throw new Error('올바른 이메일 주소를 입력해 주세요.');
  }
  return normalized;
}

function timestampToMillis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value) {
    const maybeTimestamp = value as { toMillis: () => number };
    return maybeTimestamp.toMillis();
  }
  return Date.now();
}

function mapShare(snapshot: QueryDocumentSnapshot<DocumentData>): ShareRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    senderUid: data.senderUid,
    senderEmail: data.senderEmail,
    recipientEmail: data.recipientEmail,
    title: data.title,
    content: data.content,
    sourceDocumentId: data.sourceDocumentId,
    status: data.status ?? 'pending',
    createdAt: timestampToMillis(data.createdAt),
    ...(data.acceptedAt ? { acceptedAt: timestampToMillis(data.acceptedAt) } : {}),
  };
}

export async function sendDocumentShare({
  user,
  recipientEmail,
  document,
}: ShareDocumentInput): Promise<string> {
  if (!user) throw new Error('문서를 보내려면 Google 로그인이 필요합니다.');
  const normalizedRecipient = assertEmail(recipientEmail);
  const normalizedSender = assertEmail(user.email);

  const created = await addDoc(collection(getFirestoreDb(), 'shares'), {
    senderUid: user.uid,
    senderEmail: normalizedSender,
    recipientEmail: normalizedRecipient,
    title: document.title.trim() || '제목 없음',
    content: document.content,
    sourceDocumentId: document.id,
    status: 'pending' satisfies ShareStatus,
    createdAt: serverTimestamp(),
  });
  return created.id;
}

export async function listInboxShares(user: AppUser | null): Promise<ShareRecord[]> {
  if (!user) throw new Error('받은 문서를 보려면 Google 로그인이 필요합니다.');
  const recipientEmail = assertEmail(user.email);
  const inboxQuery = query(
    collection(getFirestoreDb(), 'shares'),
    where('recipientEmail', '==', recipientEmail),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(inboxQuery);
  return snapshot.docs.map((item) => mapShare(item));
}

export async function acceptShare(shareId: string): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), 'shares', shareId), {
    status: 'accepted' satisfies ShareStatus,
    acceptedAt: serverTimestamp(),
  });
}
