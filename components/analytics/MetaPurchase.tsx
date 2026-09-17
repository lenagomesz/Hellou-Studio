'use client';

import { useEffect } from 'react';
import { PRIVACY_CHANGED_EVENT } from '@/lib/privacy';
import { trackMetaEvent } from '@/lib/meta-pixel';

type PurchaseData = {
  confirmed: boolean;
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_type?: string;
  num_items?: number;
};

export function MetaPurchase({ orderId }: { orderId: string }) {
  useEffect(() => {
    const key = `hellou:meta-purchase:${orderId}`;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let purchase: PurchaseData | null = null;

    const send = () => {
      if (!purchase?.confirmed || localStorage.getItem(key)) return;
      if (trackMetaEvent('Purchase', {
        value: purchase.value,
        currency: purchase.currency,
        content_ids: purchase.content_ids,
        content_type: purchase.content_type,
        num_items: purchase.num_items,
      })) localStorage.setItem(key, '1');
    };

    const check = async () => {
      if (cancelled || localStorage.getItem(key)) return;
      try {
        const response = await fetch(`/api/meta/purchase/${encodeURIComponent(orderId)}`, { cache: 'no-store' });
        if (cancelled) return;
        if (!response.ok) return;
        purchase = await response.json() as PurchaseData;
        if (purchase.confirmed) { send(); return; }
      } catch { /* The order may still be finalizing. */ }
      if (!cancelled && ++attempts < 24) timer = setTimeout(check, 5000);
    };

    void check();
    window.addEventListener(PRIVACY_CHANGED_EVENT, send);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener(PRIVACY_CHANGED_EVENT, send);
    };
  }, [orderId]);
  return null;
}
