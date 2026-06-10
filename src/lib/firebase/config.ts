import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const REQUIRED_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

type RequiredFirebaseEnv = (typeof REQUIRED_ENV)[number];

type FirebaseEnv = Record<RequiredFirebaseEnv, string | undefined> & {
  VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
};

const DEFAULT_FIREBASE_ENV: FirebaseEnv = {
  // Firebase Web App config is intentionally public: these values are embedded
  // into the production client bundle so GitHub Actions can deploy without
  // modifying the workflow. Firestore rules and Firebase Auth protect data.
  VITE_FIREBASE_API_KEY: 'AIzaSyAl50nG31uE9Fm5Atba20yHzRl_13TUCIM',
  VITE_FIREBASE_AUTH_DOMAIN: 'mdpro-chul1215.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'mdpro-chul1215',
  VITE_FIREBASE_APP_ID: '1:36847121099:web:174db9e084751ec07be14e',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '36847121099',
};

function readEnv(): FirebaseEnv {
  const viteEnv = (import.meta as unknown as { env?: Partial<FirebaseEnv> }).env ?? {};
  // Vitest의 vi.stubEnv는 process.env를 갱신한다. 브라우저 런타임에서는
  // import.meta.env가 실제 Vite 값을 제공한다.
  const nodeEnv =
    (globalThis as unknown as { process?: { env?: Partial<FirebaseEnv> } }).process
      ?.env ?? {};
  return { ...viteEnv, ...nodeEnv } as FirebaseEnv;
}

export function getFirebaseConfig(
  overrideEnv?: Partial<FirebaseEnv>,
): FirebaseOptions {
  const env = { ...DEFAULT_FIREBASE_ENV, ...readEnv(), ...overrideEnv } as FirebaseEnv;
  const missing = REQUIRED_ENV.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase environment variables: ${missing.join(', ')}`,
    );
  }

  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    ...(env.VITE_FIREBASE_MESSAGING_SENDER_ID
      ? { messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID }
      : {}),
  };
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  app = getApps()[0] ?? initializeApp(getFirebaseConfig());
  return app;
}

export function getFirestoreDb(): Firestore {
  if (db) return db;
  db = getFirestore(getFirebaseApp());
  return db;
}
