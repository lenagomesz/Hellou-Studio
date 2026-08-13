'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ShipmentTrackingResult } from '@/lib/shipment-tracking';

function formatTrackingDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function ShipmentTracking({ orderId, trackingCode }: { orderId: string; trackingCode: string }) {
  const [tracking, setTracking] = useState<ShipmentTrackingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!trackingCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/orders/${orderId}/tracking`, { cache: 'no-store' });
      const data = await response.json() as ShipmentTrackingResult & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Não foi possível consultar o rastreamento.');
      setTracking(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível consultar o rastreamento.');
    } finally {
      setLoading(false);
    }
  }, [orderId, trackingCode]);

  useEffect(() => {
    setTracking(null);
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  if (!trackingCode.trim()) return null;

  const trackingUrl = tracking?.trackingUrl || `https://melhorrastreio.com.br/${encodeURIComponent(trackingCode.trim())}`;

  return (
    <section className="rounded-2xl border border-purple-100 bg-purple-50/50 p-5 shadow-sm dark:border-purple-800 dark:bg-purple-950/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-purple-600 dark:text-purple-400">Entrega</p>
          <h2 className="mt-1 text-base font-bold text-purple-950 dark:text-purple-200">Rastreamento do pedido</h2>
          <p className="mt-1 text-xs text-purple-800 dark:text-purple-300">
            Correios · <span className="font-mono font-bold">{trackingCode.trim().toUpperCase()}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void refresh()} disabled={loading} className="rounded-lg border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300">
            {loading ? 'Atualizando…' : 'Atualizar'}
          </button>
          <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-purple-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-800">
            Abrir site ↗
          </a>
        </div>
      </div>

      {error && <p className="mt-4 rounded-xl bg-white/80 px-3 py-2 text-xs text-red-600 dark:bg-black/20 dark:text-red-300">{error}</p>}
      {!error && tracking?.message && <p className="mt-4 rounded-xl bg-white/80 px-3 py-2 text-xs text-purple-700 dark:bg-black/20 dark:text-purple-300">{tracking.message}</p>}

      {tracking && tracking.events.length > 0 && (
        <ol className="mt-5 space-y-0">
          {tracking.events.map((event, index) => (
            <li key={`${event.occurredAt}-${event.code}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
              {index < tracking.events.length - 1 && <span className="absolute left-[7px] top-4 h-[calc(100%-4px)] w-px bg-purple-200 dark:bg-purple-800" />}
              <span className={`relative mt-1 h-4 w-4 shrink-0 rounded-full border-4 ${index === 0 ? 'border-purple-600 bg-white dark:bg-purple-950' : 'border-purple-200 bg-white dark:border-purple-800 dark:bg-purple-950'}`} />
              <div className="min-w-0">
                <p className={`text-sm ${index === 0 ? 'font-bold text-purple-950 dark:text-purple-100' : 'font-medium text-gray-800 dark:text-gray-200'}`}>{event.description}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{formatTrackingDate(event.occurredAt)}</p>
                {event.location && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{event.location}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
