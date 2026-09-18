'use client';

import { useEffect, useState } from 'react';

type RatingSummary = { average: number; count: number };

export function ProductRatingSummary({ productId }: { productId: string }) {
  const [summary, setSummary] = useState<RatingSummary | null>(null);

  useEffect(() => {
    let active = true;
    async function loadRating() {
      try {
        const response = await fetch(`/api/products/${productId}/reviews`);
        if (!response.ok) return;
        const data = await response.json() as { reviews?: Array<{ rating: number }> };
        const ratings = (data.reviews ?? []).map((review) => Number(review.rating)).filter((rating) => rating >= 1 && rating <= 5);
        if (active) setSummary({
          average: ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0,
          count: ratings.length,
        });
      } catch {
        // The product remains usable if reviews cannot be loaded.
      }
    }

    void loadRating();
    const onReviewUpdated = (event: Event) => {
      if ((event as CustomEvent<string>).detail === productId) void loadRating();
    };
    window.addEventListener('product-review-updated', onReviewUpdated);
    return () => {
      active = false;
      window.removeEventListener('product-review-updated', onReviewUpdated);
    };
  }, [productId]);

  if (!summary) return null;

  return (
    <a href="#product-reviews" aria-label={summary.count ? `Ver ${summary.count} ${summary.count === 1 ? 'avaliação' : 'avaliações'}, nota média ${summary.average.toFixed(1)} de 5` : 'Ver avaliações do produto'} className="mt-2 inline-flex w-fit items-center gap-2 rounded-full text-xs font-medium text-gray-600 transition hover:text-pink-600 dark:text-gray-300 dark:hover:text-pink-400 sm:text-sm">
      <span aria-hidden="true" className="relative inline-block whitespace-nowrap text-base leading-none tracking-[0.08em] text-gray-300 dark:text-gray-700">
        ★★★★★
        <span className="absolute inset-0 overflow-hidden whitespace-nowrap text-amber-400" style={{ width: `${summary.average * 20}%` }}>★★★★★</span>
      </span>
      {summary.count ? <span><strong className="text-gray-900 dark:text-white">{summary.average.toFixed(1).replace('.', ',')}</strong> · {summary.count} {summary.count === 1 ? 'avaliação' : 'avaliações'}</span> : <span>Ainda sem avaliações</span>}
      <span aria-hidden="true" className="text-pink-500">→</span>
    </a>
  );
}
