'use client';

import { useEffect } from 'react';
import { shouldDisableFirestoreRealtime } from '@/lib/firestoreSupport';

const BUILD_STAMP = process.env.NEXT_PUBLIC_BUILD_STAMP ?? 'dev';
const REALTIME_DISABLED_FLAG = process.env.NEXT_PUBLIC_FIRESTORE_DISABLE_REALTIME ?? 'unset';
const POLL_INTERVAL = process.env.NEXT_PUBLIC_FIRESTORE_POLL_INTERVAL_MS ?? 'default';

export function BuildStamp() {
  const mode = shouldDisableFirestoreRealtime() ? 'polling' : 'realtime';

  useEffect(() => {
    // Console signal to confirm which bundle is running.
    console.info(
      `[build] ${BUILD_STAMP} | mode=${mode} | realtimeDisabled=${REALTIME_DISABLED_FLAG} | poll=${POLL_INTERVAL}`,
    );
  }, [mode]);

  return (
    <div className="build-stamp" data-build-stamp={BUILD_STAMP}>
      Build {BUILD_STAMP} | mode {mode} | realtimeDisabled {REALTIME_DISABLED_FLAG} | poll {POLL_INTERVAL}
    </div>
  );
}
