'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard] error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">Erro no painel</h2>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Algo deu errado ao carregar esta pagina.
        </p>
        <button
          onClick={reset}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
