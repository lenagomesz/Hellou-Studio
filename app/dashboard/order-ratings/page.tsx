'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquareQuote, Star, UserRound } from 'lucide-react';

type RatingRow = {
  id: string;
  orderId: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  orderTotal: number | null;
};

type ApiResponse = {
  data: RatingRow[];
  count: number;
  limit: number;
  offset: number;
};

const RATING_EMOJIS: Record<number, string> = {
  1: '\u{1F61E}',
  2: '\u{1F615}',
  3: '\u{1F610}',
  4: '\u{1F60A}',
  5: '\u{1F60D}',
};

const ITEMS_PER_PAGE = 20;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export default function OrderRatingsPage() {
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [minRating, setMinRating] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  useEffect(() => {
    async function fetchRatings() {
      setLoading(true);
      setError(null);

      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const params = new URLSearchParams({
        limit: String(ITEMS_PER_PAGE),
        offset: String(offset),
        minRating: String(minRating),
      });

      try {
        const res = await fetch(`/api/admin/order-ratings?${params.toString()}`);
        if (!res.ok) {
          throw new Error('Erro ao buscar avaliações');
        }
        const json: ApiResponse = await res.json();
        setRatings(json.data);
        setTotalCount(json.count);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setRatings([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    }

    fetchRatings();
  }, [currentPage, minRating]);

  function handleFilterChange(newMinRating: number) {
    setMinRating(newMinRating);
    setCurrentPage(1);
  }

  const filters = [
    { label: 'Todas as avaliações', value: 1 },
    { label: '⭐⭐⭐⭐+ (4+)', value: 4 },
    { label: '⭐⭐⭐⭐⭐ (5)', value: 5 },
  ];

  return (
    <div className="space-y-6">
      <nav className="flex w-fit gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Tipos de avaliação">
        <Link href="/dashboard/order-ratings/products" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Produtos</Link>
        <Link href="/dashboard/order-ratings" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Experiência do pedido</Link>
      </nav>
      {/* Header */}
      <header className="overflow-hidden rounded-[26px] border border-pink-100 bg-gradient-to-br from-white via-pink-50/60 to-orange-50 p-6 text-slate-950 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Voz do cliente</p><h1 className="mt-2 text-3xl font-bold">Experiência do pedido</h1><p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">Acompanhe a percepção do cliente sobre atendimento, entrega e todo o fluxo do pedido.</p></div>
          <div className="flex items-center gap-3 rounded-2xl border border-yellow-100 bg-white p-4 shadow-sm"><Star className="h-8 w-8 fill-yellow-300 text-yellow-500" /><div><p className="text-2xl font-bold">{totalCount}</p><p className="text-xs text-slate-500">avaliações encontradas</p></div></div>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => handleFilterChange(filter.value)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              minRating === filter.value
                ? 'bg-pink-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-50 p-8 text-center dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : ratings.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 shadow-sm border border-gray-100 text-center dark:bg-gray-900 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Nenhuma avaliação encontrada.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl bg-white shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Avaliação
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Comentário</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Pedido
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {ratings.map((row) => (
                  <tr
                    key={row.id}
                    className="transition hover:bg-pink-50/30 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3.5">
                      <span className="text-2xl" title={`${row.rating}/5`}>
                        {RATING_EMOJIS[row.rating]}
                      </span>
                      <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {row.rating}/5
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/dashboard/users/${row.userId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 hover:text-pink-600 dark:text-white"><UserRound className="h-3.5 w-3.5" /> {row.userName ?? 'Cliente'}</Link>
                      <p className="text-xs text-gray-500">
                        {row.userEmail ?? '—'}
                      </p>
                    </td>
                    <td className="max-w-sm px-4 py-3.5"><div className={`rounded-xl px-3 py-2 text-sm leading-5 ${row.comment ? 'bg-pink-50 text-slate-700 dark:bg-pink-500/10 dark:text-slate-200' : 'text-slate-400'}`}><MessageSquareQuote className="mr-1 inline h-4 w-4 text-pink-500" />{row.comment || 'Sem comentário'}</div></td>
                    <td className="px-4 py-3.5">
                      <Link href={`/dashboard/orders/${row.orderId}`} className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 hover:bg-pink-100 hover:text-pink-700 dark:bg-gray-800 dark:text-gray-300">
                        #{row.orderId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-white">
                      {row.orderTotal !== null
                        ? formatPrice(row.orderTotal)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {ratings.map((row) => (
              <div
                key={row.id}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{RATING_EMOJIS[row.rating]}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {row.rating}/5
                    </span>
                  </div>
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    #{row.orderId.slice(0, 8)}
                  </span>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {row.userName ?? '—'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {row.userEmail ?? '—'}
                  </p>
                </div>
                {row.comment && <p className="mt-3 rounded-xl bg-pink-50 p-3 text-sm leading-5 text-slate-700 dark:bg-pink-500/10 dark:text-slate-200">“{row.comment}”</p>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {formatDate(row.createdAt)}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {row.orderTotal !== null
                      ? formatPrice(row.orderTotal)
                      : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {!loading && !error && totalCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Próximo
          </button>
        </div>
      )}
    </div>
  );
}
