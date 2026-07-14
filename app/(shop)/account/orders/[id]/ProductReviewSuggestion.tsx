'use client';

import Link from 'next/link';
import { useState } from 'react';

interface ProductReviewSuggestionProps {
  productId: string;
  productName: string;
  productType?: 'physical' | 'digital';
}

export default function ProductReviewSuggestion({ productId, productName, productType = 'physical' }: ProductReviewSuggestionProps) {
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const basePath = productType === 'digital' ? '/stl' : '/products';
  const productLink = `${basePath}/${productId}`;

  async function handleSubmitReview() {
    if (!rating) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, rating, comment }),
      });

      if (res.ok) {
        setSubmitted(true);
        setShowReview(false);
        setRating(0);
        setComment('');
      } else {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? 'Não foi possível enviar a avaliação. Tente novamente.');
      }
    } catch (err) {
      console.error('[ProductReviewSuggestion] error:', err);
      setError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (showReview) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setShowReview(false)}
            className="absolute top-3 right-3 rounded-full p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Avaliar {productName}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Compartilhe sua experiência com este produto</p>

          {/* Rating stars */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Classificação</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-2xl transition ${rating >= star ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Comentário (opcional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1200}
              placeholder="Compartilhe seus pensamentos..."
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              rows={3}
            />
          </div>

          {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowReview(false)}
              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmitReview}
              disabled={!rating || submitting}
              className="flex-1 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? 'Enviando...' : 'Enviar avaliação'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setShowReview(true)}
        disabled={submitted}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
            clipRule="evenodd"
          />
        </svg>
        {submitted ? 'Avaliação enviada' : 'Avaliar'}
      </button>
      <Link
        href={productLink}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
        Ver produto
      </Link>
    </div>
  );
}
