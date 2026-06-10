import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirebaseApp } from '../firebase/config';

export type AppUser = {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
};

function toAppUser(user: User | null): AppUser | null {
  if (!user?.email) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

function auth() {
  return getAuth(getFirebaseApp());
}

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth(), provider);
}

export async function signOutOfGoogle(): Promise<void> {
  await signOut(auth());
}

export function subscribeToAuthState(
  listener: (user: AppUser | null) => void,
): () => void {
  return onAuthStateChanged(auth(), (user) => listener(toAppUser(user)));
}
