'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PRIVACY_CHANGED_EVENT, readClientPrivacyConsent, type PrivacyConsent } from '@/lib/privacy';

export function UserActivityTracker() {
  const pathname = usePathname();
  const { status, data } = useSession();
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  useEffect(() => {
    setAnalyticsAllowed(readClientPrivacyConsent()?.analytics === true);
    const onPrivacyChanged = (event: Event) => {
      setAnalyticsAllowed((event as CustomEvent<PrivacyConsent>).detail.analytics);
    };
    window.addEventListener(PRIVACY_CHANGED_EVENT, onPrivacyChanged);
    return () => window.removeEventListener(PRIVACY_CHANGED_EVENT, onPrivacyChanged);
  }, []);

  useEffect(() => {
    if (!analyticsAllowed) return;
    if (status === 'loading' || data?.user?.role === 'admin') return;
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/api')) return;

    const key = `hellou-activity:${pathname}`;
    const lastTracked = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - lastTracked < 30_000) return;
    sessionStorage.setItem(key, String(Date.now()));

    const endpoint = status === 'authenticated' && data?.user ? '/api/activity' : '/api/analytics/track';
    const body = status === 'authenticated' && data?.user
      ? { eventType: 'page_view', path: pathname }
      : { path: `${pathname}${window.location.search}`, referrer: document.referrer };

    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
  }, [analyticsAllowed, data, pathname, status]);

  return null;
}
