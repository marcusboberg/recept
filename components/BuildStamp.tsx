'use client';

import { useEffect } from 'react';

const BUILD_STAMP = process.env.NEXT_PUBLIC_BUILD_STAMP ?? 'dev';
const REALTIME_FLAG = process.env.NEXT_PUBLIC_FIRESTORE_DISABLE_REALTIME ?? 'unset';
const POLL_INTERVAL = process.env.NEXT_PUBLIC_FIRESTORE_POLL_INTERVAL_MS ?? 'default';

export function BuildStamp() {
  useEffect(() => {
    // Console signal to confirm which bundle is running.
    console.info(
      `[build] ${BUILD_STAMP} | realtime=${REALTIME_FLAG} | poll=${POLL_INTERVAL}`,
    );
  }, []);

  return (
    <div className="build-stamp" data-build-stamp={BUILD_STAMP}>
      Build {BUILD_STAMP} | realtime {REALTIME_FLAG} | poll {POLL_INTERVAL}
    </div>
  );
}
