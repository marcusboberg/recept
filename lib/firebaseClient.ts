'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function ensureApp(): FirebaseApp {
  if (!app) {
    if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
      throw new Error('Firebase client configuration is missing. Set NEXT_PUBLIC_FIREBASE_* env vars.');
    }
    app = getApps().length > 0 ? getApps()[0] : initializeApp(config);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;
  authInstance = getAuth(ensureApp());
  return authInstance;
}

export function getFirestoreClient(): Firestore {
  if (firestoreInstance) return firestoreInstance;
  firestoreInstance = getFirestore(ensureApp());
  return firestoreInstance;
}
