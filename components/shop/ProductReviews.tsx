'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface ReviewRow {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user: { id: string; name: string | null } | null;
}

function Stars({ rating, interactive, onSelect }: { rating: number; interactive?: boolean; onSelect?: (r: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onSelect?.(star)}
          className={`text-lg ${interactive ? 'cursor-pointer hover:scale-110 transition' : 'cursor-default'}`}
        >
          <span className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>
        </button>
      ))}
    </div>
  );
}

export function ProductReviews({ productId, isAdmin }: { productId: string; isAdmin?: boolean }) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${productId}/reviews`)
      .then((r) => r.json())
      .then((data: { reviews: ReviewRow[]; has_purchased?: boolean }) => {
        setReviews(data.reviews ?? []);
        setHasPurchased(!!data.has_purchased);
        if (session?.user) {
          const userId = (session.user as { id?: string }).id;
          setAlreadyReviewed(data.reviews?.some((r) => r.user_id === userId) ?? false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId, session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;
    setSubmitting(true);

    const res = await fetch(`/api/products/${productId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, comment: comment.trim() || null }),
    });

    if (res.ok) {
      const data = (await res.json()) as { review: ReviewRow };
      setReviews((prev) => [data.review, ...prev]);
      setAlreadyReviewed(true);
      setRating(0);
      setComment('');
    }
    setSubmitting(false);
  }

  async function handleDelete(reviewId: string) {
    if (!confirm('Excluir esta avaliação?')) return;
    const res = await fetch(`/api/admin/reviews/${reviewId}`, { method: 'DELETE' });
    if (res.ok) {
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    }
  }

  const avg = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-900">Avaliações</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-1">
            <Stars rating={Math.round(avg)} />
            <span className="text-sm text-gray-500">
              ({avg.toFixed(1)}) · {reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'}
            </span>
          </div>
        )}
      </div>

      {/* Submit form — only for users who purchased */}
      {session?.user && !alreadyReviewed && hasPurchased && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-2">Deixe sua avaliação</p>
          <Stars rating={rating} interactive onSelect={setRating} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentário (opcional)"
            rows={2}
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
          <button
            type="submit"
            disabled={submitting || !rating}
            className="mt-3 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : 'Enviar avaliação'}
          </button>
        </form>
      )}

      {/* Notice for logged-in users who haven't purchased */}
      {session?.user && !alreadyReviewed && !hasPurchased && !loading && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            Você precisa comprar este produto para poder avaliar.
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 rounded-lg bg-gray-100" />
          <div className="h-16 rounded-lg bg-gray-100" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma avaliação ainda. Seja o primeiro!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Stars rating={review.rating} />
                  <span className="text-sm font-medium text-gray-700">
                    {review.user?.name ?? 'Usuário'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {new Date(review.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDelete(review.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
              {review.comment && (
                <p className="mt-2 text-sm text-gray-600">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
