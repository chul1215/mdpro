import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('firebase config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('reads required Firebase settings from Vite env', async () => {
    const { getFirebaseConfig } = await import('./config');

    expect(
      getFirebaseConfig({
        VITE_FIREBASE_API_KEY: 'api-key',
        VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'mdpro-test',
        VITE_FIREBASE_APP_ID: 'app-id',
        VITE_FIREBASE_MESSAGING_SENDER_ID: 'sender-id',
      }),
    ).toEqual({
      apiKey: 'api-key',
      authDomain: 'example.firebaseapp.com',
      projectId: 'mdpro-test',
      appId: 'app-id',
      messagingSenderId: 'sender-id',
    });
  });

  it('throws a helpful error when required Firebase settings are missing', async () => {
    const { getFirebaseConfig } = await import('./config');

    expect(() =>
      getFirebaseConfig({
        VITE_FIREBASE_API_KEY: 'api-key',
        VITE_FIREBASE_AUTH_DOMAIN: '',
        VITE_FIREBASE_PROJECT_ID: '',
        VITE_FIREBASE_APP_ID: '',
        VITE_FIREBASE_MESSAGING_SENDER_ID: '',
      }),
    ).toThrow(
      /Missing Firebase environment variables: VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID/,
    );
  });
});
