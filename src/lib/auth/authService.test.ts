import { beforeEach, describe, expect, it, vi } from 'vitest';

const signInWithPopup = vi.fn();
const signOut = vi.fn();
const onAuthStateChanged = vi.fn();
const getAuth = vi.fn(() => ({ app: 'auth' }));
const GoogleAuthProvider = vi.fn(function GoogleAuthProvider() {});

vi.mock('firebase/auth', () => ({
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
}));

vi.mock('../firebase/config', () => ({
  getFirebaseApp: () => ({ name: 'mdpro-test-app' }),
}));

describe('authService', () => {
  beforeEach(() => {
    signInWithPopup.mockReset();
    signOut.mockReset();
    onAuthStateChanged.mockReset();
  });

  it('starts Google popup sign-in', async () => {
    const { signInWithGoogle } = await import('./authService');

    await signInWithGoogle();

    expect(GoogleAuthProvider).toHaveBeenCalled();
    expect(signInWithPopup).toHaveBeenCalledWith({ app: 'auth' }, expect.any(GoogleAuthProvider));
  });

  it('signs out through Firebase auth', async () => {
    const { signOutOfGoogle } = await import('./authService');

    await signOutOfGoogle();

    expect(signOut).toHaveBeenCalledWith({ app: 'auth' });
  });

  it('maps Firebase auth state to an app user', async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({
        uid: 'uid-1',
        email: 'user@example.com',
        displayName: '사용자',
        photoURL: 'https://example.com/photo.png',
      });
      return vi.fn();
    });
    const listener = vi.fn();
    const { subscribeToAuthState } = await import('./authService');

    subscribeToAuthState(listener);

    expect(listener).toHaveBeenCalledWith({
      uid: 'uid-1',
      email: 'user@example.com',
      displayName: '사용자',
      photoURL: 'https://example.com/photo.png',
    });
  });
});
