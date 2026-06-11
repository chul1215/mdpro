/// <reference types="node" />

import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
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
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const PROJECT_ID = 'mdpro-rules-test';

let testEnv: RulesTestEnvironment;
const emulatorPort = process.env.FIRESTORE_EMULATOR_PORT;

function authedDb(uid: string, email: string) {
  return testEnv.authenticatedContext(uid, { email }).firestore();
}

const describeWithFirestoreEmulator = emulatorPort ? describe : describe.skip;

describeWithFirestoreEmulator('firestore sharing rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync('firebase/firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: Number(emulatorPort),
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('allows a signed-in user to send a pending document share', async () => {
    const db = authedDb('sender-1', 'sender@example.com');

    await assertSucceeds(
      addDoc(collection(db, 'shares'), {
        senderUid: 'sender-1',
        senderEmail: 'sender@example.com',
        recipientEmail: 'roomi0120@gmail.com',
        title: '테스트 문서',
        content: '# 테스트',
        sourceDocumentId: 'doc-1',
        status: 'pending',
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('allows the recipient to list inbox shares ordered by creation time', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await addDoc(collection(context.firestore(), 'shares'), {
        senderUid: 'sender-1',
        senderEmail: 'sender@example.com',
        recipientEmail: 'roomi0120@gmail.com',
        title: '받은 문서',
        content: '# 받은 문서',
        sourceDocumentId: 'doc-1',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    });

    const db = authedDb('recipient-1', 'roomi0120@gmail.com');
    const inboxQuery = query(
      collection(db, 'shares'),
      where('recipientEmail', '==', 'roomi0120@gmail.com'),
      orderBy('createdAt', 'desc'),
    );

    await assertSucceeds(getDocs(inboxQuery));
  });

  it('allows the recipient to accept only status and acceptedAt changes', async () => {
    let shareId = '';
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const created = await addDoc(collection(context.firestore(), 'shares'), {
        senderUid: 'sender-1',
        senderEmail: 'sender@example.com',
        recipientEmail: 'roomi0120@gmail.com',
        title: '받은 문서',
        content: '# 받은 문서',
        sourceDocumentId: 'doc-1',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      shareId = created.id;
    });

    const db = authedDb('recipient-1', 'roomi0120@gmail.com');

    await assertSucceeds(
      updateDoc(doc(db, 'shares', shareId), {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
      }),
    );
  });

  it('rejects unauthenticated sends', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    await assertFails(
      addDoc(collection(db, 'shares'), {
        senderUid: 'sender-1',
        senderEmail: 'sender@example.com',
        recipientEmail: 'roomi0120@gmail.com',
        title: '테스트 문서',
        content: '# 테스트',
        sourceDocumentId: 'doc-1',
        status: 'pending',
        createdAt: serverTimestamp(),
      }),
    );
  });
});
