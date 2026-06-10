import { beforeEach, describe, expect, it, vi } from 'vitest';

const signInWithGoogle = vi.fn(async () => undefined);
const signOutOfGoogle = vi.fn(async () => undefined);
let authCallback: ((user: unknown) => void) | null = null;
const unsubscribe = vi.fn();
const subscribeToAuthState = vi.fn((callback: (user: unknown) => void) => {
  authCallback = callback;
  return unsubscribe;
});

vi.mock('../lib/auth/authService', () => ({
  signInWithGoogle,
  signOutOfGoogle,
  subscribeToAuthState,
}));

describe('authStore', () => {
  beforeEach(async () => {
    vi.resetModules();
    signInWithGoogle.mockClear();
    signOutOfGoogle.mockClear();
    subscribeToAuthState.mockClear();
    unsubscribe.mockClear();
    authCallback = null;
  });

  it('subscribes to Firebase auth state and stores the current user', async () => {
    const { useAuthStore } = await import('./authStore');

    const cleanup = useAuthStore.getState().start();
    authCallback?.({ uid: 'uid-1', email: 'user@example.com', displayName: '사용자', photoURL: null });

    expect(useAuthStore.getState().loading).toBe(false);
    expect(useAuthStore.getState().user?.email).toBe('user@example.com');
    cleanup();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('delegates sign-in and sign-out actions to auth service', async () => {
    const { useAuthStore } = await import('./authStore');

    await useAuthStore.getState().signIn();
    await useAuthStore.getState().signOut();

    expect(signInWithGoogle).toHaveBeenCalled();
    expect(signOutOfGoogle).toHaveBeenCalled();
  });
});
