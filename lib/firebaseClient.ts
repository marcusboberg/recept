'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';
import { getFirestore as getFirestoreLite, type Firestore as FirestoreLite } from 'firebase/firestore/lite';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let firestoreLiteInstance: FirestoreLite | null = null;

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
  const forceLongPolling = shouldForceLongPolling();
  firestoreInstance = forceLongPolling
    ? initializeFirestore(
        ensureApp(),
        {
          experimentalForceLongPolling: true,
          useFetchStreams: false,
        } as Parameters<typeof initializeFirestore>[1],
      )
    : getFirestore(ensureApp());
  return firestoreInstance;
}

export function getFirestoreLiteClient(): FirestoreLite {
  if (firestoreLiteInstance) return firestoreLiteInstance;
  firestoreLiteInstance = getFirestoreLite(ensureApp());
  return firestoreLiteInstance;
}

function shouldForceLongPolling(): boolean {
  if (typeof navigator === 'undefined') return false;
  const envOverride = process.env.NEXT_PUBLIC_FIRESTORE_FORCE_LONG_POLLING;
  if (envOverride === 'true') return true;
  if (envOverride === 'false') return false;
  const ua = navigator.userAgent;
  const isSafari =
    /Safari/i.test(ua) && !/Chrome|CriOS|EdgiOS|FxiOS|OPiOS|Android/i.test(ua);
  if (isSafari) return true;
  return typeof ReadableStream === 'undefined' || typeof AbortController === 'undefined';
}
