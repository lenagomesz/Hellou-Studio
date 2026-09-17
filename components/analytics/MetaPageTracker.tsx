'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { PRIVACY_CHANGED_EVENT } from '@/lib/privacy';
import { syncMetaConsent, trackMetaEvent } from '@/lib/meta-pixel';

export function MetaPageTracker() {
  const pathname = usePathname();
  const trackedPath = useRef<string | null>(null);

  useEffect(() => {
    const track = () => {
      if (pathname.startsWith('/dashboard') || pathname.startsWith('/api')) {
        trackedPath.current = null;
        syncMetaConsent();
      } else if (trackedPath.current !== pathname && trackMetaEvent('PageView')) {
        trackedPath.current = pathname;
      }
    };
    track();
    window.addEventListener(PRIVACY_CHANGED_EVENT, track);
    return () => window.removeEventListener(PRIVACY_CHANGED_EVENT, track);
  }, [pathname]);

  return null;
}
