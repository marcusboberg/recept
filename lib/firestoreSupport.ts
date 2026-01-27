'use client';

const DEFAULT_POLL_INTERVAL_MS = 30000;
const MIN_POLL_INTERVAL_MS = 5000;

export function isSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|CriOS|EdgiOS|FxiOS|OPiOS|Android/i.test(ua);
}

export function shouldDisableFirestoreRealtime(): boolean {
  const envOverride = process.env.NEXT_PUBLIC_FIRESTORE_DISABLE_REALTIME;
  if (envOverride === 'true') return true;
  if (envOverride === 'false') return false;
  return isSafariBrowser();
}

export function getFirestorePollIntervalMs(): number {
  const raw = process.env.NEXT_PUBLIC_FIRESTORE_POLL_INTERVAL_MS;
  if (raw) {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed) && parsed >= MIN_POLL_INTERVAL_MS) {
      return parsed;
    }
  }
  return DEFAULT_POLL_INTERVAL_MS;
}
