'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export function UserActivityTracker() {
  const pathname = usePathname();
  const { status, data } = useSession();

  useEffect(() => {
    if (status !== 'authenticated' || !data.user || data.user.role === 'admin') return;
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/api')) return;

    const key = `hellou-activity:${pathname}`;
    const lastTracked = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - lastTracked < 30_000) return;
    sessionStorage.setItem(key, String(Date.now()));

    void fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'page_view', path: pathname }),
      keepalive: true,
    });
  }, [data, pathname, status]);

  return null;
}
