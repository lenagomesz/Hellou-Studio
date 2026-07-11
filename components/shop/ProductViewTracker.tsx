'use client';

import { useEffect, useState } from 'react';

export function ProductViewTracker({ productId }: { productId: string }) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function trackView() {
      try {
        // Register the view and get count
        const res = await fetch(`/api/products/${productId}/view`, {
          method: 'POST',
        });
        if (!res.ok) {
          // Fallback: just get the count
          const fallback = await fetch(`/api/products/${productId}/views`);
          if (fallback.ok) {
            const data = await fallback.json();
            if (!cancelled) setViews(data.views);
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) setViews(data.views);
      } catch {
        // Silent fail - view tracking is non-critical
      }
    }

    trackView();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (views === null) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      <span aria-hidden="true">&#128065;</span> {views} {views === 1 ? 'pessoa viu isto' : 'pessoas viram isto'}
    </span>
  );
}
