import { cert, getApp, getApps, initializeApp, type AppOptions } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let db: Firestore | null = null;

function createApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY must be set.');
  }

  privateKey = privateKey.replace(/\\n/g, '\n');

  const options: AppOptions = {
    credential: cert({ projectId, clientEmail, privateKey }),
  };

  if (getApps().length === 0) {
    initializeApp(options);
  } else {
    getApp();
  }
}

export function getDb(): Firestore {
  if (db) return db;
  createApp();
  db = getFirestore();
  return db;
}
