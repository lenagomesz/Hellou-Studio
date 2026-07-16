'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  preview_text: string | null;
  body_html: string;
  status: string;
  segment_type: string;
  total_recipients: number;
  ab_test_enabled: boolean;
  ab_variant_b_subject: string | null;
  ab_winner: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  cta_text: string | null;
  cta_url: string | null;
  cta_color: string;
  created_at: string;
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/email-marketing/campaigns/${id}`)
      .then(res => res.json())
      .then(data => setCampaign(data))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSend() {
    if (!confirm('Enviar campanha agora para todos os destinatários do segmento?')) return;
    setSending(true);
    try {
      const res = await fetch(`/api/email-marketing/campaigns/${id}/send`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`Campanha enviada! ${data.sent}/${data.total} e-mails enviados.`);
        router.push(`/dashboard/campaigns/${id}/analytics`);
      } else {
        alert(`Erro: ${data.error}`);
      }
    } finally {
      setSending(false);
    }
  }

  async function handleDecideAB() {
    const res = await fetch(`/api/email-marketing/campaigns/${id}/ab-test`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      alert(`Vencedor: Variante ${data.winner}. Melhoria de ${data.improvement}% em aberturas.`);
      window.location.reload();
    } else {
      alert(`Erro: ${data.error}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  if (!campaign) {
    return <p className="text-center text-gray-400">Campanha não encontrada.</p>;
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/campaigns" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{campaign.name}</h1>
            <p className="text-sm text-gray-500">{campaign.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === 'sent' && (
            <Link href={`/dashboard/campaigns/${id}/analytics`} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
              Ver analytics
            </Link>
          )}
          {campaign.status === 'draft' && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {sending ? 'Enviando...' : 'Enviar agora'}
            </button>
          )}
        </div>
      </div>

      {/* Status card */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase text-gray-400">Status</p>
          <p className="mt-1 text-lg font-bold capitalize text-gray-900 dark:text-white">{campaign.status}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase text-gray-400">Destinatários</p>
          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{campaign.total_recipients}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase text-gray-400">Segmento</p>
          <p className="mt-1 text-lg font-bold capitalize text-gray-900 dark:text-white">{campaign.segment_type}</p>
        </div>
      </div>

      {/* A/B Test Results */}
      {campaign.ab_test_enabled && (
        <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-6 dark:border-purple-900/30 dark:bg-purple-900/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-purple-900 dark:text-purple-200">Teste A/B</h2>
            {campaign.status === 'sent' && !campaign.ab_winner && (
              <button
                onClick={handleDecideAB}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Decidir vencedor
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className={`rounded-lg border p-4 ${campaign.ab_winner === 'A' ? 'border-green-300 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'}`}>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Variante A {campaign.ab_winner === 'A' && '(Vencedor)'}</p>
              <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{campaign.subject}</p>
            </div>
            <div className={`rounded-lg border p-4 ${campaign.ab_winner === 'B' ? 'border-green-300 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'}`}>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Variante B {campaign.ab_winner === 'B' && '(Vencedor)'}</p>
              <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{campaign.ab_variant_b_subject || '(mesmo corpo, assunto diferente)'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Preview do email</h2>
        </div>
        <div className="p-6">
          <div className="mx-auto max-w-4xl rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 border-b border-gray-100 pb-4 dark:border-gray-700">
              <p className="text-xs text-gray-400">De: helloustudio</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{campaign.subject}</p>
              {campaign.preview_text && <p className="text-xs text-gray-400">{campaign.preview_text}</p>}
            </div>
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: campaign.body_html }}
            />
            {campaign.cta_text && campaign.cta_url && (
              <div className="mt-4">
                <span
                  className="inline-block rounded-lg px-6 py-3 text-sm font-semibold text-white"
                  style={{ background: campaign.cta_color || '#ec4899' }}
                >
                  {campaign.cta_text}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export */}
      {campaign.status === 'sent' && (
        <div className="flex justify-end">
          <a
            href={`/api/email-marketing/export?campaign=${id}`}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
            download
          >
            Exportar destinatários (CSV)
          </a>
        </div>
      )}
    </div>
  );
}
