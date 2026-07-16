'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface Analytics {
  campaign_id: string;
  total_sent: number;
  total_delivered: number;
  total_bounced: number;
  total_opened: number;
  total_clicked: number;
  total_converted: number;
  total_unsubscribed: number;
  total_spam: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
  bounce_rate: number;
  revenue: number;
  variant_a: VariantData;
  variant_b: VariantData | null;
}

interface VariantData {
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_converted: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
}

interface TimelineEvent {
  time: string;
  event: string;
  count: number;
}

interface LinkData {
  id: string;
  url: string;
  label: string | null;
  click_count: number;
}

export default function CampaignAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [links, setLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/email-marketing/campaigns/${id}/analytics`).then(r => r.json()),
      fetch(`/api/email-marketing/campaigns/${id}/analytics?type=timeline`).then(r => r.json()),
      fetch(`/api/email-marketing/campaigns/${id}/analytics?type=heatmap`).then(r => r.json()),
    ]).then(([a, t, l]) => {
      setAnalytics(a);
      setTimeline(Array.isArray(t) ? t : []);
      setLinks(Array.isArray(l) ? l : []);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  if (!analytics) {
    return <p className="text-center text-gray-400">Analytics não disponível.</p>;
  }

  const formatPrice = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/campaigns/${id}`} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics da campanha</h1>
          <p className="text-sm text-gray-500">Métricas detalhadas de desempenho</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase text-gray-400">Enviados</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{analytics.total_sent}</p>
          <p className="text-xs text-gray-400">{analytics.total_delivered} entregues</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase text-gray-400">Open Rate</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{analytics.open_rate}%</p>
          <p className="text-xs text-gray-400">{analytics.total_opened} abriram</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase text-gray-400">Click Rate</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{analytics.click_rate}%</p>
          <p className="text-xs text-gray-400">{analytics.total_clicked} clicaram</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase text-gray-400">Conversao</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">{analytics.conversion_rate}%</p>
          <p className="text-xs text-gray-400">{analytics.total_converted} converteram</p>
        </div>
      </div>

      {/* Revenue & Bounce */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase text-gray-400">Receita gerada</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(analytics.revenue)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase text-gray-400">Bounce Rate</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{analytics.bounce_rate}%</p>
          <p className="text-xs text-gray-400">{analytics.total_bounced} bounces</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase text-gray-400">Unsubscribes</p>
          <p className="mt-1 text-2xl font-bold text-orange-600">{analytics.total_unsubscribed}</p>
        </div>
      </div>

      {/* A/B Test Comparison */}
      {analytics.variant_b && (
        <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm dark:border-purple-900/30 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Comparação A/B</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-3 text-left font-medium text-gray-500">Métrica</th>
                  <th className="pb-3 text-center font-medium text-gray-500">Variante A</th>
                  <th className="pb-3 text-center font-medium text-gray-500">Variante B</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Diferenca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                <tr>
                  <td className="py-3 text-gray-700 dark:text-gray-300">Open Rate</td>
                  <td className="py-3 text-center font-mono text-gray-900 dark:text-white">{analytics.variant_a.open_rate}%</td>
                  <td className="py-3 text-center font-mono text-gray-900 dark:text-white">{analytics.variant_b.open_rate}%</td>
                  <td className="py-3 text-right">
                    <span className={analytics.variant_b.open_rate > analytics.variant_a.open_rate ? 'text-green-600' : 'text-red-600'}>
                      {analytics.variant_b.open_rate > analytics.variant_a.open_rate ? '+' : ''}{(analytics.variant_b.open_rate - analytics.variant_a.open_rate).toFixed(1)}%
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-700 dark:text-gray-300">Click Rate</td>
                  <td className="py-3 text-center font-mono text-gray-900 dark:text-white">{analytics.variant_a.click_rate}%</td>
                  <td className="py-3 text-center font-mono text-gray-900 dark:text-white">{analytics.variant_b.click_rate}%</td>
                  <td className="py-3 text-right">
                    <span className={analytics.variant_b.click_rate > analytics.variant_a.click_rate ? 'text-green-600' : 'text-red-600'}>
                      {analytics.variant_b.click_rate > analytics.variant_a.click_rate ? '+' : ''}{(analytics.variant_b.click_rate - analytics.variant_a.click_rate).toFixed(1)}%
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-700 dark:text-gray-300">Conversao</td>
                  <td className="py-3 text-center font-mono text-gray-900 dark:text-white">{analytics.variant_a.conversion_rate}%</td>
                  <td className="py-3 text-center font-mono text-gray-900 dark:text-white">{analytics.variant_b.conversion_rate}%</td>
                  <td className="py-3 text-right">
                    <span className={analytics.variant_b.conversion_rate > analytics.variant_a.conversion_rate ? 'text-green-600' : 'text-red-600'}>
                      {analytics.variant_b.conversion_rate > analytics.variant_a.conversion_rate ? '+' : ''}{(analytics.variant_b.conversion_rate - analytics.variant_a.conversion_rate).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Timeline</h2>
          <div className="space-y-3">
            {timeline.map((event, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="w-20 text-xs text-gray-400">
                  {new Date(event.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="h-2 w-2 rounded-full bg-pink-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{event.event}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {event.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link Heatmap */}
      {links.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Links mais clicados</h2>
          <div className="space-y-3">
            {links.map(link => {
              const maxClicks = links[0]?.click_count || 1;
              const pct = (link.click_count / maxClicks) * 100;
              return (
                <div key={link.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm text-gray-700 dark:text-gray-300">{link.label || link.url}</p>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{link.click_count} cliques</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Export */}
      <div className="flex justify-end gap-3">
        <a
          href={`/api/email-marketing/export?campaign=${id}`}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
          download
        >
          Exportar CSV
        </a>
      </div>
    </div>
  );
}
