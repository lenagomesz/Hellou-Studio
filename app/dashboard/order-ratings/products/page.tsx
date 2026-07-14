'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MessageSquareQuote, PackageSearch, Star, UserRound } from 'lucide-react';

type ReviewRow = {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  productName: string;
  productType: 'physical' | 'digital';
};

type ApiResponse = { data: ReviewRow[]; count: number };
const ITEMS_PER_PAGE = 20;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

export default function ProductRatingsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [minRating, setMinRating] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(count / ITEMS_PER_PAGE));

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          limit: String(ITEMS_PER_PAGE),
          offset: String((page - 1) * ITEMS_PER_PAGE),
          minRating: String(minRating),
        });
        const response = await fetch(`/api/admin/reviews?${params}`, { signal: controller.signal });
        const payload = (await response.json().catch(() => null)) as ApiResponse | { error?: string } | null;
        if (!response.ok) throw new Error(payload && 'error' in payload ? payload.error : 'Erro ao buscar avaliações');
        const result = payload as ApiResponse;
        setReviews(result.data);
        setCount(result.count);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setError(err instanceof Error ? err.message : 'Erro ao buscar avaliações');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [page, minRating]);

  return (
    <div className="space-y-6">
      <nav className="flex w-fit gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Tipos de avaliação">
        <Link href="/dashboard/order-ratings/products" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Produtos</Link>
        <Link href="/dashboard/order-ratings" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Experiência do pedido</Link>
      </nav>

      <header className="overflow-hidden rounded-[26px] border border-pink-100 bg-gradient-to-br from-white via-pink-50/60 to-orange-50 p-6 text-slate-950 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Voz do cliente</p>
            <h1 className="mt-2 text-3xl font-bold">Avaliações dos produtos</h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">Veja a opinião de cada cliente sobre os produtos físicos e arquivos STL comprados.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-yellow-100 bg-white p-4 shadow-sm">
            <Star className="h-8 w-8 fill-yellow-300 text-yellow-500" />
            <div><p className="text-2xl font-bold">{count}</p><p className="text-xs text-slate-500">avaliações encontradas</p></div>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {[{ label: 'Todas', value: 1 }, { label: '4 estrelas ou mais', value: 4 }, { label: 'Somente 5 estrelas', value: 5 }].map((filter) => (
          <button key={filter.value} type="button" onClick={() => { setMinRating(filter.value); setPage(1); }} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${minRating === filter.value ? 'bg-pink-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3 lg:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-44 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      ) : error ? (
        <p role="alert" className="rounded-2xl bg-red-50 p-6 text-center text-sm text-red-700">{error}</p>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><PackageSearch className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 text-sm text-slate-600">Nenhuma avaliação de produto encontrada.</p></div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/dashboard/products/${review.productId}`} className="font-bold text-slate-950 hover:text-pink-600">{review.productName}</Link>
                  <p className="mt-1 text-xs text-slate-500">{review.productType === 'digital' ? 'Arquivo STL' : 'Produto físico'} · {formatDate(review.createdAt)}</p>
                </div>
                <span className="whitespace-nowrap rounded-full bg-yellow-50 px-3 py-1 text-sm font-bold text-yellow-700">★ {review.rating}/5</span>
              </div>
              <div className={`mt-4 rounded-xl p-3 text-sm leading-6 ${review.comment ? 'bg-pink-50 text-slate-700' : 'bg-slate-50 text-slate-400'}`}>
                <MessageSquareQuote className="mr-1 inline h-4 w-4 text-pink-500" /> {review.comment || 'Cliente avaliou sem deixar comentário.'}
              </div>
              <Link href={`/dashboard/users/${review.userId}`} className="mt-4 flex items-center gap-2 text-sm text-slate-600 hover:text-pink-600">
                <UserRound className="h-4 w-4" /><span><strong>{review.userName ?? 'Cliente'}</strong> · {review.userEmail ?? 'E-mail indisponível'}</span>
              </Link>
            </article>
          ))}
        </div>
      )}

      {!loading && !error && count > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40">Anterior</button>
          <span className="text-sm text-slate-500">Página {page} de {totalPages}</span>
          <button type="button" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40">Próxima</button>
        </div>
      )}
    </div>
  );
}
